/**
 * 일정 참석 회신 — Google Apps Script 웹앱 서버 코드
 *
 * 응답자는 로그인 없이 웹앱 링크로 응답하고, 모든 데이터는 이 스크립트가 연결된
 * 스프레드시트의 '일정', '응답자', '응답' 시트에 저장됩니다.
 * 일정 관리와 결과 집계는 관리자 비밀번호로 보호됩니다.
 */

const SHEETS = {
  events: {
    name: '일정',
    headers: ['ID(자동)', '구분', '명칭', '날짜', '시작', '종료', '장소', '회신기한', '안내사항', '마감(Y=수동마감)', '등록일시(자동)'],
    notes: {
      1: '일정을 저장하면 자동으로 채워집니다. 시트에 직접 입력한 일정도 웹앱을 열 때 자동으로 부여됩니다.',
      8: '응답을 받는 마지막 날짜 (예: 2026-10-30). 다음 날부터 응답이 자동으로 잠깁니다.',
      10: '지금 바로 응답을 닫으려면 Y를 입력합니다. 웹앱의 [회신 마감] 버튼을 누르면 자동으로 입력됩니다.',
      11: '처음 저장된 시각이 자동으로 기록됩니다.',
    },
  },
  people: {
    name: '응답자',
    headers: ['응답자키(자동)', '성명', '소속 부서(학과)', '구분', '보직명', '연락처', '저장일시'],
  },
  answers: {
    name: '응답',
    headers: ['일정ID(자동)', '응답자키(자동)', '일정명', '성명', '소속 부서(학과)', '구분', '보직명', '연락처', '응답', '의견', '회신일시'],
  },
};

const EVENT_TYPES = ['회의', '행사', '출장', '교육'];
const CATEGORIES = ['교원', '직원', '조교', '학생', '외부', '기타'];
const STATUSES = ['참석', '불참'];
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/* ---------- 스프레드시트 메뉴와 초기 설정 ---------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('참석 확인')
    .addItem('초기 설정 (시트 만들기)', 'setup')
    .addItem('관리자 비밀번호 설정', 'setAdminPassword')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  Object.keys(SHEETS).forEach((k) => {
    const def = SHEETS[k];
    const sh = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
    sh.getRange(1, 1, sh.getMaxRows(), def.headers.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    Object.keys(def.notes || {}).forEach((col) => sh.getRange(1, Number(col)).setNote(def.notes[col]));
  });
  // 일정 시트의 구분 칸은 회의/행사/출장 중에서만 고르게 함
  const evSheet = ss.getSheetByName(SHEETS.events.name);
  evSheet.getRange(2, 2, evSheet.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(EVENT_TYPES, true)
      .setAllowInvalid(false)
      .setHelpText('회의, 행사, 출장, 교육 중에서 고르세요.')
      .build());
  const blank = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  const msg = hasPassword_()
    ? '시트를 준비했습니다. 이제 배포 > 새 배포에서 웹앱으로 배포하세요.'
    : '시트를 준비했습니다. 다음으로 [참석 확인 > 관리자 비밀번호 설정]을 실행하세요.';
  SpreadsheetApp.getUi().alert(msg);
}

function setAdminPassword() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('관리자 비밀번호 설정', '일정 관리·결과 집계 화면에 쓸 비밀번호를 입력하세요 (8자 이상).', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const pw = res.getResponseText().trim();
  if (pw.length < 8) {
    ui.alert('비밀번호는 8자 이상이어야 합니다. 다시 실행해 주세요.');
    return;
  }
  const salt = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperties({ ADMIN_SALT: salt, ADMIN_HASH: hash_(salt + pw) });
  ui.alert('관리자 비밀번호를 저장했습니다.');
}

/* ---------- 웹앱 진입점 ---------- */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('일정 참석 회신')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- 응답자용 API (로그인 불필요) ---------- */

function api_getBoard(key) {
  checkKey_(key);
  return { events: readEvents_(), me: readMe_(key), today: today_() };
}

