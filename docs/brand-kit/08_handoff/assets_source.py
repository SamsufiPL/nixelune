from pathlib import Path
import math, json, html, random
import cairosvg

ROOT=Path(__file__).resolve().parents[1]
COLORS={
  'ink':'#0E1522','night':'#111D2C','panel':'#172434','panel2':'#1C2C3E',
  'slate':'#304356','outline':'#3A5063','text':'#F2EFE8','muted':'#A8B3BF',
  'brass':'#D7AA75','teal':'#64D3C1','coral':'#F18479','ice':'#8DBEF1',
  'lilac':'#B5A7E4','amber':'#F0BD75','focus':'#F9D99D'
}
C=COLORS


def txt(x,y,t,size=26,color='text',weight=400,anchor=None,spacing=0,op=None,font='Inter'):
    attrs=f'x="{x}" y="{y}" font-family="{font}, Arial, sans-serif" font-size="{size}" fill="{C.get(color,color)}" font-weight="{weight}" letter-spacing="{spacing}"'
    if anchor: attrs+=f' text-anchor="{anchor}"'
    if op is not None: attrs+=f' opacity="{op}"'
    return f'<text {attrs}>{html.escape(str(t))}</text>'

def rect(x,y,w,h,fill,rx=0,stroke=None,sw=1,op=None):
    f=C.get(fill,fill); s=f' stroke="{C.get(stroke,stroke)}" stroke-width="{sw}"' if stroke else ''
    o=f' opacity="{op}"' if op else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{f}"{s}{o}/>'

def line(x1,y1,x2,y2,color,sw=1,op=1):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{C.get(color,color)}" stroke-width="{sw}" opacity="{op}"/>'

def circle(x,y,r,fill,stroke=None,sw=1,op=None):
    s=f' stroke="{C.get(stroke,stroke)}" stroke-width="{sw}"' if stroke else ''
    o=f' opacity="{op}"' if op is not None else ''
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{C.get(fill,fill)}"{s}{o}/>'

def hexpoly(cx,cy,r,fill,stroke=None,sw=2,op=None,rotate=30):
    pts=' '.join(f'{cx+r*math.cos(math.radians(rotate+60*i)):.2f},{cy+r*math.sin(math.radians(rotate+60*i)):.2f}' for i in range(6))
    attrs=f' fill="{C.get(fill,fill)}"'
    if stroke: attrs+=f' stroke="{C.get(stroke,stroke)}" stroke-width="{sw}"'
    if op is not None: attrs+=f' opacity="{op}"'
    return f'<polygon points="{pts}"{attrs}/>'

DEFS='''<defs>
<radialGradient id="bg" cx="65%" cy="25%" r="83%"><stop stop-color="#203650" offset="0"/><stop stop-color="#0E1522" offset="0.63"/><stop stop-color="#080E17" offset="1"/></radialGradient>
<radialGradient id="moon"><stop stop-color="#D7AA75" stop-opacity=".22"/><stop offset=".55" stop-color="#D7AA75" stop-opacity=".07"/><stop offset="1" stop-color="#D7AA75" stop-opacity="0"/></radialGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#182B40"/><stop offset="1" stop-color="#0B1420"/></linearGradient>
<linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFFFFF" stop-opacity=".24"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity=".03"/><stop offset="1" stop-color="#000000" stop-opacity=".25"/></linearGradient>
<filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="slightGlow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="4"/></filter>
</defs>'''

def svg_start(w,h): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{DEFS}'

def ambience(w,h,variant='game'):
    a=[rect(0,0,w,h,'url(#bg)')]
    rng=random.Random(27)
    for i in range(75):
        x=rng.randrange(w); y=rng.randrange(int(h*.8)); rr=rng.choice([.8,1,1.25,1.6])
        a.append(circle(x,y,rr,'text',op=rng.uniform(.08,.35)))
    cx=w*.78 if variant=='game' else w*.52
    cy=h*.2 if variant=='game' else h*.35
    rr=min(w,h)*(.32 if variant=='game' else .50)
    a.append(circle(cx,cy,rr*1.5,'url(#moon)'))
    a.append(circle(cx,cy,rr,'none','brass',2,op=.16))
    a.append(circle(cx,cy,rr*.87,'none','brass',1,op=.14))
    # horizon and water - intentionally understated
    yy=h*.81
    a.append(f'<path d="M0 {yy:.0f} L{w*.14:.0f} {yy-35:.0f} L{w*.33:.0f} {yy-12:.0f} L{w*.52:.0f} {yy-48:.0f} L{w*.74:.0f} {yy-8:.0f} L{w} {yy-28:.0f} L{w} {h} L0 {h}Z" fill="#0B1622" opacity=".65"/>')
    a.append(rect(0,yy,w,h-yy,'url(#sea)',op=.55))
    for k in range(20):
        y=yy+10+k*16
        x=rng.randrange(0,w-100)
        a.append(line(x,y,x+rng.randrange(60,200),y,'brass',rng.choice([1,2]),op=.06+.08*rng.random()))
    return ''.join(a)

