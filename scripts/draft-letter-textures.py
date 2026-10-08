"""Render two precise concept sheets for the letter archive surface treatment."""

from pathlib import Path
from random import Random
from math import sin
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "design-drafts"
OUT.mkdir(exist_ok=True)
MONO = "/System/Library/Fonts/Menlo.ttc"
SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT = lambda size, serif=False: ImageFont.truetype(SERIF if serif else MONO, size)
TITLES = ["CHRISTIANITY AND LAW", "THE SCHOOL OF ATHENS", "NATURE IN WUXIA CINEMA"]


def texture(draw, rng, bounds, count, color):
    x0,y0,x1,y1=bounds
    for _ in range(count):
        x=rng.randrange(x0,x1);y=rng.randrange(y0,y1)
        draw.line((x,y,x+rng.randrange(1,8),y),fill=color,width=1)


def label(draw, xy, value, size, color, serif=False):
    draw.text(xy,value,font=FONT(size,serif),fill=color)


def rule(draw, xy, length, color, width=2):
    x,y=xy;draw.line((x,y,x+length,y),fill=color,width=width)


def wave(draw, x0, x1, baseline, color, width=5, amplitude=12):
    points=[(x,baseline+sin((x-x0)/(x1-x0)*6.28)*amplitude) for x in range(x0,x1+1,4)]
    draw.line(points,fill=color,width=width,joint='curve')


def draw_card(draw, x, y, n, title, palette, variant, width=615):
    paper=palette['paper']; navy=palette['ink']; blue=palette['blue']
    draw.polygon([(x,y+8),(x+width,y),(x+width-24,y+112),(x+22,y+128)],fill=palette['shade'],outline=palette['line'],width=3)
    draw.polygon([(x+22,y+12),(x+width-18,y+4),(x+width-31,y+91),(x+31,y+105)],fill=paper)
    if variant=='signal':
        draw.rectangle((x+34,y+24,x+83,y+72),fill=blue)
        label(draw,(x+44,y+34),f'{n:02d}',20,'#ffffff')
        label(draw,(x+103,y+19),'SHI PIN / RESEARCH / FILE',15,blue)
        label(draw,(x+103,y+52),title,24,navy)
        rule(draw,(x+103,y+88),width-166,palette['line'])
        for k in range(15):
            draw.line((x+width-166+k*8,y+18,x+width-166+k*8,y+27+(k%3)*6),fill=palette['line'],width=2)
    else:
        draw.polygon([(x+34,y+15),(x+width-40,y+8),(x+width-57,y+28),(x+55,y+42)],fill=palette['wash'])
        label(draw,(x+43,y+20),f'{n:02d}  /  MANUSCRIPT',15,blue)
        label(draw,(x+44,y+56),title,25,navy,True)
        wave(draw,x+45,x+width-48,y+96,palette['wash'],4,4)