function api_saveProfile(key, profile) {
  checkKey_(key);
  const p = cleanProfile_(profile);
  return withLock_(() => {
    const now = stamp_();
    const people = sheet_(SHEETS.people);
    const row = findRow_(people, SHEETS.people, (r) => r[0] === key);
    writeRow_(people, row || people.getLastRow() + 1, [key, p.name, p.dept, p.category, p.roleTitle, p.phone, now]);

    // 이미 제출한 응답에도 바뀐 인적사항을 반영해 '응답' 시트를 그대로 명부로 쓸 수 있게 함
    const answers = sheet_(SHEETS.answers);
    readRows_(answers, SHEETS.answers).forEach((r, i) => {
      if (r[1] === key) answers.getRange(i + 2, 4, 1, 5).setNumberFormat('@').setValues([[p.name, p.dept, p.category, p.roleTitle, p.phone].map(cell_)]);
    });
    return readMe_(key);
  });
}

function api_submit(key, eventId, status, comment) {
  checkKey_(key);
  if (STATUSES.indexOf(status) < 0) throw new Error('참석 또는 불참을 선택해 주세요.');
  const text = clean_(comment, 500);
  return withLock_(() => {
    const person = findRowData_(SHEETS.people, (r) => r[0] === key);
    if (!person) throw new Error('먼저 인적사항을 저장해 주세요.');
    const ev = readEvents_().filter((e) => e.id === eventId)[0];
    if (!ev) throw new Error('삭제되었거나 없는 일정입니다. 새로 고침해 주세요.');
    if (isClosed_(ev)) throw new Error('회신이 마감된 일정입니다.');

    const answers = sheet_(SHEETS.answers);
    const row = findRow_(answers, SHEETS.answers, (r) => r[0] === eventId && r[1] === key);
    writeRow_(answers, row || answers.getLastRow() + 1,
      [eventId, key, ev.title, person[1], person[2], person[3], person[4], person[5], status, text, stamp_()]);
    return readMe_(key);
  });
}

/* ---------- 관리자 API (비밀번호 필요) ---------- */

function api_adminLogin(pw) {
  checkAdmin_(pw);
  return true;
}

function api_adminData(pw) {
  checkAdmin_(pw);
  const answers = readRows_(sheet_(SHEETS.answers), SHEETS.answers).map((r) => ({
    eventId: r[0], name: r[3], dept: r[4], category: r[5], roleTitle: r[6], phone: r[7],
    status: r[8], comment: r[9], at: r[10],
  }));
  return { events: readEvents_(), answers: answers, today: today_(), sheetUrl: spreadsheet_().getUrl() };
}

function api_adminSaveEvent(pw, input) {
  checkAdmin_(pw);
  const ev = cleanEvent_(input);
  return withLock_(() => {
    const sh = sheet_(SHEETS.events);
    if (input && input.id) {
      const row = findRow_(sh, SHEETS.events, (r) => r[0] === input.id);
      if (!row) throw new Error('수정할 일정을 찾지 못했습니다. 새로 고침해 주세요.');
      const cur = sh.getRange(row, 1, 1, SHEETS.events.headers.length).getDisplayValues()[0];
      writeRow_(sh, row, [cur[0], ev.type, ev.title, ev.date, ev.start, ev.end, ev.place, ev.deadline, ev.note, isYes_(cur[9]) ? 'Y' : '', cur[10] || stamp_()]);
    } else {
      writeRow_(sh, sh.getLastRow() + 1, [Utilities.getUuid(), ev.type, ev.title, ev.date, ev.start, ev.end, ev.place, ev.deadline, ev.note, '', stamp_()]);
    }
    return api_adminData(pw);
  });
}

function api_adminToggleClose(pw, id) {
  checkAdmin_(pw);
  return withLock_(() => {
    const sh = sheet_(SHEETS.events);
    const row = findRow_(sh, SHEETS.events, (r) => r[0] === id);
    if (!row) throw new Error('일정을 찾지 못했습니다.');
    const cell = sh.getRange(row, 10);
    cell.setNumberFormat('@').setValue(isYes_(cell.getDisplayValue()) ? '' : 'Y');
    return api_adminData(pw);
  });
}

