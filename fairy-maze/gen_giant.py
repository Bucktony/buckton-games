#!/usr/bin/env python3
"""Generate the 'Giant Adventures' set (repeatable, fixed seeds): 2 really big mazes + 1 four-area giant level.
Area lines in a level file:  ; area: Name | r0,c0,r1,c1 | #wallcolor | emoji
Usage: python3 gen_giant.py   -> writes levels/custom/giant_*.txt and rebuilds levels/custom.js"""
import random, os, glob
from collections import deque
from add_level import validate, rebuild, CDIR
D4=((1,0),(-1,0),(0,1),(0,-1))
def carve(R,cw,ch,loops,rooms):
    W,H=cw*2+1,ch*2+1; g=[['#']*W for _ in range(H)]
    st=[(R.randrange(cw),R.randrange(ch))]; seen={st[0]}; g[st[0][1]*2+1][st[0][0]*2+1]='.'; last=None
    while st:
        x,y=st[-1]; nb=[(dx,dy) for dx,dy in D4 if 0<=x+dx<cw and 0<=y+dy<ch and (x+dx,y+dy) not in seen]
        if not nb: st.pop(); last=None; continue
        d=last if last in nb and R.random()<0.6 else R.choice(nb)
        nx,ny=x+d[0],y+d[1]; g[y*2+1+d[1]][x*2+1+d[0]]='.'; g[ny*2+1][nx*2+1]='.'; seen.add((nx,ny)); st.append((nx,ny)); last=d
    t=0
    while loops and t<5000:
        t+=1; r,c=R.randrange(1,H-1),R.randrange(1,W-1)
        if g[r][c]=='#' and ((r%2==1 and c%2==0 and g[r][c-1]=='.'==g[r][c+1]) or (r%2==0 and c%2==1 and g[r-1][c]=='.'==g[r+1][c])): g[r][c]='.'; loops-=1
    for _ in range(rooms):
        rw,rh=R.choice([(3,3),(5,3),(3,5),(5,5)]); r0=R.randrange(1,H-rh-1,2); c0=R.randrange(1,W-rw-1,2)
        for r in range(r0,r0+rh):
            for c in range(c0,c0+rw): g[r][c]='.'
    return g
def dist(g,s):
    d={s:0}; prev={s:None}; q=deque([s])
    while q:
        p=q.popleft()
        for a,b in D4:
            n=(p[0]+a,p[1]+b)
            if 0<=n[0]<len(g) and 0<=n[1]<len(g[0]) and g[n[0]][n[1]]!='#' and n not in d: d[n]=d[p]+1; prev[n]=p; q.append(n)
    return d,prev
def stars(R,g,d,prev,E,n,region=None):
    path=set(); p=E
    while p: path.add(p); p=prev[p]
    inreg=lambda p: region is None or (region[0]<=p[0]<=region[2] and region[1]<=p[1]<=region[3])
    cells=[p for p in d if g[p[0]][p[1]]=='.' and inreg(p)]
    dead=[p for p in cells if p not in path and sum(g[p[0]+a][p[1]+b]!='#' for a,b in D4)==1]
    rest=[p for p in cells if p not in dead]; R.shuffle(dead); R.shuffle(rest)
    chosen=[]
    for p in dead[:n]+rest:
        if len(chosen)>=n: break
        if all(abs(p[0]-q[0])+abs(p[1]-q[1])>=5 for q in chosen): chosen.append(p)
    for p in chosen: g[p[0]][p[1]]='*'
def big(seed,cw,ch,nstars):
    R=random.Random(seed); g=carve(R,cw,ch,loops=cw,rooms=4); S=(1,1)
    d,_=dist(g,S); E=max(d,key=d.get); g[S[0]][S[1]]='S'; g[E[0]][E[1]]='E'
    d,prev=dist(g,S); stars(R,g,d,prev,E,nstars); return g,d[E]
AREAS=[("Sunflower Meadow","#e0a82e","🌻"),("Moon Garden","#6f86e0","🌙"),("Rainbow Clouds","#d46bd0","🌈"),("Comet Caves","#d0673f","☄️")]
def giant(seed):
    R=random.Random(seed); cw,ch=11,7; qw,qh=cw*2+1,ch*2+1          # each quadrant 23x15
    W,H=qw*2-1,qh*2-1                                                 # 45x29, quadrants share a wall line
    g=[['#']*W for _ in range(H)]
    quads=[(0,0),(0,qw-1),(qh-1,0),(qh-1,qw-1)]
    for (r0,c0) in quads:
        q=carve(R,cw,ch,loops=5,rooms=2)
        for r in range(qh):
            for c in range(qw):
                if q[r][c]=='.': g[r0+r][c0+c]='.'
    # openings in shared walls (2 per neighbour pair), only where both sides are open
    mid_r,mid_c=qh-1,qw-1
    def openings(cands,k):
        R.shuffle(cands); k0=0
        for (r,c,a,b) in cands:
            if g[a[0]][a[1]]!='#' and g[b[0]][b[1]]!='#': g[r][c]='.'; k0+=1
            if k0>=k: break
    openings([(r,mid_c,(r,mid_c-1),(r,mid_c+1)) for r in range(1,mid_r,2)],2)        # top-left <-> top-right
    openings([(r,mid_c,(r,mid_c-1),(r,mid_c+1)) for r in range(mid_r+1,H-1,2)],2)    # bottom-left <-> bottom-right
    openings([(mid_r,c,(mid_r-1,c),(mid_r+1,c)) for c in range(1,mid_c,2)],2)        # top-left <-> bottom-left
    openings([(mid_r,c,(mid_r-1,c),(mid_r+1,c)) for c in range(mid_c+1,W-1,2)],2)    # top-right <-> bottom-right
    S=(1,1); d,_=dist(g,S)
    br=[p for p in d if p[0]>mid_r and p[1]>mid_c]; E=max(br,key=d.get)  # black hole: farthest cell in the far (bottom-right) area
    g[S[0]][S[1]]='S'; g[E[0]][E[1]]='E'; d,prev=dist(g,S)
    regions=[(0,0,mid_r,mid_c),(0,mid_c,mid_r,W-1),(mid_r,0,H-1,mid_c),(mid_r,mid_c,H-1,W-1)]
    for reg in regions: stars(R,g,d,prev,E,4,reg)
    meta=[f'; area: {n} | {reg[0]},{reg[1]},{reg[2]},{reg[3]} | {col} | {emo}' for (n,col,emo),reg in zip(AREAS,regions)]
    return g,meta,d[E]
if __name__=='__main__':
    for f in glob.glob(os.path.join(CDIR,'giant_*.txt')): os.remove(f)
    items=[]
    g,dd=big(501,20,12,10); items.append(("Milky Way Marathon",g,[],dd))
    g,dd=big(733,17,17,10); items.append(("Big Star Castle",g,[],dd))
    g,meta,dd=giant(909); items.append(("Four Kingdoms Quest",g,meta,dd))
    for i,(name,g,meta,dd) in enumerate(items):
        rows=[''.join(r) for r in g]; errs,ns=validate(rows); assert not errs,(name,errs)
        slug='giant_%d_'%(i+1)+name.lower().replace(' ','_')
        open(os.path.join(CDIR,slug+'.txt'),'w').write(f'; name: {name}\n; order: {30+i}\n; group: Giant Adventures\n'+''.join(m+'\n' for m in meta)+'\n'.join(rows)+'\n')
        print(f'{name}: {len(rows[0])}x{len(rows)}, {ns} stars, S->E {dd} steps')
    rebuild()