def draft(variant):
    signal=variant=='signal'
    p=({'bg':'#edf2f7','paper':'#fcfcf7','ink':'#172f62','blue':'#2859bb','line':'#9ab2da','shade':'#dce5f2','wash':'#cddbf1'} if signal else
       {'bg':'#e7edf5','paper':'#fafbf8','ink':'#17335a','blue':'#4c73ae','line':'#9ab1cc','shade':'#d0deed','wash':'#b4cbe5'})
    img=Image.new('RGB',(1800,1100),p['bg']);d=ImageDraw.Draw(img);rng=Random(41)
    texture(d,rng,(0,0,1800,1100),12500,'#e4eaf1')
    label(d,(78,55),'SHI PIN / TEXT TRANSMISSION',22,p['blue'])
    label(d,(75,94),'01  SIGNAL INDEX' if signal else '02  WINDOW FREQUENCY',52,p['ink'],True)
    label(d,(79,166),'CONCEPT SURFACE / PEN HOLDER + FOLDING MANUSCRIPTS',18,p['blue'])
    rule(d,(78,218),1643,p['line'],3)
    label(d,(80,255),'MODEL APPEARANCE',18,p['blue'])
    label(d,(1015,255),'PRINT / TEXTURE LAYOUT',18,p['blue'])

    # Scene mockup: a telescopic stack, the exact three visible article spines,
    # and a fourth index leaf above a front-printed storage box.
    for i,(num,title) in enumerate([(4,'INDEX / 03 DOCUMENTS'),(3,TITLES[2]),(2,TITLES[1]),(1,TITLES[0])]):
        y=306+i*122
        x=245+(i%2)*10
        draw_card(d,x,y,num,title,p,variant,640)
        d.polygon([(x+28,y+104),(x+616,y+91),(x+629,y+121),(x+17,y+137)],fill=p['shade'])
    d.polygon([(208,830),(868,830),(859,1028),(228,1028)],fill=p['paper'],outline=p['ink'],width=4)
    d.polygon([(868,830),(904,796),(902,994),(859,1028)],fill=p['shade'],outline=p['line'],width=3)
    texture(d,rng,(229,838,852,1017),1700,'#e8ecf1')
    if signal:
        d.rectangle((258,866,837,991),outline=p['ink'],width=3)
        label(d,(278,882),'SHI PIN  /  DOCUMENT RECEIVER',24,p['ink'])
        label(d,(278,930),'03 FILES     04 FOLDS     01 SIGNAL',18,p['blue'])
        for j in range(31): d.rectangle((278+j*18,963,287+j*18,975),fill=p['blue'] if j<19 else p['shade'])
    else:
        label(d,(264,874),'A WINDOW FOR WORDS',30,p['ink'],True)
        rule(d,(263,924),528,p['blue'],3)
        label(d,(264,947),'TEXT / MEMORY / TRANSMISSION',17,p['blue'])
        wave(d,263,795,1002,p['wash'],9,12)

    # Flat production concept: one box wrap and three front strips.
    d.rectangle((1008,302,1720,1024),fill='#f7f9fb',outline=p['line'],width=3)
    label(d,(1030,325),'BODY WRAP  /  FRONT + SIDE',17,p['blue'])
    d.rectangle((1030,360,1697,554),fill=p['paper'],outline=p['ink'],width=2)
    if signal:
        for k in range(15): d.line((1033+k*44,360,1033+k*44,555),fill=p['line'],width=1)
        label(d,(1056,382),'RECEIVER_03',38,p['ink'])
        label(d,(1056,439),'ARCHIVE / WU XITING / 2026',19,p['blue'])
        for j in range(37): d.rectangle((1055+j*16,507,1063+j*16,526),fill=p['blue'] if j%5<3 else p['shade'])
    else:
        label(d,(1056,405),'WORDS IN TRANSIT',39,p['ink'],True)
        label(d,(1056,471),'SHI PIN / MANUSCRIPT ARCHIVE',18,p['blue'])
        wave(d,1056,1660,530,p['wash'],12,12)
    label(d,(1030,577),'VISIBLE FOLD STRIPS / FLAT ART',17,p['blue'])
    for i,title in enumerate(TITLES):
        y=614+i*113
        d.rectangle((1030,y,1697,y+95),fill=p['paper'],outline=p['line'],width=2)
        if signal:
            d.rectangle((1046,y+14,1088,y+56),fill=p['blue']);label(d,(1053,y+23),f'{i+1:02d}',17,'#ffffff')
            label(d,(1104,y+17),title,21,p['ink'])
            label(d,(1104,y+53),'WU XITING  /  RESEARCH PAPER',14,p['blue'])
        else:
            label(d,(1048,y+15),f'{i+1:02d} / {title}',23,p['ink'],True)
            label(d,(1050,y+55),'SHI PIN / TRANSMISSION',14,p['blue'])
            wave(d,1050,1672,y+82,p['wash'],5,4)
    label(d,(1033,978),'DRAFT ONLY  ·  TITLE PLACEMENT CHECK',15,p['blue'])
    path=OUT/('letter-texture-A-signal-index.png' if signal else 'letter-texture-B-window-frequency.png')
    img.save(path,optimize=True)
    print(path)


if __name__=='__main__':
    draft('signal');draft('window')