function api_adminDeleteEvent(pw, id) {
  checkAdmin_(pw);
  return withLock_(() => {
    const sh = sheet_(SHEETS.events);
    const row = findRow_(sh, SHEETS.events, (r) => r[0] === id);
    if (row) sh.deleteRow(row);
    // '응답' 시트의 기존 회신은 기록으로 남김 (일정명 열로 식별 가능)
    return api_adminData(pw);
  });
}

/* ---------- 내부 도우미 ---------- */

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('스프레드시트가 연결되지 않았습니다. 관리자에게 [초기 설정] 실행을 요청해 주세요.');
  return ss;
}

function sheet_(def) {
  const sh = spreadsheet_().getSheetByName(def.name);
  if (!sh) throw new Error('"' + def.name + '" 시트가 없습니다. 관리자에게 [초기 설정] 실행을 요청해 주세요.');
  return sh;
}

function readRows_(sh, def) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, def.headers.length).getDisplayValues();
}

function findRow_(sh, def, pred) {
  const rows = readRows_(sh, def);
  for (let i = 0; i < rows.length; i++) if (pred(rows[i])) return i + 2;
  return 0;
}

function findRowData_(def, pred) {
  return readRows_(sheet_(def), def).filter(pred)[0] || null;
}

function writeRow_(sh, row, values) {
  sh.getRange(row, 1, 1, values.length).setNumberFormat('@').setValues([values.map(cell_)]);
}

