import math
W,H=1600,1180
o=[]
def gear(cx,cy,R,n,depth,fill,stroke):
    ri=R-depth; pts=[]
    step=2*math.pi/n
    for k in range(n):
        a=k*step
        for da,r in [(-0.30,ri),(-0.18,R),(0.18,R),(0.30,ri)]:
            t=a+da*step*1.6
            pts.append(f"{cx+r*math.cos(t):.1f},{cy+r*math.sin(t):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{stroke}" stroke-width="3" stroke-linejoin="round" filter="url(#sh)"/>'
def label(cx,cy,r,lines,size,col,bg):
    s=f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{bg}" stroke="#ffffff" stroke-width="5" opacity="0.95"/>'
    y0=cy-(len(lines)-1)*size*0.6+size*0.35
    for i,l in enumerate(lines):
        s+=f'<text x="{cx}" y="{y0+i*size*1.2:.1f}" text-anchor="middle" font-size="{size}" font-weight="700" fill="{col}">{l}</text>'
    return s
o.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, WenQuanYi Zen Hei, sans-serif">')
o.append('<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.18"/></filter>'
 '<marker id="big" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c9c3d6"/></marker>'
 '<marker id="sm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#3a3550"/></marker></defs>')
o.append(f'<rect width="{W}" height="{H}" fill="#fbfaf7"/>')
# header
o.append('<rect x="60" y="40" width="10" height="120" fill="#5a5470"/>')
for i,(t,b) in enumerate([("폭력 행위, 유형, 사례 하나하나에 집중하기보다",""),("젠더기반폭력 유형들을 관통하는 ",""),("근본적, 구조적 원인을 분석하여 ",""),("전체를 통합적으로 바라본다.","")]):
    pass
o.append('<text x="95" y="80" font-size="30" fill="#2b2540">폭력 행위, 유형, 사례 하나하나에 집중하기보다 젠더기반폭력 유형들을 관통하는</text>')
o.append('<text x="95" y="130" font-size="30" fill="#2b2540"><tspan font-weight="700" fill="#7B4FBF">근본적·구조적 원인</tspan>을 분석하여 <tspan font-weight="700" fill="#7B4FBF">전체를 통합적으로</tspan> 바라본다.</text>')
# big cycle arrows
cx,cy,RR=780,660,400
for a0,a1 in [(200,325),(20,145)]:
    p0=(cx+RR*math.cos(math.radians(a0)),cy+RR*math.sin(math.radians(a0)))
    p1=(cx+RR*math.cos(math.radians(a1)),cy+RR*math.sin(math.radians(a1)))
    o.append(f'<path d="M{p0[0]:.1f},{p0[1]:.1f} A{RR},{RR} 0 0 1 {p1[0]:.1f},{p1[1]:.1f}" fill="none" stroke="#c9c3d6" stroke-width="30" marker-end="url(#big)"/>')
G={ "role":(580,500,145,10,"#E8A94F","#c98a2f"),
    "sexism":(960,470,165,12,"#9A86CF","#7a66b0"),
    "power":(880,850,215,14,"#5B8DB8","#3f6f98"),
    "stereo":(425,725,92,8,"#C9738A","#a8566d")}
# annotations (behind gears' labels but drawn first lines)
ann=[("role",(380,580),(560,500),["성역할 규범에서 벗어난","~여성 행동에 대한 처벌"],"end"),
     ("sexism",(1230,430),(985,470),["사회적 낮은 지위","→ 폭력 대응력 약화","남성중심 문화","→ 성적 대상화"],"start"),
     ("power",(1180,960),(905,860),["폭력은 통제와","~지배의 수단"],"start")]
for k,(x,y,R,n,f,s) in G.items():
    o.append(gear(x,y,R,n,R*0.18,f,s))
labels={"role":(["성역할","규범"],34),"sexism":(["성차별","구조"],38),"power":(["젠더","권력관계"],42),"stereo":(["성별","고정관념"],22)}
for k,(x,y,R,n,f,s) in G.items():
    ls,sz=labels[k]; o.append(label(x,y,R*0.58,ls,sz,"#2b2540","#fbfaf7"))
# starburst
sx,sy=770,660; pts=[]
for i in range(32):
    r=135 if i%2==0 else 78; t=math.radians(i*360/32-90+(7 if i%4==0 else 0))
    pts.append(f"{sx+r*math.cos(t):.1f},{sy+r*math.sin(t):.1f}")
o.append(f'<polygon points="{" ".join(pts)}" fill="#B03A2E" stroke="#7d2219" stroke-width="3" filter="url(#sh)"/>')
o.append(f'<text x="{sx}" y="{sy-6}" text-anchor="middle" font-size="34" font-weight="700" fill="#fff">젠더기반</text><text x="{sx}" y="{sy+36}" text-anchor="middle" font-size="34" font-weight="700" fill="#fff">폭력</text>')
for k,(tx,ty),(gx,gy),lines,anc in ann:
    x,y,R=G[k][:3]
    # arrow from gear label edge to text
    dx,dy=tx-x,ty-y; d=math.hypot(dx,dy); r0=R*0.58
    sx0,sy0=x+dx/d*r0,y+dy/d*r0
    ex=tx+(10 if anc=="end" else -12); ey=ty
    o.append(f'<circle cx="{sx0:.1f}" cy="{sy0:.1f}" r="7" fill="#3a3550"/><line x1="{sx0:.1f}" y1="{sy0:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#3a3550" stroke-width="3" marker-end="url(#sm)"/>')
    bx=tx-330 if anc=="end" else tx+8
    h=len(lines)*40+24
    o.append(f'<rect x="{bx-14}" y="{ty-36}" width="{340 if anc=="end" else 330}" height="{h}" rx="14" fill="#ffffff" stroke="#d9d3e6" stroke-width="2"/>')
    for i,l in enumerate(lines):
        cont=l.startswith("~"); l=l.lstrip("~")
        bullet="" if l.startswith("→") else ("   " if cont else "• ")
        o.append(f'<text x="{bx}" y="{ty-2+i*40}" font-size="26" fill="#2b2540" xml:space="preserve" font-weight="{400 if l.startswith("→") else 700}">{bullet}{l}</text>')
o.append(f'<text x="{W/2}" y="{H-28}" text-anchor="middle" font-size="18" fill="#8a8499">성차별 구조·성역할 규범·성별 고정관념·젠더 권력관계가 맞물려 돌아가며 젠더기반폭력을 만들어내고, 폭력은 다시 이 구조를 강화한다.</text>')
o.append('</svg>')
open('/home/user/-/diagrams/gbv-gears.svg','w').write('\n'.join(o))
