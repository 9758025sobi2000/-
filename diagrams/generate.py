import math
W,H=1400,1500; cx,cy=700,800; R=440
nodes=[
 ("성역할 규범과","성별 고정관념",["'남성다움/여성다움'의 고정된 기대","주도·공격성 vs 순종·돌봄 역할 부여"],"#7B4FBF"),
 ("성별 권력관계","(불평등한 위계)",["자원·지위·의사결정권의 불균형","통제와 지배를 '당연한 것'으로 인식"],"#B5468F"),
 ("왜곡된 성문화","",["성적 대상화·성 상품화","강간 통념, 남성 연대·침묵의 문화"],"#D9534F"),
 ("폭력의 용인·묵인","",["피해자 비난, 2차 피해","가해의 축소·사소화, 낮은 처벌"],"#E07B2E"),
 ("젠더기반폭력","발생",["성폭력·가정폭력·교제폭력","스토킹·디지털 성범죄 등"],"#C0392B"),
 ("성차별 구조의","재생산·강화",["피해자의 위축·침묵, 참여 제한","기존 규범과 권력 구조의 고착화"],"#4A6FB5"),
]
n=len(nodes); bw,bh=390,176
o=[]
o.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, WenQuanYi Zen Hei, sans-serif">')
o.append('<defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#5a5470"/></marker>'
 '<filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.15"/></filter>'
 '<radialGradient id="cg"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#f1ecf8"/></radialGradient></defs>')
o.append(f'<rect width="{W}" height="{H}" fill="#fbfaf7"/>')
o.append(f'<text x="{W/2}" y="92" text-anchor="middle" font-size="46" font-weight="700" fill="#2b2540">젠더기반폭력을 만드는 성차별적 구조의 고리</text>')
o.append(f'<text x="{W/2}" y="140" text-anchor="middle" font-size="24" fill="#6b6580">각 요소가 서로를 만들고 강화하는 순환 구조 — 시작도 끝도 없다</text>')
# ring
o.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="#d9d3e6" stroke-width="34"/>')
ang=[-90+360*i/n for i in range(n)]
for i in range(n):
    a0=math.radians(ang[i]+5); a1=math.radians(ang[i]+55)
    x0,y0=cx+R*math.cos(a0),cy+R*math.sin(a0); x1,y1=cx+R*math.cos(a1),cy+R*math.sin(a1)
    o.append(f'<path d="M{x0:.1f},{y0:.1f} A{R},{R} 0 0 1 {x1:.1f},{y1:.1f}" fill="none" stroke="#5a5470" stroke-width="12"/>')
    m=ang[i]+30; mr=math.radians(m); mx,my=cx+R*math.cos(mr),cy+R*math.sin(mr)
    t=math.radians(m+90); c_,s_=math.cos(t),math.sin(t)
    pts=" ".join(f"{mx+px*c_-py*s_:.1f},{my+px*s_+py*c_:.1f}" for px,py in [(-11,-10),(17,0),(-11,10),(-5,0)])
    o.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="30" fill="#fbfaf7" stroke="#5a5470" stroke-width="4"/><polygon points="{pts}" fill="#5a5470"/>')
# center
o.append(f'<circle cx="{cx}" cy="{cy}" r="190" fill="url(#cg)" stroke="#b9aed3" stroke-width="3" stroke-dasharray="8 8"/>')
for k,(t,s,w,c) in enumerate([("성차별적 구조",40,700,"#2b2540"),("개인의 일탈이 아닌",24,400,"#555"),("사회 구조의 문제",24,400,"#555"),("↻ 끊임없이 순환",26,700,"#7B4FBF")]):
    y=[cy-40,cy+8,cy+42,cy+92][k]
    o.append(f'<text x="{cx}" y="{y}" text-anchor="middle" font-size="{s}" font-weight="{w}" fill="{c}">{t}</text>')
for i,(t1,t2,d,col) in enumerate(nodes):
    a=math.radians(ang[i]); x=cx+R*math.cos(a); y=cy+R*math.sin(a)
    X,Y=x-bw/2,y-bh/2
    o.append(f'<g filter="url(#sh)"><rect x="{X:.1f}" y="{Y:.1f}" width="{bw}" height="{bh}" rx="22" fill="#fff" stroke="{col}" stroke-width="4"/></g>')
    o.append(f'<rect x="{X:.1f}" y="{Y:.1f}" width="{bw}" height="80" rx="22" fill="{col}"/><rect x="{X:.1f}" y="{Y+58:.1f}" width="{bw}" height="22" fill="{col}"/>')
    if t2:
        o.append(f'<text x="{x:.1f}" y="{Y+35:.1f}" text-anchor="middle" font-size="27" font-weight="700" fill="#fff">{t1}</text>')
        o.append(f'<text x="{x:.1f}" y="{Y+68:.1f}" text-anchor="middle" font-size="27" font-weight="700" fill="#fff">{t2}</text>')
    else:
        o.append(f'<text x="{x:.1f}" y="{Y+52:.1f}" text-anchor="middle" font-size="29" font-weight="700" fill="#fff">{t1}</text>')
    for j,l in enumerate(d):
        o.append(f'<text x="{x:.1f}" y="{Y+115+j*36:.1f}" text-anchor="middle" font-size="20" fill="#3a3550">· {l}</text>')
o.append(f'<text x="{W/2}" y="{H-62}" text-anchor="middle" font-size="19" fill="#8a8499">근거: UN 「여성폭력철폐선언」(1993) — 여성폭력은 남녀 간 역사적으로 불평등한 권력관계의 표현 / CEDAW 일반권고 제35호(2017)</text>')
o.append(f'<text x="{W/2}" y="{H-32}" text-anchor="middle" font-size="19" fill="#8a8499">— 젠더기반폭력은 성 고정관념·남성 특권 이데올로기·사회 규범 등 성별 관련 요인에 뿌리를 두며 이를 유지시키는 수단으로 작동</text>')
o.append('</svg>')
open('/home/user/-/diagrams/gbv-cycle.svg','w').write('\n'.join(o))