def glyph(x,y,s=50,color='brass',version='normal'):
    # original 'split current' insignia - three nodes connected by a luminous circuit inside a partial orbit
    scale=s/100
    st=f'<g transform="translate({x-s/2},{y-s/2}) scale({scale})">'
    if version=='mono': color='text'
    st+='<path d="M19 69 A37 37 0 1 1 71 16" stroke="'+C.get(color,color)+'" fill="none" stroke-width="3.1" stroke-linecap="round" opacity=".68"/>'
    st+='<path d="M21 74 L39 29 L63 64 L79 27" stroke="'+C.get(color,color)+'" fill="none" stroke-width="4.8" stroke-linejoin="round" stroke-linecap="round"/>'
    for px,py,cl in [(21,74,'teal'),(39,29,'brass'),(63,64,'coral'),(79,27,'brass')]:
        co='text' if version=='mono' else cl
        st+=circle(px,py,5.4,co)
    st+='</g>'
    return st

def chip(x,y,w,h,label,color='brass'):
    return rect(x,y,w,h,'panel',14,'outline',1,op=.85)+txt(x+16,y+30,label,16,color,500,spacing=2)

def board(x,y,w,h,R,rows,cols,scale=1,frame=True):
    a=[]
    if frame:
        a.append(rect(x-8,y-8,w+16,h+16,'#101A29',28,'outline',2))
        a.append(rect(x,y,w,h,'#0B1421',22,'brass',1,op=.95))
        a.append(line(x+22,y+20,x+w-22,y+20,'brass',1,op=.4))
    sx=math.sqrt(3)*R+1
    sy=1.5*R+1
    marginX=(w-((cols-1)*sx+sx*.5+math.sqrt(3)*R))/2 +math.sqrt(3)*R/2
    marginY=(h-((rows-1)*sy+2*R))/2 +R
    def cc(c,r): return (x+marginX+c*sx+(r%2)*(sx/2), y+marginY+r*sy)
    for r in range(rows):
        for c in range(cols):
            hx,hy=cc(c,r)
            a.append(hexpoly(hx,hy,R*.96,'#172535','#304356',.95,op=.72,rotate=30))
    pal=['teal','coral','ice','lilac','amber']
    # curated layout, gaps, colored paths - not flat horizontal stacking
    levels=[
      (rows-5,[(0,'ice'),(6,'lilac')]),
      (rows-4,[(0,'teal'),(1,'ice'),(5,'amber'),(6,'coral'),(7,'lilac')]),
      (rows-3,[(0,'teal'),(1,'coral'),(3,'ice'),(4,'teal'),(5,'amber'),(7,'teal')]),
      (rows-2,[(0,'coral'),(2,'amber'),(3,'teal'),(4,'teal'),(5,'amber'),(6,'lilac'),(7,'ice')]),
      (rows-1,[(0,'coral'),(1,'lilac'),(2,'teal'),(3,'teal'),(4,'lilac'),(5,'ice'),(6,'coral'),(7,'ice')]),
    ]
    cellmap={}
    for r,entries in levels:
        if r<0: continue
        for c,co in entries: cellmap[(c,r)]=co
    for (c,r),co in cellmap.items():
        hx,hy=cc(c,r)
        a.append(circle(hx,hy,R*.75,co,op=.18))
        a.append(hexpoly(hx,hy,R*.87,co,co,1.5,op=.85))
        a.append(hexpoly(hx,hy,R*.82,'url(#tile)',None,0,op=.7))
        a.append(hexpoly(hx,hy,R*.52,'none','text',1,op=.09))
    # illuminated pathways make the objective visible
    paths=[(0,rows-4),(0,rows-3),(1,rows-3),(2,rows-1),(3,rows-1),(3,rows-2),(4,rows-2)]
    pts=[cc(c,r) for c,r in paths if (c,r) in cellmap]
    if len(pts)>1:
        a.append(f'<polyline points="{" ".join(f"{xx:.1f},{yy:.1f}" for xx,yy in pts)}" stroke="{C["teal"]}" stroke-width="{max(2,R*.11):.1f}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".72"/>')
        for xx,yy in pts: a.append(circle(xx,yy,max(3,R*.1),'text',op=.85))
    # ghost projection
    ghosts=[(2,rows-6),(3,rows-5),(3,rows-4)]
    for c,r in ghosts:
        if 0<=r<rows:
            hx,hy=cc(c,r)
            a.append(hexpoly(hx,hy,R*.82,'none','brass',1.8,op=.48))
    # curved, off-grid tetromino-free falling cluster
    falling=[(3,3),(4,4),(4,5),(5,5)]
    for c,r in falling:
        if 0<=r<rows:
            hx,hy=cc(c,r)
            a.append(circle(hx,hy,R*.98,'coral',op=.16))
            a.append(hexpoly(hx,hy,R*.86,'coral','text',1.4,op=.94))
            a.append(hexpoly(hx,hy,R*.63,'url(#tile)',None,0,op=.55))
    return ''.join(a),cc

