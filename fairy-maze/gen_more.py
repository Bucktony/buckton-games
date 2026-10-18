#!/usr/bin/env python3
"""Generate the 'More Mazes' set (repeatable: fixed seeds).
Blocky corridors like 'Our First Maze', some loops, a few small rooms, dead-end side branches with stars.
Usage: python3 gen_more.py   -> validates and (re)writes levels/custom/more_*.txt, then rebuilds levels/custom.js"""
import random, os, glob, subprocess, sys
from collections import deque
from add_level import validate, rebuild, CDIR
NAMES=["Sunflower Path","Moon Loops","Twinkle Trail","Comet Corners","Petal Paths","Rainbow Rooms","Starlight Steps","Bubble Garden","Rocket Roads","Dreamy Galaxy"]
def bfs(g,s):
    d={s:0}; q=deque([s])
    while q:
        r,c=q.popleft()
        for dr,dc in((1,0),(-1,0),(0,1),(0,-1)):
            n=(r+dr,c+dc)
            if g[n[0]][n[1]]!='#' and n not in d: d[n]=d[(r,c)]+1; q.append(n)
    return d
def make(i):
    R=random.Random(1000+i*37); cw=11; ch=R.choice([6,7,8]); W,H=cw*2+1,ch*2+1
    g=[['#']*W for _ in range(H)]
    # randomized DFS with a bias for long straight corridors (blocky look)
    start=(R.randrange(cw),R.randrange(ch)); st=[start]; seen={start}; g[start[1]*2+1][start[0]*2+1]='.'; last=None
    while st:
        x,y=st[-1]; nb=[(dx,dy) for dx,dy in((1,0),(-1,0),(0,1),(0,-1)) if 0<=x+dx<cw and 0<=y+dy<ch and (x+dx,y+dy) not in seen]
        if not nb: st.pop(); last=None; continue
        d=last if last in nb and R.random()<0.6 else R.choice(nb)
        nx,ny=x+d[0],y+d[1]; g[y*2+1+d[1]][x*2+1+d[0]]='.'; g[ny*2+1][nx*2+1]='.'; seen.add((nx,ny)); st.append((nx,ny)); last=d
    # loops: knock out some walls between corridors
    loops=R.randint(4,8); tries=0
    while loops and tries<2000:
        tries+=1; r,c=R.randrange(1,H-1),R.randrange(1,W-1)
        if g[r][c]=='#' and ((r%2==1 and c%2==0 and g[r][c-1]=='.'==g[r][c+1]) or (r%2==0 and c%2==1 and g[r-1][c]=='.'==g[r+1][c])): g[r][c]='.'; loops-=1
    # a couple of small open rooms (room to roam)
    for _ in range(R.randint(1,3)):
        rw,rh=R.choice([(3,3),(5,3),(3,5)]); r0=R.randrange(1,H-rh-1,2); c0=R.randrange(1,W-rw-1,2)
        for r in range(r0,r0+rh):
            for c in range(c0,c0+rw): g[r][c]='.'
    # S at a corner-ish cell, E at the farthest cell from S
    corners=[(1,1),(1,W-2),(H-2,1),(H-2,W-2)]; S=R.choice(corners)
    d=bfs(g,S); E=max(d,key=lambda p:d[p])
    g[S[0]][S[1]]='S'; g[E[0]][E[1]]='E'
    # solution path
    prev={S:None}; q=deque([S])
    while q:
        p=q.popleft()
        for dr,dc in((1,0),(-1,0),(0,1),(0,-1)):
            n=(p[0]+dr,p[1]+dc)
            if g[n[0]][n[1]]!='#' and n not in prev: prev[n]=p; q.append(n)
    path=set(); p=E
    while p: path.add(p); p=prev[p]
    deadends=[p for p in d if g[p[0]][p[1]]=='.' and p not in path and sum(g[p[0]+a][p[1]+b]!='#' for a,b in((1,0),(-1,0),(0,1),(0,-1)))==1]
    others=[p for p in d if g[p[0]][p[1]]=='.' and p not in path and p not in deadends]
    onpath=[p for p in path if g[p[0]][p[1]]=='.' and d[p]>3]
    n=R.randint(3,8); R.shuffle(deadends); R.shuffle(others); R.shuffle(onpath)
    picks=deadends[:max(2,n//2)]+onpath[:2]; picks+=others[:max(0,n-len(picks))]
    chosen=[]
    for p in picks:  # spread them out
        if all(abs(p[0]-q[0])+abs(p[1]-q[1])>=4 for q in chosen) and len(chosen)<n: chosen.append(p)
    for p in chosen: g[p[0]][p[1]]='*'
    return [''.join(r) for r in g], d[E]
if __name__=='__main__':
    for f in glob.glob(os.path.join(CDIR,'more_*.txt')): os.remove(f)
    for i,name in enumerate(NAMES):
        g,dist=make(i); errs,ns=validate(g); assert not errs,(name,errs); assert 3<=ns<=8,(name,ns)
        slug='more_%02d_'%(i+1)+name.lower().replace(' ','_')
        open(os.path.join(CDIR,slug+'.txt'),'w').write(f'; name: {name}\n; order: {10+i}\n; group: More Mazes\n'+'\n'.join(g)+'\n')
        print(f'{name}: {len(g[0])}x{len(g)}, {ns} stars, S->E {dist} steps')
    rebuild()