function readEvents_() {
  assignMissingIds_();
  return readRows_(sheet_(SHEETS.events), SHEETS.events)
    .filter((r) => r[0])
    .map(eventFromRow_)
    .filter((ev) => ev.title && ev.date)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

// 시트에 직접 입력한 값(2026. 11. 5 / 오후 2:00 등)도 앱 형식으로 맞춰 읽음
function eventFromRow_(r) {
  let deadline = normDate_(r[7]);
  const closedAsDate = normDate_(r[9]);
  if (!deadline && closedAsDate) deadline = closedAsDate; // 마감 칸에 날짜를 적은 경우 회신기한으로 봄
  return {
    id: r[0], type: String(r[1]).trim(), title: String(r[2]).trim(), date: normDate_(r[3]),
    start: normTime_(r[4]), end: normTime_(r[5]), place: String(r[6]).trim(), deadline: deadline,
    note: r[8], closed: isYes_(r[9]), createdAt: r[10],
  };
}

// 명칭과 날짜는 있는데 ID가 빈 행(시트에 직접 입력한 일정)에 ID와 등록일시를 채움
function assignMissingIds_() {
  const def = SHEETS.events;
  const needsId = (r) => !r[0] && String(r[2]).trim() && normDate_(r[3]);
  if (!readRows_(sheet_(def), def).some(needsId)) return;
  withLock_(() => {
    const sh = sheet_(def);
    readRows_(sh, def).forEach((r, i) => {
      if (!needsId(r)) return;
      sh.getRange(i + 2, 1).setNumberFormat('@').setValue(Utilities.getUuid());
      if (!r[10]) sh.getRange(i + 2, 11).setNumberFormat('@').setValue(stamp_());
    });
  });
}

function normDate_(v) {
  const m = String(v == null ? '' : v).trim().match(/^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
  return m ? m[1] + '-' + pad2_(m[2]) + '-' + pad2_(m[3]) : '';
}

function normTime_(v) {
  const s = String(v == null ? '' : v).trim();
  const m = s.match(/(\d{1,2})\s*(?::|시)\s*(\d{1,2})?/);
  if (!m) return '';
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (/오후|pm/i.test(s) && h < 12) h += 12;
  if (/오전|am/i.test(s) && h === 12) h = 0;
  return h > 23 || min > 59 ? '' : pad2_(h) + ':' + pad2_(min);
}

function pad2_(n) {
  return String(n).padStart(2, '0');
}

function isYes_(v) {
  return /^(y|yes|o|예|마감|true|v|✓)$/i.test(String(v == null ? '' : v).trim());
}

function readMe_(key) {
  const p = findRowData_(SHEETS.people, (r) => r[0] === key);
  const answers = {};
  readRows_(sheet_(SHEETS.answers), SHEETS.answers).forEach((r) => {
    if (r[1] === key) answers[r[0]] = { status: r[8], comment: r[9], at: r[10] };
  });
  return {
    profile: p ? { name: p[1], dept: p[2], category: p[3], roleTitle: p[4], phone: p[5], updatedAt: p[6] } : null,
    answers: answers,
  };
}

function cleanProfile_(p) {
  p = p || {};
  const out = {
    name: clean_(p.name, 30), dept: clean_(p.dept, 40), category: clean_(p.category, 10),
    roleTitle: clean_(p.roleTitle, 40), phone: clean_(p.phone, 20),
  };
  if (!out.name || !out.dept) throw new Error('성명과 소속 부서(학과)를 입력해 주세요.');
  if (CATEGORIES.indexOf(out.category) < 0) throw new Error('구분을 선택해 주세요.');
  return out;
}

function cleanEvent_(e) {
  e = e || {};
  const ev = {
    type: clean_(e.type, 10), title: clean_(e.title, 80), date: clean_(e.date, 10),
    start: clean_(e.start, 5), end: clean_(e.end, 5), place: clean_(e.place, 80),
    deadline: clean_(e.deadline, 10), note: clean_(e.note, 500),
  };
  if (EVENT_TYPES.indexOf(ev.type) < 0) throw new Error('구분을 선택해 주세요.');
  if (!ev.title || !ev.place) throw new Error('명칭과 장소를 입력해 주세요.');
  if (!DATE_PATTERN.test(ev.date) || !TIME_PATTERN.test(ev.start)) throw new Error('날짜와 시작 시간을 입력해 주세요.');
  if (ev.end && !TIME_PATTERN.test(ev.end)) throw new Error('종료 시간 형식이 올바르지 않습니다.');
  if (ev.end && ev.end < ev.start) throw new Error('종료 시간이 시작 시간보다 빠릅니다.');
  if (ev.deadline && !DATE_PATTERN.test(ev.deadline)) throw new Error('회신 기한 형식이 올바르지 않습니다.');
  return ev;
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

// 스프레드시트에서 수식으로 실행되지 않도록 =, +, -, @ 로 시작하는 값은 문자로 고정
function cell_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function checkKey_(key) {
  if (!KEY_PATTERN.test(String(key || ''))) throw new Error('응답자 식별값이 올바르지 않습니다. 페이지를 새로 고침해 주세요.');
}

function hasPassword_() {
  return !!PropertiesService.getScriptProperties().getProperty('ADMIN_HASH');
}

function checkAdmin_(pw) {
  const props = PropertiesService.getScriptProperties();
  const hash = props.getProperty('ADMIN_HASH');
  if (!hash) throw new Error('관리자 비밀번호가 아직 설정되지 않았습니다. 스프레드시트의 [참석 확인 > 관리자 비밀번호 설정]을 먼저 실행하세요.');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('admin_fail') || 0);
  if (fails >= 10) throw new Error('비밀번호 오류가 반복되어 10분간 관리자 로그인이 제한됩니다.');
  if (hash_(props.getProperty('ADMIN_SALT') + String(pw || '')) !== hash) {
    cache.put('admin_fail', String(fails + 1), 600);
    Utilities.sleep(800);
    throw new Error('관리자 비밀번호가 맞지 않습니다.');
  }
}

function hash_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}

let lockHeld_ = false;

function withLock_(fn) {
  if (lockHeld_) return fn(); // 이미 잠금을 잡은 호출 안에서 다시 부르는 경우
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('동시에 접속한 사람이 많습니다. 잠시 후 다시 시도해 주세요.');
  lockHeld_ = true;
  try {
    return fn();
  } finally {
    lockHeld_ = false;
    lock.releaseLock();
  }
}

function isClosed_(ev) {
  return ev.closed || (ev.deadline && ev.deadline < today_());
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function stamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}