def header(w,title_y=90,scale=1,variant='desktop'):
    x=70 if variant=='desktop' else w/2
    fs=56 if variant=='desktop' else 72
    if variant=='desktop':
        return glyph(x+30,title_y-24,62)+txt(x+82,title_y-6,'NIXELUNE',fs,'text',450,spacing=7)+txt(x+85,title_y+21,'THE LUMINOUS PUZZLE',13,'brass',600,spacing=4)
    return glyph(w/2,title_y-22,76)+txt(w/2,title_y+101,'NIXELUNE',fs,'text',400,anchor='middle',spacing=8)

def desktop():
    w,h=1600,900
    a=[svg_start(w,h),ambience(w,h),'',header(w,98)]
    a += [line(82,150,1517,150,'outline',1),txt(1450,112,'THE CONDUIT / 04',17,'muted',500,anchor='end',spacing=3),circle(1497,102,7,'teal')]
    # left editorial typography, not dashboard cards
    a += [txt(96,248,'TWÓJ WYNIK',15,'muted',550,spacing=3),txt(92,313,'028 460',60,'text',350,spacing=2),
          line(96,340,450,340,'outline',1.5),txt(96,382,'ŁAŃCUCH',16,'muted',500,spacing=3),
          txt(96,443,'× 06',53,'teal',350),txt(96,513,'ETAP 04',20,'brass',500,spacing=3),
          txt(96,608,'CEL ETAPU',15,'muted',500,spacing=3),txt(96,651,'Połącz trzy',31,'text',400),
          txt(96,689,'świetlne ścieżki',31,'text',400),
          txt(96,749,'02 / 03 UKOŃCZONE',15,'teal',500,spacing=2)]
    b,cc=board(517,170,550,660,28.8,13,8)
    a.append(b)
    a += [txt(1150,233,'NASTĘPNY UKŁAD',15,'muted',500,spacing=2),rect(1146,258,320,160,'panel',14,'outline',1.2),
          txt(1150,481,'ZACHOWANY',15,'muted',500,spacing=2),rect(1146,502,320,160,'panel',14,'outline',1.2)]
    for center,color in [( (1300,340),'ice'),((1300,580),'amber')]:
        cx,cy=center
        for i,j in [(0,0),(1,0),(1,1),(2,1)]:
            px=cx+(i-1)*42+(j%2)*21; py=cy+(j-.5)*37
            a.append(hexpoly(px,py,23,color,color,1.3))
            a.append(hexpoly(px,py,17,'url(#tile)',None,1,op=.64))
    a += [txt(1150,738,'STEROWANIE',15,'muted',500,spacing=2),
          txt(1150,776,'← / → przesuń',19,'text',400),txt(1150,811,'↑ obróć  ·  spacja: upuść',17,'muted',400),
          line(80,858,1520,858,'outline',1,op=.66),txt(94,884,'NIXELUNE  /  DESIGN CONCEPT 01',12,'muted',500,spacing=2),
          txt(1503,884,'DESKTOP • 1600 × 900',12,'muted',500,anchor='end',spacing=2),'</svg>']
    return ''.join(a)

