/* NIXELUNE -- exploratory browser prototype. No external libraries. */
(() => {
'use strict';
const ROWS=15,COLS=9,TILE={teal:'#64D3C1',coral:'#F18479',ice:'#8DBEF1',lilac:'#B5A7E4',amber:'#F0BD75'};
const patterns=[[[0,0],[1,0],[0,1]],[[0,0],[1,0],[1,-1],[2,-1]],[[0,0],[0,1],[-1,1],[-1,2]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[0,-1],[1,-1]],[[0,0],[0,1],[1,1],[1,2]],[[0,0],[-1,0],[0,1],[-1,1]]];
const boardCanvas=document.getElementById('board'),nextCanvas=document.getElementById('nextPreview'),holdCanvas=document.getElementById('holdPreview');
const ctx=boardCanvas.getContext('2d');const $=id=>document.getElementById(id);
let grid,active,next,held=null,hasHeld=false,score=0,stage=1,chain=0,missions=0,lastTick=0,paused=false,gameOver=false,flash=[];
let dims={x:0,y:0,r:18,w:0,h:0};
const rand = n => Math.floor(Math.random()*n);
function unit(){ return {shape:patterns[rand(patterns.length)].map(a=>a.slice()),color:Object.keys(TILE)[rand(5)]}; }
const axialToOffset=(q,r)=>({r,c:q+Math.floor(r/2)});
const offsetToAxial=(c,r)=>({q:c-Math.floor(r/2),r});
const inside=(c,r)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
function coords(piece=active){return piece.shape.map(([q,r])=>{const a=axialToOffset(piece.q+q,piece.r+r);return {r:a.r,c:a.c};});}
function canFit(piece){return coords(piece).every(({r,c})=>inside(c,r)&&!grid[r][c]);}
function spawn(){active={...next,shape:next.shape.map(a=>a.slice()),q:3,r:2};next=unit();hasHeld=false;if(!canFit(active)){gameOver=true;showOverlay('SIEĆ WYGASŁA','Koniec gry',`Twój wynik: ${score.toLocaleString('pl-PL')} punktów.`,'NOWA GRA');}renderPreview();}
function reset(){grid=Array.from({length:ROWS},()=>Array(COLS).fill(null));next=unit();held=null;score=0;stage=1;chain=0;missions=0;paused=false;gameOver=false;flash=[];hideOverlay();spawn();updateStats();lastTick=performance.now();}
function tryMove(dc,dr=0){if(paused||gameOver)return false;const p={...active,q:active.q+dc,r:active.r+dr};if(canFit(p)){active=p;return true;}return false;}
function descend(){ // follow alternating axial steps: net almost-vertical movement
 const deltaQ=(active.r%2===1)?-1:0;
 if(!tryMove(deltaQ,1))lockPiece();
}
function rotate(){if(paused||gameOver)return;const rotated=active.shape.map(([q,r])=>[-r,q+r]);for(const dq of [0,-1,1,-2,2]){const p={...active,q:active.q+dq,shape:rotated};if(canFit(p)){active=p;return;}}}
function drop(){if(paused||gameOver)return;let moved=0;while(moved<ROWS){const deltaQ=(active.r%2===1)?-1:0;if(!tryMove(deltaQ,1))break;moved++;}score+=moved*2;lockPiece();}
function swap(){if(paused||gameOver||hasHeld)return;const prev={shape:active.shape.map(a=>a.slice()),color:active.color};if(held){const take=held;held=prev;const p={...take,q:3,r:2};if(canFit(p))active=p;else{gameOver=true;showOverlay('SIEĆ WYGASŁA','Koniec gry','Nie ma miejsca na zachowany układ.','NOWA GRA');}}else{held=prev;spawn();}hasHeld=true;renderPreview();}
function lockPiece(){for(const {r,c} of coords()){if(inside(c,r))grid[r][c]=active.color;}resolveGroups();stage=1+Math.floor(score/1800);spawn();updateStats();}
function neighbours(r,c){const {q}=offsetToAxial(c,r);return [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].map(([dq,dr])=>axialToOffset(q+dq,r+dr)).filter(p=>inside(p.c,p.r));}
function clusters(){const seen=new Set(),large=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const color=grid[r][c],key=r*COLS+c;if(!color||seen.has(key))continue;const comp=[],stack=[{r,c}];seen.add(key);while(stack.length){const cur=stack.pop();comp.push(cur);for(const n of neighbours(cur.r,cur.c)){const k=n.r*COLS+n.c;if(!seen.has(k)&&grid[n.r][n.c]===color){stack.push(n);seen.add(k);}}}if(comp.length>=5)large.push(comp);}return large;}
function applyGravity(){for(let c=0;c<COLS;c++){let write=ROWS-1;for(let r=ROWS-1;r>=0;r--){if(grid[r][c]){const tile=grid[r][c];grid[r][c]=null;grid[write--][c]=tile;}}}}
function resolveGroups(){let cascades=0,count=0;while(cascades<12){const groups=clusters();if(!groups.length)break;cascades++;for(const comp of groups){count++;score+=comp.length*120+(cascades-1)*180;for(const {r,c} of comp){grid[r][c]=null;flash.push({r,c,expires:performance.now()+220});}}applyGravity();}chain=cascades;missions+=count;}
function updateStats(){const formatted=String(score).padStart(6,'0').replace(/\B(?=(\d{3})+(?!\d))/g,' ');$('score').textContent=formatted;$('mobScore').textContent=formatted;$('combo').textContent=`× ${String(chain).padStart(2,'0')}`;$('mobCombo').textContent=`×${String(chain).padStart(2,'0')}`;$('stage').textContent=String(stage).padStart(2,'0');$('mobStage').textContent=String(stage).padStart(2,'0');$('mission').textContent=`${String(Math.min(3,missions)).padStart(2,'0')} / 03 ukończone`;$('mobileMission').textContent=`CEL ${String(Math.min(3,missions)).padStart(2,'0')}/03 · POŁĄCZ ŚCIEŻKI`;}
function hexagon(g,x,y,r){g.beginPath();for(let i=0;i<6;i++){const angle=(Math.PI/180)*(30+60*i),px=x+r*Math.cos(angle),py=y+r*Math.sin(angle);i===0?g.moveTo(px,py):g.lineTo(px,py);}g.closePath();}
function drawCell(g,x,y,r,color,ghost=false){g.save();hexagon(g,x,y,r*.95);g.fillStyle=ghost?'rgba(141,190,241,.055)':color||'#152638';g.fill();g.lineWidth=ghost?1.8:1.1;g.strokeStyle=ghost?'rgba(215,170,117,.61)':color?'rgba(250,248,238,.24)':'rgba(93,122,140,.18)';g.stroke();if(color&&!ghost){hexagon(g,x,y,r*.67);g.fillStyle='rgba(250,249,246,.045)';g.fill();g.beginPath();g.moveTo(x-r*.38,y-r*.28);g.lineTo(x-r*.03,y-r*.46);g.strokeStyle='rgba(251,251,247,.13)';g.lineWidth=1;g.stroke();}g.restore();}
function locate(r,c){const R=dims.r;return {x:dims.x+Math.sqrt(3)*R*(c+(r%2)*.5),y:dims.y+1.5*R*r};}
function draw(){const rect=boardCanvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const dpr=Math.min(window.devicePixelRatio||1,2);const W=rect.width,H=rect.height;
 if(boardCanvas.width!==Math.round(W*dpr)||boardCanvas.height!==Math.round(H*dpr)){boardCanvas.width=Math.round(W*dpr);boardCanvas.height=Math.round(H*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
 const radius=Math.min((W-22)/(Math.sqrt(3)*(COLS+.5)),(H-18)/(1.5*(ROWS-1)+2));dims.r=radius;dims.x=(W-Math.sqrt(3)*radius*(COLS+.5))/2+Math.sqrt(3)*radius/2;dims.y=(H-(1.5*(ROWS-1)+2)*radius)/2+radius;
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const p=locate(r,c);drawCell(ctx,p.x,p.y,radius,grid[r][c]?TILE[grid[r][c]]:null);}
 if(active&&!gameOver){let shadow={...active},iterations=0;while(iterations++<ROWS){const delta=(shadow.r%2===1)?-1:0;const test={...shadow,q:shadow.q+delta,r:shadow.r+1};if(!canFit(test))break;shadow=test;}for(const {r,c} of coords(shadow)){const p=locate(r,c);drawCell(ctx,p.x,p.y,radius,null,true);}for(const {r,c} of coords(active)){const p=locate(r,c);drawCell(ctx,p.x,p.y,radius*.98,TILE[active.color]);}}
 const now=performance.now();flash=flash.filter(f=>f.expires>now);for(const f of flash){const p=locate(f.r,f.c);ctx.save();ctx.globalAlpha=Math.max(0,(f.expires-now)/220);hexagon(ctx,p.x,p.y,radius*1.13);ctx.strokeStyle='#64D3C1';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
}
function drawPreview(canvas,piece){const g=canvas.getContext('2d'),rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=rect.width||300,h=rect.height||160;canvas.width=w*dpr;canvas.height=h*dpr;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);if(!piece)return;const pt=piece.shape.map(([q,r])=>({x:Math.sqrt(3)*26*(q+r/2),y:1.5*26*r}));const minx=Math.min(...pt.map(p=>p.x)),maxx=Math.max(...pt.map(p=>p.x)),miny=Math.min(...pt.map(p=>p.y)),maxy=Math.max(...pt.map(p=>p.y));const scale=Math.min(1.0,(w-56)/(maxx-minx+65),(h-35)/(maxy-miny+65));pt.forEach(p=>drawCell(g,(w-(maxx-minx)*scale)/2+(p.x-minx)*scale,(h-(maxy-miny)*scale)/2+(p.y-miny)*scale,23*scale,TILE[piece.color]));}
function renderPreview(){drawPreview(nextCanvas,next);drawPreview(holdCanvas,held);}
function showOverlay(overline,title,msg,button){$('overlay').classList.remove('hidden');$('overlayOverline').textContent=overline;$('overlayTitle').textContent=title;$('overlayMessage').textContent=msg;$('overlayAction').textContent=button;}
function hideOverlay(){$('overlay').classList.add('hidden');}
function togglePause(){if(gameOver)return;paused=!paused;if(paused)showOverlay('PRZERWA','Pauza','Oddech i kolejna ścieżka.','WRÓĆ DO GRY');else{hideOverlay();lastTick=performance.now();}}
function action(key){switch(key){case'left':tryMove(-1);break;case'right':tryMove(1);break;case'rotate':rotate();break;case'drop':drop();break;case'swap':swap();break;case'pause':togglePause();break;case'restart':reset();break;}updateStats();draw();}
for(const [id,cmd] of [['left','left'],['right','right'],['rotate','rotate'],['drop','drop'],['swap','swap'],['pauseHeader','pause'],['pauseFooter','pause'],['restart','restart']])$(id).addEventListener('click',()=>action(cmd));
$('overlayAction').addEventListener('click',()=>{if(gameOver)reset();else togglePause();});
window.addEventListener('keydown',e=>{const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',ArrowDown:'drop',Space:'drop',KeyA:'left',KeyD:'right',KeyW:'rotate',KeyC:'swap',KeyP:'pause',Escape:'pause',KeyR:'restart'};const cmd=map[e.code];if(!cmd)return;e.preventDefault();if(e.repeat&&['drop','swap','pause','restart'].includes(cmd))return;action(cmd);});
let touch=null;boardCanvas.addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY};try{boardCanvas.setPointerCapture(e.pointerId)}catch{}});
boardCanvas.addEventListener('pointerup',e=>{if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.abs(dx)>33&&Math.abs(dx)>Math.abs(dy)){const moves=Math.min(5,Math.max(1,Math.round(Math.abs(dx)/48)));for(let i=0;i<moves;i++)tryMove(Math.sign(dx));}else if(dy>52)drop();else rotate();draw();updateStats();});
window.addEventListener('resize',()=>{renderPreview();draw();});
let lastFrame=performance.now();function frame(t){const dt=t-lastTick;if(!paused&&!gameOver&&dt>Math.max(150,850-stage*43)){descend();lastTick=t;updateStats();}draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
})();