def mobile(mode='game'):
    w,h=900,1600
    a=[svg_start(w,h),ambience(w,h,variant='mobile')]
    a += [glyph(450,68,68),txt(450,158,'NIXELUNE',69,'text',400,anchor='middle',spacing=8),line(115,185,785,185,'outline',2,op=.7)]
    if mode=='menu':
        a += [txt(450,282,'Połącz światło.',43,'text',400,anchor='middle'),txt(450,337,'Zmień układ świata.',30,'muted',350,anchor='middle')]
        # celestial symbol made of linked arcs and cells
        a.append(circle(450,718,268,'url(#moon)'))
        a.append(circle(450,706,232,'none','brass',2,op=.38))
        for c,r,col in [(-1,-1,'teal'),(0,0,'ice'),(1,-1,'coral'),(2,0,'amber'),(0,1,'lilac'),(-1,2,'teal')]:
            a.append(hexpoly(450+c*96+(r%2)*48,695+r*72,54,col,col,2,op=.94))
            a.append(hexpoly(450+c*96+(r%2)*48,695+r*72,39,'url(#tile)',op=.55))
        a += [rect(188,1092,524,96,'brass',30),txt(450,1153,'GRAJ',35,'ink',700,anchor='middle',spacing=5),
              rect(188,1214,524,89,'panel',30,'outline',2),txt(450,1272,'WYZWANIA',26,'text',500,anchor='middle',spacing=4),
              txt(450,1398,'USTAWIENIA',25,'muted',500,anchor='middle',spacing=4),txt(450,1518,'CONCEPT / MOBILE',16,'muted',500,anchor='middle',spacing=3)]
    else:
        a += [txt(116,247,'WYNIK',17,'muted',500,spacing=3),txt(115,307,'028 460',49,'text',350),
              txt(504,247,'ETAP',17,'muted',500,spacing=3),txt(501,305,'04',48,'brass',400),
              txt(684,247,'ŁAŃCUCH',17,'muted',500,spacing=3),txt(686,303,'×06',43,'teal',400)]
        b,cc=board(152,350,596,900,30.4,15,8)
        a.append(b)
        # lower HUD aligned to thumb zone
        a += [rect(152,1280,596,61,'panel',16,'outline',1.3),txt(450,1318,'MISJA 02/03  ·  POŁĄCZ ŚCIEŻKI',19,'teal',500,anchor='middle',spacing=1),
              circle(256,1442,66,'panel','brass',2),circle(450,1442,80,'brass',op=.94),circle(647,1442,66,'panel','brass',2),
              txt(256,1454,'↻',56,'text',400,anchor='middle'),txt(450,1460,'↓',62,'ink',650,anchor='middle'),txt(647,1452,'⇄',51,'text',400,anchor='middle'),
              txt(256,1536,'OBRÓĆ',19,'muted',500,anchor='middle',spacing=2),
              txt(450,1557,'UPUŚĆ',20,'text',600,anchor='middle',spacing=2),
              txt(647,1536,'ZAMIANA',19,'muted',500,anchor='middle',spacing=2)]
        if mode=='results':
            a += [rect(115,515,670,635,'#0D1726',28,'brass',2,op=.98),
                  glyph(450,621,112),txt(450,735,'ŚCIEŻKA',58,'text',400,anchor='middle',spacing=5),
                  txt(450,802,'DOMKNIĘTA',58,'brass',400,anchor='middle',spacing=5),
                  txt(450,881,'+ 2 400 PUNKTÓW',27,'teal',500,anchor='middle',spacing=3),
                  rect(215,957,470,95,'brass',28),txt(450,1021,'DALEJ',31,'ink',700,anchor='middle',spacing=4)]
    a.append('</svg>'); return ''.join(a)

def logo_horizontal():
    w,h=1420,420
    a=[svg_start(w,h),rect(0,0,w,h,'ink'),glyph(209,216,190),txt(367,246,'NIXELUNE',128,'text',380,spacing=12),
    txt(380,304,'POŁĄCZ ŚWIATŁO. ZMIEŃ UKŁAD.',23,'brass',500,spacing=5),'</svg>']
    return ''.join(a)

def logo_vertical():
    w,h=850,850
    a=[svg_start(w,h),rect(0,0,w,h,'ink'),glyph(425,270,310),txt(425,587,'NIXELUNE',89,'text',400,anchor='middle',spacing=8),
       txt(425,646,'POŁĄCZ ŚWIATŁO.',21,'brass',500,anchor='middle',spacing=5),'</svg>']
    return ''.join(a)

def icon_app():
    w=h=1024
    a=[svg_start(w,h),rect(0,0,w,h,'ink',210),circle(512,490,395,'url(#moon)'),
       circle(512,480,357,'none','brass',6,op=.28),glyph(512,508,680),'</svg>']
    return ''.join(a)

def logo_mono():
    w=h=512
    return svg_start(w,h)+rect(0,0,w,h,'ink')+glyph(256,256,370,version='mono')+'</svg>'

def palette_art():
    w,h=1500,740
    a=[svg_start(w,h),rect(0,0,w,h,'ink'),txt(78,92,'COLOR SYSTEM',58,'text',400,spacing=4),txt(80,133,'Quiet atmosphere. Luminous feedback.',23,'muted')]
    clist=[('Night / background','ink'),('Surface / cards','panel'),('Mineral / line','slate'),('Moon / accents','brass'),('Connection / success','teal'),('Motion / active','coral'),('Preview / neutral','ice'),('Rare / power','lilac')]
    for k,(label,key) in enumerate(clist):
        row=k//4; col=k%4; x=74+col*360; y=186+row*260
        a.extend([rect(x,y,316,140,key,20,'#536679',1),txt(x+3,y+183,label,19,'text'),txt(x+3,y+216,C[key],18,'muted',500,spacing=1)])
    a.append('</svg>');return ''.join(a)

def kit_art():
    w,h=1600,950
    a=[svg_start(w,h),rect(0,0,w,h,'ink'),txt(75,92,'NIXELUNE / INTERFACE KIT',49,'text',400,spacing=3),txt(77,128,'Atoms, feedback and navigation hierarchy',21,'muted'),line(78,154,1516,154,'outline',1)]
    a += [txt(86,224,'01   TILES',22,'brass',600,spacing=3)]
    for i,cl in enumerate(['teal','coral','ice','lilac','amber']):
        cx=175+i*125
        a += [hexpoly(cx,332,53,cl,cl,2),hexpoly(cx,332,37,'url(#tile)',op=.7),txt(cx,424,cl.upper(),18,'muted',500,anchor='middle',spacing=1)]
    a += [txt(90,523,'02   STATES',22,'brass',600,spacing=3)]
    for i,(name,col) in enumerate([('EMPTY','slate'),('PREVIEW','ice'),('LOCKED','teal'),('CHARGED','amber')]):
        x=170+i*158
        a.append(hexpoly(x,621,50,'#182636','outline',2))
        if name!='EMPTY':
            a.append(hexpoly(x,621,38,col,col,2,op=.45 if name=='PREVIEW' else .92))
        if name=='CHARGED': a.append(circle(x,621,12,'text'))
        a.append(txt(x,705,name,16,'muted',500,anchor='middle',spacing=1))
    a += [line(840,190,840,876,'outline',1),txt(917,224,'03   ACTIONS',22,'brass',600,spacing=3)]
    for i,(title,col) in enumerate([('GRAJ','brass'),('DALEJ','teal'),('USTAWIENIA','panel')]):
        x=936; y=288+i*104; a += [rect(x,y,512,72,col,18,'outline',1),txt(x+256,y+47,title,25,'ink' if col!='panel' else 'text',650,anchor='middle',spacing=3)]
    a += [txt(920,680,'04   SPACING',22,'brass',600,spacing=3),txt(920,739,'8 / 16 / 24 / 32 / 48',29,'text',450),txt(920,786,'Dotyk minimum 44 × 44 px',20,'muted'),txt(920,830,'Ruch 120–260 ms, bez migania',20,'muted'),'</svg>']
    return ''.join(a)

def make_svg(rel,svg,raster=True):
    path=ROOT/rel
    path.write_text(svg,encoding='utf-8')
    if raster:
        png=path.with_suffix('.png')
        cairosvg.svg2png(bytestring=svg.encode('utf-8'),write_to=str(png),output_width=None,output_height=None)
    return path

make_svg('02_visuals/01_desktop_gameplay.svg',desktop())
make_svg('02_visuals/02_mobile_gameplay.svg',mobile())
make_svg('02_visuals/03_mobile_menu.svg',mobile('menu'))
make_svg('02_visuals/04_mobile_results.svg',mobile('results'))
make_svg('02_visuals/05_ui_components.svg',kit_art())
make_svg('03_logo/NIXELUNE_logo_horizontal_dark.svg',logo_horizontal())
make_svg('03_logo/NIXELUNE_logo_stacked_dark.svg',logo_vertical())
make_svg('03_logo/NIXELUNE_icon_app.svg',icon_app())
make_svg('03_logo/NIXELUNE_symbol_monochrome.svg',logo_mono())
make_svg('04_design_system/palette_swatches.svg',palette_art())
(ROOT/'04_design_system/colors.json').write_text(json.dumps(C,indent=2,ensure_ascii=False),encoding='utf-8')
print('SVG/PNG generated',len(list(ROOT.rglob('*.svg'))),len(list(ROOT.rglob('*.png'))))
