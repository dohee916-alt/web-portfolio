if(!(window.PROJECTS||[]).some(p=>p&&p.enabled!==false)){
 const label=document.getElementById('stillGrowing');if(label){label.style.opacity='1';label.style.top='50%';label.style.transform='translate(-50%,-50%)'}
}else{

const $=id=>document.getElementById(id),scene=$('scene'),root=$('layers'),items=(window.PROJECTS||[]).filter(p=>p&&p.enabled!==false),dialog=$('detail');
const N=items.length, S=32, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), mix=(a,b,t)=>a+(b-a)*t, ease=t=>{t=clamp(t);return t*t*(3-2*t)}, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>matchMedia('(pointer:coarse), (max-width:600px)').matches;
let phase='intro',startAt=0,focus=Math.floor((N-1)/2),target=focus,hover=false,drag=null,blockClick=0,selected=-1,openedAt=0,closingAt=0,last=performance.now(),lift=[], poses=[];
const cards=[],anchors=[],visited=new Set(),svg=$('curve'),path=svg.querySelector('path');
const svgNS='http://www.w3.org/2000/svg',futurePath=document.createElementNS(svgNS,'path'),futureText=document.createElementNS(svgNS,'text'),futureLabelPath=document.createElementNS(svgNS,'path'),futureTextPath=document.createElementNS(svgNS,'textPath');
futurePath.setAttribute('fill','none');futurePath.setAttribute('stroke-dasharray','4 7');futurePath.setAttribute('stroke-linecap','round');futurePath.setAttribute('id','futureTrack');futureText.setAttribute('id','futureMessage');futureText.setAttribute('text-anchor','middle');futureText.setAttribute('stroke','none');futureText.setAttribute('fill','#f4eedc');futureLabelPath.setAttribute('id','futureLabelCurve');futureLabelPath.setAttribute('fill','none');futureLabelPath.setAttribute('stroke','none');futureLabelPath.setAttribute('aria-hidden','true');futureTextPath.setAttribute('href','#futureLabelCurve');futureTextPath.setAttribute('startOffset','50%');futureTextPath.textContent='More to Unfold';futureText.append(futureTextPath);svg.append(futurePath,futureLabelPath,futureText);
// One background silhouette per actual project; the personal journey is the central stack.
const forest=$('introForestTrees'),forestProjects=items.filter(p=>p.category==='Project');
if(forest){
 const slots=[{x:135,y:456,h:280},{x:305,y:510,h:205},{x:704,y:498,h:240},{x:865,y:455,h:315}];
 forestProjects.forEach((p,i)=>{
  const side=slots[i]||{x:90+(i*157)%820,y:470+(i%3)*30,h:190+(i%4)*30};
  const tree=document.createElementNS(svgNS,'use');
  const scale=side.h/380;
  tree.setAttribute('href','#projectTreeSilhouette');
  tree.setAttribute('transform','translate('+(side.x-100*scale)+' '+(side.y-side.h)+') scale('+scale+')');
  tree.setAttribute('fill','#183a29');
  tree.setAttribute('opacity',String(i%2?.42:.56));
  forest.append(tree);
 });
}
const detail=$('detail');detail.removeAttribute('open');detail.setAttribute('aria-hidden','true');
const touchLayout=()=>matchMedia('(pointer:coarse)').matches;
function setPhase(p){phase=p;scene.dataset.phase=p;$('foldEdge').hidden=true;$('fold').hidden=p!=='explore'||(!touchLayout()&&(focus>-.965||target>-.965))}
items.forEach((p,i)=>{
 const card=document.createElement('button');card.className='layer';card.type='button';card.disabled=true;card.setAttribute('aria-label',p.title);card.style.setProperty('--color',p.color);
 const shell=document.createElement('div');shell.className='sheet';const strips=[];
 
 card.append(shell);root.append(card);
 const anchor=document.createElement('button');anchor.type='button';anchor.className='anchor';anchor.setAttribute('aria-label',p.title);const y=document.createElement('span');y.textContent=p.year;const title=document.createElement('b');title.textContent=p.title;anchor.append(y,title);root.append(anchor);
 const select=()=>{if(phase==='intro'&&i===0){start();return}if(performance.now()<blockClick||phase!=='explore')return;if(i!==Math.round(focus)){target=i;wheelAt=0;return}open(i)};
 card.addEventListener('click',select);anchor.addEventListener('click',()=>{if(phase==='explore'&&performance.now()>blockClick){if(i!==Math.round(focus)){target=i;wheelAt=0}else open(i)}});
 card.addEventListener('focus',()=>{if(phase==='explore'&&!mobile()){target=i;wheelAt=0}});
 cards.push({card,shell,strips});anchors.push(anchor);lift.push(0);
});

/* Continuous projected mesh: sheet bending and perspective are calculated in
   local coordinates; the final silhouette is rendered as one seamless surface.
   References: book-flip/src/bendMaterial.ts (bow during flip), Codrops circular
   gallery (damped continuous navigation), radial-gallery (spatial picking).
   Original implementation; no external example code copied. */
const surface=document.createElement('canvas');surface.id='optical-scene';surface.setAttribute('aria-hidden','true');root.prepend(surface);
const ctx=surface.getContext('2d');let silhouettes=[],velocity=0,lastDragX=0,lastDragT=0,impactPose=null,impactAnchor=null;const OPEN_MS=1320,CLOSE_MS=780;const HIT=.19,PUSH=.57;let closeFrom=1,wheelAt=0,scrollSpeed=0,lastWheel=0,unfold=0,unfoldTarget=0,returnFocus=0,autoUnfold=false,gate=false;const RANGE=8;
// A fixed, very fine fiber pattern reads as paper without shimmering in motion.
const grainTile=document.createElement('canvas');grainTile.width=grainTile.height=96;
const grainCtx=grainTile.getContext('2d');let grainSeed=17;
const grainRandom=()=>((grainSeed=(grainSeed*1664525+1013904223)>>>0)/4294967296);
for(let i=0;i<320;i++){
 const x=grainRandom()*96,y=grainRandom()*96;
 grainCtx.fillStyle=i%3?'rgba(81,91,75,.13)':'rgba(255,255,247,.28)';
 grainCtx.fillRect(x,y,grainRandom()*1.1+.2,grainRandom()*1.1+.2);
}
const paperGrain=ctx.createPattern(grainTile,'repeat');
function project(x,y,z,m){const camera=Math.max(780,m.W*1.05),k=camera/Math.max(180,camera-z);return [m.W*.5+(x-m.W*.5)*k,m.H*.4+(y-m.H*.4)*k,z]}
function mesh(p,m,i){
 const rows=p.fall>0.0001?64:1, L=[],R=[],rad=Math.PI/180,ry=p.ry*rad,rz=p.rz*rad,cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 let yy=0,zz=0;
 const convert=(x,y,z)=>{x*=p.scale;y*=p.scale;z*=p.scale;const a=x*cz-y*sz,b=x*sz+y*cz;return project(p.x+a*cy+z*sy,p.y+b,p.z-a*sy+z*cy,m)};
 for(let j=0;j<=rows;j++){
  if(j){const u=(j-.5)/rows,t=p.fall;const a=Math.PI*.5*ease(clamp(t*1.7+u*.7-.7))+Math.sin(Math.PI*t)*Math.sin(Math.PI*u)*.26;yy-=Math.cos(a)*m.h/rows;zz+=Math.sin(a)*m.h/rows}
  L.push(convert(-m.w/2,yy,zz));R.push(convert(m.w/2,yy,zz))
 }
 const poly=L.concat(R.slice().reverse());
 return {i,L,R,p,poly}
}
// A folded sheet can project onto itself. Build a union of its projected
// strips, all with the same winding, rather than canceling the folded region.
function sheetPath(s){
 const {L,R,poly}=s;
 if(L.length===2){shape(poly);return}
 ctx.beginPath();
 for(let j=1;j<L.length;j++){
  let q=[L[j-1],L[j],R[j],R[j-1]],a=0;
  for(let k=0;k<4;k++){const v=q[k],w=q[(k+1)%4];a+=v[0]*w[1]-w[0]*v[1]}
  if(a<0)q.reverse();
  ctx.moveTo(q[0][0],q[0][1]);for(let k=1;k<4;k++)ctx.lineTo(q[k][0],q[k][1]);ctx.closePath();
 }
}
// Intro projection has horizontal cross-sections. Trace the exterior envelope
// so the fold is a filled surface, with no internal strip outlines.
function paperOutline(s){
 const {L,R,p,poly}=s;
 if(L.length===2||Math.abs(p.ry)+Math.abs(p.rz)>.001)return poly;
 const ys=[...new Set(L.map(v=>v[1]))].sort((a,b)=>a-b),left=[],right=[];
 for(const y of ys){
  let lo=Infinity,hi=-Infinity;
  for(let j=1;j<L.length;j++){
   const a=L[j-1],b=L[j],c=R[j-1],d=R[j],dy=b[1]-a[1];
   if(y<Math.min(a[1],b[1])-1e-7||y>Math.max(a[1],b[1])+1e-7)continue;
   if(Math.abs(dy)<1e-8){lo=Math.min(lo,a[0],b[0]);hi=Math.max(hi,c[0],d[0]);continue}
   const t=clamp((y-a[1])/dy);lo=Math.min(lo,mix(a[0],b[0],t));hi=Math.max(hi,mix(c[0],d[0],t));
  }
  if(Number.isFinite(lo)){left.push([lo,y]);right.push([hi,y])}
 }
 return left.concat(right.reverse());
}
function shape(poly){ctx.beginPath();if(poly.length===4){for(let i=0;i<4;i++){const p=poly[(i+3)%4],q=poly[i],r=poly[(i+1)%4],a=Math.min(2.5,Math.hypot(q[0]-p[0],q[1]-p[1])*.035),b=Math.min(2.5,Math.hypot(r[0]-q[0],r[1]-q[1])*.035),da=Math.hypot(q[0]-p[0],q[1]-p[1])||1,db=Math.hypot(r[0]-q[0],r[1]-q[1])||1,x=q[0]+(p[0]-q[0])*a/da,y=q[1]+(p[1]-q[1])*a/da;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);ctx.quadraticCurveTo(q[0],q[1],q[0]+(r[0]-q[0])*b/db,q[1]+(r[1]-q[1])*b/db)}}else poly.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath()}
function opticalRender(m){
 // Render on the entire scene, not just the lower world layout box.
 const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(m.W*dpr),h=Math.round(m.viewportH*dpr);
 if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h}
 surface.style.top=(-m.topInset)+'px';surface.style.width=m.W+'px';surface.style.height=m.viewportH+'px';
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
 ctx.setTransform(dpr,0,0,dpr,0,m.topInset*dpr);
 silhouettes=poses.map((p,i)=>mesh(p,m,i)).sort((a,b)=>(a.p.z+(a.i===selected?500:0))-(b.p.z+(b.i===selected?500:0)));
 for(const s of silhouettes){const {p,L,R,poly}=s;if(p.opacity<.01)continue;
  ctx.save();ctx.globalAlpha=p.opacity;sheetPath(s);
   const g=ctx.createLinearGradient(L[0][0],L[0][1],R[R.length-1][0],R[R.length-1][1]);
   g.addColorStop(0,'rgba(253,252,245,.52)');g.addColorStop(.28,'rgba(247,248,240,.38)');g.addColorStop(.72,'rgba(250,250,242,.42)');g.addColorStop(1,'rgba(238,243,234,.47)');
   ctx.fillStyle=g;ctx.shadowColor='rgba(49,65,60,.09)';ctx.shadowBlur=8;ctx.shadowOffsetY=4;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   ctx.save();sheetPath(s);ctx.clip();ctx.globalAlpha=p.opacity*.4;ctx.fillStyle=paperGrain;ctx.fillRect(0,-m.topInset,m.W,m.viewportH);ctx.restore();
   // Let the translucent paper fill define its silhouette, without a drawn outline.
   ctx.restore()
 }
}
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function pick(e){const r=root.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(let j=silhouettes.length-1;j>=0;j--){let s=silhouettes[j];if(s.p.opacity>.3&&inside(x,y,s.poly))return s.i}return -1}
scene.addEventListener('click',e=>{if(phase==='intro'){if(performance.now()>=blockClick&&!e.target.closest('#nav, #reset, #detail'))start();return}if(phase!=='explore'||performance.now()<blockClick||e.target.closest('.anchor, #nav, #reset, #detail, .heading'))return;const i=pick(e);if(i<0)return;if(i!==Math.round(focus)){target=i;wheelAt=0;return}open(i)});

function measure(){
 const r=root.getBoundingClientRect(),s=scene.getBoundingClientRect(),W=r.width,V=s.height;
 // Fixed intro paper size; shrink only to fit a small viewport.
 const w=Math.min(185,W*.43); // Never resize the intro stack based on viewport aspect ratio or height.
 // Layout is determined by the available viewport, not the input device.
 const compact=Math.max(ease(clamp((1.45-W/Math.max(1,V))/.65)),ease(clamp((850-W)/350)));
 const galleryW=Math.min(260,W*.43,Math.max(185,W*.19)); // Monotonic width; compact layout changes spacing, not paper size.
 return {W,H:r.height,w,h:w*(9.5/7),topInset:r.top-s.top,viewportH:V,compact,galleryW,
  trackW:Math.min(W,V*1.6),trackStep:mix(Math.min(W*.84/Math.max(1,Math.min(N-1,7)),galleryW*.70),galleryW*.55,compact)};
}
function introPose(i,m){return {x:m.W*.5,y:m.viewportH*.5-m.topInset+m.h*1.15/2,z:-i*Math.min(12,84/Math.max(1,N-1)),ry:0,rz:0,fall:0,opacity:1,scale:1.15}}
// Reference composition: ascending convex arc, cards hanging below their anchors.
// A single continuous arc, shared by the entire stack and its timeline.
// The stack opens onto a shallow continuous curved track.
// A single reference parabola, uniformly scaled in both dimensions.
function trackY(x,m){
 const q=.5+(x-m.W*.5)/Math.max(1,m.trackW);
 return m.viewportH*(.15+.10*m.compact)-m.topInset+(.62/1.6)*m.trackW*(1-q)*(1-q);
}
function anchorAt(i,m,f=focus){
 const effective=f<0?f*mix(.85,.38,m.compact):f;
 const x=m.W*.5+(i-effective)*m.trackStep;
 return {x,y:trackY(x,m)};
}
function backAt(m){
 const pad=Math.min(48,m.W*.16);
 const x=clamp(m.W*.5-1.65*m.trackStep,pad,m.W-pad);
 return {x,y:trackY(x,m)};
}
// Exact projection of the top midpoint for upright sheets; no iterative mesh calculations.
function topCenter(p,m){const ry=p.ry*Math.PI/180,rz=p.rz*Math.PI/180,a=m.h*p.scale*Math.sin(rz),b=-m.h*p.scale*Math.cos(rz);const z=p.z-a*Math.sin(ry);const v=project(p.x+a*Math.cos(ry),p.y+b,z,m);return {x:v[0],y:v[1]}}
function alignTop(p,m,i,x,y){const e=topCenter(p,m),ry=p.ry*Math.PI/180,rz=p.rz*Math.PI/180,z=p.z-m.h*p.scale*Math.sin(rz)*Math.sin(ry),camera=Math.max(780,m.W*1.05),k=camera/Math.max(180,camera-z);p.x+=(x-e.x)/k;p.y+=(y-e.y)/k;return p}
// A single impact transfers velocity to the circle. It flies independently.
function flight(u,m){
 const t=clamp((u-HIT)/(PUSH-HIT)),s=t*t*(3-2*t);
 const y0=impactAnchor.y+5, room=y0+m.topInset-38;
 const rise=Math.max(0,Math.min(m.viewportH*.125,105,room));
 const dx=clamp(m.W*.045,16,60);
 const sign=impactAnchor.x>m.W*.80?-1:1;
 return {x:impactAnchor.x+sign*dx*s,y:y0-rise*s};
}
function currentDot(u,m){return flight(u,m)}
// Codrops 3DStackMotion: coherent group orientation and successive depth offsets.
 // Keep the planes parallel, like the supplied blue bank-card reference.
// Common track geometry, continuous through the intro-to-gallery handoff.
function archivePose(i,m,f=focus,amount=1){
 const d=i-f,a=anchorAt(i,m,f),t=clamp(a.x/m.W),k=m.galleryW/260;
 const size=m.galleryW/m.w*mix(.96,1.04,m.compact);
 const p={x:a.x,y:a.y+m.h,z:(55+t*105+lift[i]*.35*amount)*k,ry:-38+t*14,rz:-24+t*12,fall:0,opacity:clamp(1-(Math.abs(d)-4.1)*.65),scale:size};
 const compactGap=m.galleryW*.32+5;
 return alignTop(p,m,i,a.x+mix(Math.min(m.galleryW*.16,25),0,m.compact),a.y+mix(Math.max(35,88-lift[i]*amount*.48)*k,compactGap,m.compact));
}
function panelTarget(m){
 const W=m.W,H=m.viewportH,pad=clamp(W*.018,8,22),iw=Math.min(W*(mobile()?.92:.86)-2*pad,(H*.72-2*pad)*16/9),w=iw+2*pad,h=iw*9/16+2*pad;
 return {x:(W-w)/2,y:(H-h)/2,w,h,pad};
}
function detailProgress(now){return phase==='closing'?closeFrom*(1-clamp((now-closingAt)/CLOSE_MS)):phase==='detail'?1:clamp((now-openedAt)/OPEN_MS)}
function renderPanel(m,u){
 if(!impactAnchor||u<PUSH){detail.classList.remove('morphing','visible','content-ready');return}
 const t=ease(clamp((u-PUSH)/(.92-PUSH))),dest=panelTarget(m),r=7,dot=currentDot(PUSH,m);
 const w=mix(r*2,dest.w,t),h=mix(r*2,dest.h,t);
 const x=mix(dot.x-r,dest.x,t),y=mix(dot.y+m.topInset-r,dest.y,t);
 detail.style.left=x+'px';detail.style.top=y+'px';detail.style.width=w+'px';detail.style.height=h+'px';detail.style.borderRadius=mix(r,2,t)+'px';
 detail.style.setProperty('--paper-pad',dest.pad+'px');
 // Render the finished page at its native aspect ratio inside the same growing silhouette.
 detail.style.setProperty('--page-width',dest.w+'px');detail.style.setProperty('--page-height',dest.h+'px');
 detail.style.setProperty('--page-scale-x',String(w/dest.w));detail.style.setProperty('--page-scale-y',String(h/dest.h));
 detail.style.setProperty('--page-clip-radius',mix(r,2,t)+'px');
 detail.style.setProperty('--reveal',String(ease(clamp((u-.76)/.24))));
 detail.classList.add('morphing');detail.classList.toggle('content-ready',u>=PUSH);detail.classList.toggle('visible',phase==='detail');
}
function between(a,b,t){const o={};for(const k in a)o[k]=mix(a[k],b[k],t);return o}
function drawSheet(obj,p,m,i){const {card,strips}=obj;card.style.width=m.w+'px';card.style.height=m.h+'px';card.style.transform='translate3d('+ (p.x-m.w/2)+'px,'+(p.y-m.h)+'px,'+p.z+'px) rotateY('+p.ry+'deg) rotateZ('+p.rz+'deg) scale('+p.scale+')';card.style.opacity=p.opacity;card.style.zIndex=String(Math.round(100+p.z+(selected===i&&phase!=='explore'?500:0)));

}
const FALL_STAGGER=Math.min(.12,.84/Math.max(1,N-1)),FALL_DURATION=.68,DOWN_END=(N-1)*FALL_STAGGER+FALL_DURATION,LAUNCH_START=DOWN_END+.10,LAUNCH_END=LAUNCH_START+1.35;
function frame(now){const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.05),playDt=Math.min(elapsed,.15);last=now;const m=measure();if(phase==='explore'&&!drag&&Math.abs(velocity)>.015){target=clamp(target+velocity*dt,-1,N-1);velocity*=Math.exp(-dt*4.8);if(Math.abs(velocity)<.18||(target===-1&&velocity<0)||(target===N-1&&velocity>0)){velocity=0;target=Math.round(target)}}if(phase==='explore'&&wheelAt){
 const idle=now-wheelAt;
 if(idle>150){
  // Choose the final snap once, before the remaining visual travel. Never coast then correct backwards.
  const predicted=clamp(target+scrollSpeed/9,-1,N-1);
  const nearest=Math.round(predicted);
  const destination=wheelDirection>0?Math.max(nearest,Math.ceil(focus-.001)):Math.min(nearest,Math.floor(focus+.001));
  target=clamp(destination,-1,N-1);wheelAt=0;scrollSpeed=0;wheelDirection=0;
 }
}focus=mix(focus,target,1-Math.exp(-dt*(drag?35:wheelAt?26:10)));if(Math.abs(focus-target)<.001)focus=target;
 if(phase==='animation'){
  if(returning){unfold=Math.max(0,unfold-dt/LAUNCH_END)}
  else if(launchLocked){unfold=Math.min(1,unfold+playDt/3);unfoldTarget=1}
  else if(held()){const diff=unfoldTarget-unfold;const maxStep=dt*(touchHold?.10:.20);unfold+=clamp(diff,-maxStep,maxStep);if(Math.abs(unfoldTarget-unfold)<.0001)unfold=unfoldTarget}
  else if(autoUnfold){const speed=1/6.8;unfold=Math.min(1,unfold+playDt*speed);releaseBoost*=Math.exp(-dt*3);unfoldTarget=1}
  if(!returning&&!launchLocked&&unfold>=DOWN_END/LAUNCH_END-.0001){launchLocked=true;clearIntroControl();unfoldTarget=1;drag=null;scene.classList.remove('dragging')}
 }
 if(phase==='animation'&&returning&&unfold===0&&unfoldTarget===0){returning=false;launchLocked=false;lastWheel=performance.now();setPhase('intro');$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'터치하여 레이어를 펼치세요.':'클릭하여 레이어를 펼치세요.';$('nav').hidden=true;cards.forEach((o,i)=>o.card.disabled=i!==0)}
 if(phase==='animation'&&unfold===1&&unfoldTarget===1&&!held()){clearIntroControl();autoUnfold=false;launchLocked=false;gate=true;lastWheel=performance.now();setPhase('explore');unfold=unfoldTarget=1;$('nav').hidden=false;$('hint').textContent=mobile()?'좌우로 탐색 · 아래로 드래그하여 접기':'스크롤하여 탐색';$('eyebrow').textContent='02 / EXPLORE';$('headline').textContent='';cards.forEach(o=>o.card.disabled=false)}
 const time=unfold*LAUNCH_END;const archive=phase==='explore'||phase==='opening'||phase==='detail'||phase==='closing';
 const active=archive||phase==='animation'&&unfold*LAUNCH_END>=LAUNCH_START;
 for(let i=0;i<N;i++){const d=i-focus;const want=active?100*Math.exp(-Math.pow(Math.abs(d)/.60,2)):0;lift[i]=phase==='animation'?want:mix(lift[i],want,1-Math.exp(-dt*14))}
 let points=[];
 for(let i=0;i<N;i++){
  let p=introPose(i,m);
  if(phase==='animation'){
   if(i<N){
    const fall=ease((time-i*FALL_STAGGER)/FALL_DURATION);
    p.fall=fall;p.y+=p.fall*(N-1-i)*Math.min(2,14/Math.max(1,N-1));p.z+=p.fall*(N-1-i)*Math.min(3,21/Math.max(1,N-1));
   }
   if(time>=LAUNCH_START){const t=clamp((time-LAUNCH_START)/1.35),q=ease(t);const dest=archivePose(i,m,focus,1);p=between(p,dest,q);p.y-=Math.sin(Math.PI*t)*m.H*.24;p.z+=Math.sin(Math.PI*t)*45}
  }else if(archive){
   p=archivePose(i,m);
   if(selected>=0&&(phase==='opening'||phase==='detail'||phase==='closing')){
    const u=detailProgress(now),hit=impactAnchor||anchorAt(selected,m);
    if(i===selected){
     const start=impactPose||p;
     const contact=alignTop({...start},m,i,hit.x,hit.y+12);
     const release=HIT+(PUSH-HIT)*.56;
     const pushedDot=flight(release,m);
     const pushed=alignTop({...contact},m,i,pushedDot.x,pushedDot.y+7);
     if(u<HIT){
      const q=clamp(u/HIT);p=between(start,contact,ease(q));
     }else if(u<=release){
      // The paper edge stays in contact with the underside of the moving dot.
      const dot=flight(u,m);
      p=alignTop({...contact},m,i,dot.x,dot.y+7);
     }else{
      // Only after the shared push does the paper peel away.
      const t=clamp((u-release)/(1-release)),q=ease(t);
      const dest={...p,x:m.W*(mobile()?.5:.27),y:m.viewportH*(mobile()?.48:.78)-m.topInset,z:120,ry:-13,rz:-7,scale:mobile()?1.10:1.26,opacity:1};
      p=between(pushed,dest,q);
      p.opacity*=1-ease(clamp((t-.08)/.65));
     }
    }else{const q=ease(clamp((u-.24)/.55));p.y-=q*m.viewportH*.035;p.opacity*=1-q*.83}
   }
  }
  poses[i]=p;cards[i].card.classList.toggle('selected',selected===i&&phase!=='explore');drawSheet(cards[i],p,m,i);
  const base=selected===i&&impactAnchor?impactAnchor:anchorAt(i,m);const a=anchors[i];const ax=base.x,ay=base.y;points.push([ax,ay+5]);
  a.style.left=ax+'px';a.style.top=ay+'px';const firstEndpoint=i===0&&phase==='explore'&&focus<-.5;a.querySelectorAll('span,b').forEach(el=>el.style.visibility=m.compact>.55&&Math.abs(i-Math.round(focus))>0&&!firstEndpoint?'hidden':'');a.classList.toggle('first-endpoint',firstEndpoint);const edge=Math.min(ax,m.W-ax);a.style.visibility=edge<(m.compact>.55?-7:20)||ay+m.topInset<45||ay+m.topInset>m.viewportH-24?'hidden':'visible';a.style.setProperty('--edge-fade',String(m.compact>.55?clamp((edge+7)/17):1));a.classList.toggle('active',Math.abs(i-focus)<.5);a.classList.toggle('visited',visited.has(i));a.classList.toggle('picked',selected===i);a.disabled=phase!=='explore';
  const u=selected===i&&phase!=='explore'?detailProgress(now):0;
  const flying=selected===i&&impactAnchor&&u>=HIT;
  const dot=flying?currentDot(u,m):null;
  a.classList.toggle('absorbed',selected===i&&u>=PUSH);
  a.style.setProperty('--bump',dot?(dot.y-(ay+5))+'px':'0px');
  a.style.setProperty('--fly-x',dot?(dot.x-ax)+'px':'0px');
  const squash=flying?1+.06*Math.sin(Math.PI*clamp((u-HIT)/.12)):1;
  a.style.setProperty('--dot-stretch',String(squash));
  if(selected===i&&u>=HIT&&u<PUSH){a.style.visibility='visible'}

 }
 opticalRender(m);
 const growing=$('stillGrowing');
 if(phase==='intro'){
  const vertices=silhouettes.flatMap(s=>s.poly);
  const top=Math.min(...vertices.map(v=>v[1])),left=Math.min(...vertices.map(v=>v[0])),right=Math.max(...vertices.map(v=>v[0]));
  growing.style.left=((left+right)/2)+'px';
  growing.style.top=(m.viewportH*.5-185*(9.5/7)*1.15/2-18)+'px'; // Fixed vertical anchor, independent of viewport width.
 }
 svg.setAttribute('viewBox','0 0 '+m.W+' '+m.H);
 const touchBack=touchLayout(),atStart=phase==='explore'&&focus<-.965&&target<-.965;
 const ba=backAt(m),a0=atStart?ba:anchorAt(0,m),a1=anchorAt(N-1,m);
 // Exact quadratic between the same track coordinates used by the anchors.
 const midX=(a0.x+a1.x)/2,midY=2*trackY(midX,m)-(a0.y+a1.y)/2;
 path.setAttribute('d','M '+a0.x+' '+(a0.y+5)+' Q '+midX+' '+(midY+5)+' '+a1.x+' '+(a1.y+5));
 const futureFade=phase==='explore'?clamp((focus-(N-1.65))/.65):0;
 const endX=m.W-Math.min(12,m.W*.035),startX=a1.x,midFuture=(startX+endX)/2;
 const endY=trackY(endX,m),controlY=2*trackY(midFuture,m)-(a1.y+endY)/2;
 const futureVisible=futureFade>0&&endX>startX+24;
 futurePath.setAttribute('d',futureVisible?'M '+startX+' '+(a1.y+5)+' Q '+midFuture+' '+(controlY+5)+' '+endX+' '+(endY+5):'');
 futurePath.style.opacity=String(futureFade*.72);futureText.style.opacity=String(futureVisible?futureFade:0);
 const seedEntry=$('contactBloom');if(seedEntry){
  const seedScale=1+.30*clamp((m.W-600)/1000);
  const seedRight=endX-36;
  // SVG is 120x95 for a 240x190 viewBox. Its transformed centerline
  // is 15px left of the entry right edge, and its 84% pivot is 35px below entry top.
  // The bud center (120,31) is 64.3 CSS px above that pivot at scale 1.
  const budX=seedRight-15;
  const budTrackY=trackY(budX,m)+5+m.topInset;
  const budCenterOffset=2*seedScale;
  const seedTop=budTrackY+budCenterOffset-35+64.3*seedScale;
  seedEntry.hidden=!futureVisible||futureFade<.2;seedEntry.style.left=seedRight+'px';seedEntry.style.top=seedTop+'px';
  seedEntry.style.opacity=String(futureFade);seedEntry.style.setProperty('--seed-scale',String(seedScale));
 }
 // Letter baselines follow the same quadratic curve, 10px above the dotted track.
 futureLabelPath.setAttribute('d',futureVisible?'M '+startX+' '+(a1.y-5)+' Q '+midFuture+' '+(controlY-5)+' '+endX+' '+(endY-5):'');
 futureText.setAttribute('font-size','11');futureText.setAttribute('letter-spacing','.35');
 const back=$('fold'),br=root.getBoundingClientRect();
 back.hidden=touchBack?phase!=='explore':!atStart;back.classList.toggle('mobile-fold',touchBack);back.style.left=touchBack?'50%':(br.left+ba.x)+'px';back.style.top=touchBack?'auto':(br.top+ba.y+5)+'px';
 const tangent=Math.atan2(trackY(ba.x+1,m)-trackY(ba.x-1,m),2)*180/Math.PI;
 back.style.setProperty('--back-angle',touchBack?'-90deg':tangent+'deg');
 const edgeBack=$('foldEdge');edgeBack.hidden=!touchBack||!atStart;edgeBack.style.left=(br.left+ba.x)+'px';edgeBack.style.top=(br.top+ba.y+5)+'px';edgeBack.style.setProperty('--back-angle',tangent+'deg');$('counter').textContent=(Math.max(0,Math.round(focus)+1))+' / '+N;$('prev').disabled=target<=-1;$('next').disabled=target>=N-1;
 if(selected>=0&&['opening','detail','closing'].includes(phase))renderPanel(m,detailProgress(now));
 if(phase==='opening'&&now-openedAt>=OPEN_MS){setPhase('detail');detail.classList.add('visible');detail.setAttribute('aria-hidden','false')}
 if(phase==='closing'&&now-closingAt>=CLOSE_MS){target=Math.round(focus);selected=-1;impactPose=null;impactAnchor=null;detail.classList.remove('morphing','visible','content-ready');setPhase('explore')}
 requestAnimationFrame(frame)
}
function enterTransition(){
 if(phase==='explore'){
  returnFocus=focus;target=focus;velocity=0;scrollSpeed=0;wheelAt=0;
  unfold=unfoldTarget=1;gate=false;
 }
 if(phase==='intro'||phase==='explore'){setPhase('animation');cards.forEach(o=>o.card.disabled=true);$('nav').hidden=true}
 scene.classList.remove('intro-card-hover');
}
function start(){if(phase!=='intro')return;enterTransition();clearIntroControl();target=focus=returnFocus;autoUnfold=true;unfoldTarget=1;$('hint').textContent=mobile()?'누르고 드래그하여 조절 · 놓으면 계속 재생':'종이 위에서 마우스를 움직여 조절 · 벗어나면 계속 재생'}
function navigate(delta,axis='y'){
 if(returning||launchLocked)return;
 if(!delta||!['intro','animation','explore'].includes(phase))return;
 if(axis==='x'){
  if(phase==='explore')target=clamp(target+delta,-1,N-1);
  return;
 }
 if(phase==='explore'){if(delta>=0)return;enterTransition();clearIntroControl();autoUnfold=false;unfoldTarget=0;returning=true;return}
 if(phase==='intro'){if(delta<=0)return;start();return}
 if(phase==='animation'&&touchHold)unfoldTarget=clamp(unfoldTarget+delta/(RANGE*.72),0,1);
}
function reset(){introTouch=null;clearIntroControl();returning=false;gate=false;launchLocked=false;unfold=unfoldTarget=0;returnFocus=Math.floor((N-1)/2);autoUnfold=false;velocity=0;wheelAt=0;scrollSpeed=0;lastWheel=0;selected=-1;impactPose=null;impactAnchor=null;detail.classList.remove('visible','morphing','content-ready');detail.setAttribute('aria-hidden','true');setPhase('intro');scene.classList.remove('intro-card-hover');cards.forEach((o,i)=>o.card.disabled=i!==0);$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'터치하여 레이어를 펼치세요.':'클릭하여 레이어를 펼치세요.';$('nav').hidden=true;hover=false;target=focus=Math.floor((N-1)/2);lift.fill(0)}

let projectPages=[],readerTitle='';
function pagesFor(p){return Array.isArray(p.pages)?p.pages.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()):[]}
let raonSlideIndex=0,raonTouchStart=null,slideBusy=false,slideEpoch=0;
const pageCache=new Map();
function preparePage(i,pages=projectPages){
 const url=pages[i];if(!url)return Promise.reject(new Error('Missing page'));
 if(!pageCache.has(url)){
  const img=new Image();img.src=url;
  const ready=img.decode().then(()=>img).catch(err=>{pageCache.delete(url);throw err});
  pageCache.set(url,ready);
 }
 return pageCache.get(url);
}
function updatePageNav(){
 $('raonCount').textContent=String(raonSlideIndex+1).padStart(2,'0')+' / '+String(projectPages.length).padStart(2,'0');
 $('raonPrev').disabled=slideBusy||raonSlideIndex===0;
 $('raonNext').disabled=slideBusy||raonSlideIndex===projectPages.length-1;
}
function warmPages(i){for(const j of [i-1,i+1])if(j>=0&&j<projectPages.length)preparePage(j).catch(()=>{})}
async function renderRaonSlide(){
 const epoch=++slideEpoch;slideBusy=true;updatePageNav();
 const media=$('raonReader').querySelector('.raon-reader-media');media.querySelectorAll('.page-turn-copy').forEach(el=>el.remove());
 const image=$('raonSlide');image.getAnimations().forEach(a=>a.cancel());
 try{
  const ready=await preparePage(raonSlideIndex);
  if(epoch!==slideEpoch||!detail.classList.contains('has-slides'))return;
  image.src=ready.src;image.alt=readerTitle+' 포트폴리오 '+(raonSlideIndex+1)+' / '+projectPages.length+' 페이지';
  await image.decode();
  if(epoch!==slideEpoch||!detail.classList.contains('has-slides'))return;
  image.style.visibility='visible';detail.classList.add('slide-loaded');warmPages(raonSlideIndex);
 }catch(err){if(epoch===slideEpoch)detail.classList.remove('slide-loaded')}
 finally{if(epoch===slideEpoch){slideBusy=false;updatePageNav()}}
}
// Project a flexible sheet strip by strip, including perspective along its height.
function turnPaper(canvas,front,back,direction,epoch){
 const media=$('raonSlide').parentElement,W=media.clientWidth,H=media.clientHeight;
 const pad=Math.ceil(Math.max(W,H)*.65),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.ceil((W+2*pad)*dpr);canvas.height=Math.ceil((H+2*pad)*dpr);
 Object.assign(canvas.style,{left:-pad+'px',top:-pad+'px',width:W+2*pad+'px',height:H+2*pad+'px'});
 const g=canvas.getContext('2d'),N=64,cam=Math.max(W*3.5,800);
 // Perspective is anchored at the fixed left binding, not the page centre.
 const project=(x,y,z)=>{const k=cam/(cam-z);return [x*k,H/2+(y-H/2)*k]};
 function triangle(img,s0,s1,s2,d0,d1,d2){
  const ax=s1[0]-s0[0],ay=s1[1]-s0[1],bx=s2[0]-s0[0],by=s2[1]-s0[1],det=ax*by-ay*bx;
  if(Math.abs(det)<1e-9)return;
  const X=d1[0]-d0[0],Y=d1[1]-d0[1],U=d2[0]-d0[0],V=d2[1]-d0[1];
  const A=(X*by-U*ay)/det,B=(Y*by-V*ay)/det,C=(U*ax-X*bx)/det,D=(V*ax-Y*bx)/det;
  g.save();g.beginPath();g.moveTo(...d0);g.lineTo(...d1);g.lineTo(...d2);g.closePath();g.clip();
  g.transform(A,B,C,D,d0[0]-A*s0[0]-C*s0[1],d0[1]-B*s0[0]-D*s0[1]);g.drawImage(img,0,0);g.restore();
 }
 return new Promise(resolve=>{
  const start=performance.now(),duration=1050;
  function frameTurn(now){
   if(epoch!==slideEpoch||phase!=='detail'){resolve(false);return}
   const t=clamp((now-start)/duration),progress=t*t*(3-2*t),q=direction>0?progress:1-progress;
   g.setTransform(dpr,0,0,dpr,pad*dpr,pad*dpr);g.clearRect(-pad,-pad,W+2*pad,H+2*pad);
   // Moving bend travels from the free edge toward the hinge.
   const nodes=[],bend=Math.sin(Math.PI*q),radius=.95;
   let x=0,z=0;
   for(let j=0;j<=N;j++){
    const u=j/N;
    if(j){const v=(j-.5)/N,angle=Math.PI*.5*q+bend*radius*(v-.5);x+=Math.cos(angle)*W/N;z+=Math.sin(angle)*W/N;}
    const xx=x;
    const lift=Math.sin(Math.PI*u)*bend*H*.035;
    nodes.push({u,x:xx,z,top:project(xx,-lift,z),bottom:project(xx,H+lift,z)});
   }
   // Paint the turning sheet over the already decoded next page.
   const strips=Array.from({length:N},(_,j)=>j).sort((a,b)=>nodes[a].z+nodes[a+1].z-nodes[b].z-nodes[b+1].z);
   g.globalAlpha=1;
   for(const j of strips){
    const a=nodes[j],b=nodes[j+1],face=b.x-a.x>=0;
    const img=front,sw=img.naturalWidth,sh=img.naturalHeight;
    const u0=a.u*sw,u1=b.u*sw;
    if(face){
     triangle(img,[u0,0],[u1,0],[u1,sh],a.top,b.top,b.bottom);
     triangle(img,[u0,0],[u1,sh],[u0,sh],a.top,b.bottom,a.bottom);
    }else{
     g.fillStyle='#eee9d9';g.beginPath();g.moveTo(...a.top);g.lineTo(...b.top);g.lineTo(...b.bottom);g.lineTo(...a.bottom);g.closePath();g.fill();
    }
    const shade=Math.min(.23,Math.abs(b.z-a.z)/(W/N)*.16);
    g.fillStyle='rgba(30,42,32,'+shade+')';g.beginPath();g.moveTo(...a.top);g.lineTo(...b.top);g.lineTo(...b.bottom);g.lineTo(...a.bottom);g.closePath();g.fill();
   }
   g.globalAlpha=1;
   if(t<1)requestAnimationFrame(frameTurn);else resolve(true);
  }
  requestAnimationFrame(frameTurn);
 });
}
async function moveRaonSlide(direction){
 if(slideBusy||!detail.classList.contains('has-slides')||phase!=='detail')return;
 const next=clamp(raonSlideIndex+direction,0,projectPages.length-1);if(next===raonSlideIndex)return;
 const epoch=slideEpoch;slideBusy=true;updatePageNav();
 let overlay;
 try{
  const [ready,front]=await Promise.all([preparePage(next),preparePage(raonSlideIndex)]);
  if(epoch!==slideEpoch||phase!=='detail')return;
  const old=$('raonSlide'),media=old.parentElement;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
   overlay=document.createElement('canvas');overlay.className='page-turn-mesh';overlay.setAttribute('aria-hidden','true');media.append(overlay);
   // Keep the old page in place until the first canvas frame is ready.
   const turn=turnPaper(overlay,direction>0?front:ready,direction>0?ready:front,direction,epoch);
   if(direction>0){await new Promise(requestAnimationFrame);old.src=ready.src;await old.decode()}
   if(!await turn)return;
   if(direction<0){old.src=ready.src;await old.decode()}
  }else{old.src=ready.src;await old.decode()}
  if(epoch!==slideEpoch||phase!=='detail')return;
  raonSlideIndex=next;old.alt=readerTitle+' 포트폴리오 '+(next+1)+' / '+projectPages.length+' 페이지';warmPages(next);
 }catch(err){}finally{overlay?.remove();if(epoch===slideEpoch){slideBusy=false;updatePageNav()}}
}
$('raonPrev').addEventListener('click',()=>moveRaonSlide(-1));
$('raonNext').addEventListener('click',()=>moveRaonSlide(1));
$('raonReader').addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'||e.target.closest('button'))return;
 raonTouchStart={x:e.clientX,y:e.clientY};
});
$('raonReader').addEventListener('pointerup',e=>{
 if(!raonTouchStart)return;
 const dx=e.clientX-raonTouchStart.x,dy=e.clientY-raonTouchStart.y;
 raonTouchStart=null;
 if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.3)moveRaonSlide(dx<0?1:-1);
});
let openingRequest=0;
async function open(i,restore=null){
 if(phase!=='explore'||!items[i])return;
 const request=++openingRequest,p=items[i],pages=pagesFor(p),hasPages=pages.length>0;
 const pageIndex=hasPages?clamp(Math.trunc(restore?.pageIndex||0),0,pages.length-1):0;
 let loaded=false;
 if(hasPages){
  try{const ready=await preparePage(pageIndex,pages);if(request!==openingRequest||phase!=='explore')return;const img=$('raonSlide');img.src=ready.src;await img.decode();loaded=true;}catch(err){}
  if(request!==openingRequest||phase!=='explore')return;
 }
 target=focus;wheelAt=0;scrollSpeed=0;selected=i;visited.add(i);velocity=0;
 const m=measure();impactPose=restore?archivePose(i,m):{...poses[i]};impactAnchor=anchorAt(i,m);
 ++slideEpoch;slideBusy=false;projectPages=pages;readerTitle=p.title;
 detail.classList.remove('raon-mode');detail.classList.add('portfolio-mode');detail.classList.toggle('has-slides',hasPages);
 const reader=$('raonReader');reader.hidden=!hasPages;reader.setAttribute('aria-label',p.title+' 포트폴리오 '+pages.length+'페이지');detail.classList.remove('slide-loaded');
 $('category').textContent=p.category||'';
 $('projectTitle').textContent=p.title;
 $('projectDesc').textContent=p.description||'';
 const ph=$('placeholder');ph.replaceChildren();
 if(hasPages){raonSlideIndex=pageIndex;const img=$('raonSlide');if(loaded){img.alt=readerTitle+' 포트폴리오 '+(pageIndex+1)+' / '+pages.length+' 페이지';img.style.visibility='visible';detail.classList.add('slide-loaded');updatePageNav();warmPages(pageIndex)}else renderRaonSlide();}
 else if(p.url){const link=document.createElement('a');link.href=p.url;link.textContent='View project';ph.append(link);}
 openedAt=performance.now();if(restore){setPhase('detail');renderPanel(m,1);detail.setAttribute('aria-hidden','false')}else setPhase('opening');
}
function close(){
 if(phase!=='detail'&&phase!=='opening')return;
 closeFrom=detailProgress(performance.now());detail.classList.remove('visible');
 detail.setAttribute('aria-hidden','true');closingAt=performance.now();setPhase('closing')
}
$('close').onclick=close;function foldBack(){if(phase==='explore'){enterTransition();clearIntroControl();autoUnfold=false;unfoldTarget=0;gate=false;returning=true;}}$('fold').onclick=foldBack;$('foldEdge').onclick=foldBack;
let foldTouch=null;const foldButton=$('fold');
foldButton.addEventListener('contextmenu',e=>{if(touchLayout())e.preventDefault()});
foldButton.addEventListener('pointerdown',e=>{
 if(!touchLayout()||phase!=='explore'||e.isPrimary===false)return;
 e.preventDefault();foldTouch={id:e.pointerId,y:e.clientY,dy:0};foldButton.setPointerCapture(e.pointerId);
 foldButton.classList.add('fold-grabbed');
});
foldButton.addEventListener('pointermove',e=>{
 if(!foldTouch||foldTouch.id!==e.pointerId)return;
 foldTouch.dy=Math.max(0,foldTouch.y-e.clientY);
 foldButton.style.setProperty('--fold-pull',(-Math.min(52,foldTouch.dy*.65))+'px');
});
function finishFold(e){
 if(!foldTouch||foldTouch.id!==e.pointerId)return;
 const commit=e.type==='pointerup'&&foldTouch.dy>=28;
 foldTouch=null;foldButton.classList.remove('fold-grabbed');foldButton.style.removeProperty('--fold-pull');
 if(commit)foldBack();
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])foldButton.addEventListener(type,finishFold);

function step(d){if(phase==='explore'){gate=false;target=clamp(Math.round(target)+d,-1,N-1);wheelAt=0}}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
let wheelAxis=null,wheelDirection=0,returning=false,launchLocked=false;
let hoverArmed=false,hoverHold=false,touchHold=false,releaseBoost=0;
function held(){return !launchLocked&&(hoverHold||touchHold)}
function pauseIntro(){unfoldTarget=unfold;releaseBoost=0}
function resumeIntro(){if(!held()){unfoldTarget=1;releaseBoost=0}}
function clearIntroControl(){hoverArmed=false;hoverHold=false;touchHold=false;releaseBoost=0;}
scene.addEventListener('wheel',e=>{
 if(!['intro','animation','explore'].includes(phase))return;e.preventDefault();
 const now=performance.now(),gap=now-lastWheel;lastWheel=now;
 if(returning||launchLocked)return;
 if(phase==='explore'&&gate){if(gap<120)return;gate=false;}
 const gallery=phase==='explore';
 let delta=gallery?(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY):e.deltaY;
 if(e.deltaMode===1)delta*=16;if(e.deltaMode===2)delta*=innerHeight;
 if(gallery){
  if(!delta)return;
  const direction=Math.sign(delta);
  const fresh=!wheelAt||gap>190;
  if(fresh){scrollSpeed=0;velocity=0;target=focus}
  if(wheelDirection&&direction!==wheelDirection){target=focus;scrollSpeed=0}
  wheelDirection=direction;
  // Unrestricted continuous travel; low-amplitude events remain precise.
  const magnitude=Math.abs(delta),gain=mix(.85,1.15,ease(clamp((magnitude-10)/100)));
  const units=direction*Math.min(2.2,magnitude/105*gain);
  const eventSpeed=units*1000/Math.max(16,Math.min(190,gap));
  // Native trackpad momentum is already in the event stream. Only a small residual coast is added.
  const residual=clamp(eventSpeed*.18,-4.5,4.5);
  scrollSpeed=fresh?0:mix(scrollSpeed,residual,.55);
  wheelAt=now;target=clamp(target+units,-1,N-1);
 }else if(phase==='animation'){
  // Wheel scrubbing shares the same paused playhead as mouse-hover scrubbing.
  if(!delta||touchHold)return;
  if(pick(e)<0){if(hoverHold){hoverHold=false;resumeIntro()}return}
  if(!hoverHold){hoverHold=true;pauseIntro()}
  const range=Math.max(700,measure().viewportH*1.8);
  const step=clamp(delta/range,-.025,.025);
  unfoldTarget=clamp(unfoldTarget+step,Math.max(0,unfold-.04),Math.min(DOWN_END/LAUNCH_END,unfold+.04));
 }else navigate(clamp(delta/105,-1.5,1.5),'y');
},{passive:false});
scene.addEventListener('pointerdown',e=>{
 // Touch gestures during the intro are owned exclusively by the touch handlers below.
 if(e.pointerType==='touch'&&(phase==='intro'||phase==='animation'))return;
 if(phase==='intro'&&e.pointerType==='pen'&&e.isPrimary!==false){e.preventDefault();start();return}
 if(returning||launchLocked||!['intro','animation','explore'].includes(phase)||e.target.closest('#nav')||e.button!==0)return;
 if(phase==='explore'&&wheelAt){wheelAt=0;scrollSpeed=0;wheelDirection=0;target=focus}
 drag={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false,axis:null,lastY:e.clientY,startTarget:target,touch:e.pointerType==='touch'};if(phase==='animation'&&e.pointerType!=='mouse'){touchHold=true;pauseIntro();}velocity=0;lastDragX=e.clientX;lastDragT=performance.now();
});
window.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.axis&&Math.hypot(dx,dy)>7){drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';drag.moved=true;scene.classList.add('dragging')}
 if(!drag.axis||launchLocked||returning)return;
 const now=performance.now(),m=measure();
 if(drag.axis==='y'&&phase==='animation'&&touchHold){unfoldTarget=clamp(unfoldTarget-(e.clientY-drag.lastY)/Math.max(160,m.viewportH*.65),0,1)}else if(drag.axis==='y'&&(mobile()||phase!=='explore'))navigate(-(e.clientY-drag.lastY)/(m.viewportH*.16),'y');
 if(drag.axis==='x'&&phase==='explore'){gate=false;const delta=-(e.clientX-lastDragX)/(drag.touch?clamp(m.trackStep*.52,24,58):Math.max(24,m.trackStep));navigate(delta,'x');const v=delta*1000/Math.max(8,now-lastDragT);velocity=clamp(mix(velocity,v,.65),drag.touch?-30:-5,drag.touch?30:5)}
 drag.lastY=e.clientY;lastDragX=e.clientX;lastDragT=now;
});
function endDrag(e){
 if(!drag||(e&&e.pointerId!==drag.id))return;
 let coast=false;
 if(drag.moved){
  blockClick=performance.now()+350;
  if(drag.axis==='x'&&phase==='explore'){
   if(performance.now()-lastDragT>100||e?.type==='pointercancel')velocity=0;
   const dx=lastDragX-drag.x;
   if(drag.touch&&Math.abs(velocity)>1.8){coast=true;wheelAt=0}
   else{
    let snap=Math.round(target+clamp(velocity*.12,-1,1));
    if(Math.abs(dx)>=12&&snap===Math.round(drag.startTarget))snap=Math.round(drag.startTarget)-Math.sign(dx);
    target=clamp(snap,-1,N-1);
   }
  }
 }
 if(!coast)velocity=0;
 drag=null;
 if(touchHold){touchHold=false;if(phase==='animation'&&!returning)resumeIntro()}
 scene.classList.remove('dragging');
}
// Only actual pointer movement can interrupt automatic playback.
let mousePoint=null;
scene.addEventListener('pointermove',e=>{
 if(e.pointerType!=='mouse'||matchMedia('(hover: none) and (pointer: coarse)').matches)return;
 const prev=mousePoint;mousePoint={clientX:e.clientX,clientY:e.clientY};
 if(phase==='intro'){scene.classList.toggle('intro-card-hover',pick(e)>=0);return}
 if(phase!=='animation'||returning||launchLocked||touchHold||!prev)return;
 const dx=e.clientX-prev.clientX,dy=e.clientY-prev.clientY;
 if(!dx&&!dy)return;
 const hit=pick(e)>=0;
 if(!hit){if(hoverHold){hoverHold=false;resumeIntro()}return}
 if(!hoverHold){hoverHold=true;pauseIntro();return}
 unfoldTarget=clamp(unfoldTarget-dy/Math.max(160,measure().viewportH*.65),0,1);
});
scene.addEventListener('pointerleave',()=>{mousePoint=null;scene.classList.remove('intro-card-hover');if(phase==='animation'&&!launchLocked&&hoverHold){hoverHold=false;resumeIntro()}});
// Native touch ownership: independent of mouse hover, click synthesis, and gallery drag.
let introTouch=null;
scene.addEventListener('touchstart',e=>{
 if(!['intro','animation'].includes(phase)||returning||launchLocked||introTouch||e.target.closest('#nav, #reset, #detail'))return;
 const t=e.changedTouches[0];if(!t)return;
 e.preventDefault();drag=null;hoverHold=false;
 const initial=phase==='intro';
 if(initial)start();
 introTouch={id:t.identifier,y:t.clientY,initial,travel:0};
 if(!initial){touchHold=true;pauseIntro()}
},{passive:false});
window.addEventListener('touchmove',e=>{
 if(!introTouch||phase!=='animation')return;
 const t=Array.from(e.changedTouches).find(v=>v.identifier===introTouch.id);if(!t)return;
 e.preventDefault();
 if(launchLocked||returning)return;
 const dy=t.clientY-introTouch.y;introTouch.y=t.clientY;introTouch.travel+=dy;
 // A first tap starts playback; dragging that same contact also grabs the sheet.
 if(!touchHold){if(Math.abs(introTouch.travel)<5)return;touchHold=true;pauseIntro();return}
 const range=Math.max(600,measure().viewportH*2.0);
 unfoldTarget=clamp(unfoldTarget-dy/range,Math.max(0,unfold-.025),Math.min(DOWN_END/LAUNCH_END,unfold+.025));
},{passive:false});
function finishIntroTouch(e){
 if(!introTouch)return;
 if(!Array.from(e.changedTouches).some(v=>v.identifier===introTouch.id))return;
 if(e.cancelable)e.preventDefault();
 introTouch=null;drag=null;
 if(phase==='animation'&&!returning&&!launchLocked){hoverHold=false;touchHold=false;autoUnfold=true;resumeIntro()}
 else touchHold=false;
}
window.addEventListener('touchend',finishIntroTouch,{passive:false});
window.addEventListener('touchcancel',finishIntroTouch,{passive:false});
window.addEventListener('blur',()=>{if(!introTouch&&!touchHold)return;introTouch=null;drag=null;touchHold=false;hoverHold=false;if(phase==='animation'&&!returning&&!launchLocked){autoUnfold=true;resumeIntro()}});
window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
window.addEventListener('keydown',e=>{if($('contactDialog')?.open)return;if(e.key==='Escape')close();else if(detail.classList.contains('has-slides')&&['detail','opening'].includes(phase)&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();moveRaonSlide(e.key==='ArrowRight'?1:-1)}else if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(['intro','animation','explore'].includes(phase)){e.preventDefault();navigate(e.key==='ArrowDown'?1:-1,'y')}}});
// Persist only the current tab's reading position, not the rendered geometry.
const VIEW_KEY='folio-view-v1';
const itemKey=p=>p?String(p.id||p.year+'|'+p.title):null;
const indexFor=key=>items.findIndex(p=>itemKey(p)===key);
let restoring=true;
function saveView(){
 if(restoring)return;
 const anchor=Math.round(focus),p=items[anchor];
 const state={phase,focus,anchor:itemKey(p),offset:focus-anchor,unfold,returning,selected:itemKey(items[selected]),page:raonSlideIndex,pageUrl:projectPages[raonSlideIndex]||null,visited:[...visited].map(i=>itemKey(items[i])).filter(Boolean)};
 try{sessionStorage.setItem(VIEW_KEY,JSON.stringify(state))}catch(err){}
}
function savedFocus(s){
 if(s.focus<=-0.965)return -1;
 const i=indexFor(s.anchor);
 return clamp(i>=0?i+(Number(s.offset)||0):Number(s.focus)||0,-1,N-1);
}
async function restoreView(){
 let s=null;try{s=JSON.parse(sessionStorage.getItem(VIEW_KEY)||'null')}catch(err){}
 reset();
 if(!s||s.phase==='intro')return;
 focus=target=returnFocus=savedFocus(s);
 if(Array.isArray(s.visited))for(const key of s.visited){const i=indexFor(key);if(i>=0)visited.add(i)}
 if(s.phase==='animation'){
  unfold=clamp(Number(s.unfold)||0);returning=!!s.returning;
  unfoldTarget=returning?0:1;autoUnfold=!returning;launchLocked=!returning&&unfold>=DOWN_END/LAUNCH_END;
  setPhase('animation');cards.forEach(o=>o.card.disabled=true);return;
 }
 unfold=unfoldTarget=1;gate=false;setPhase('explore');$('nav').hidden=false;cards.forEach(o=>o.card.disabled=false);
 for(let i=0;i<N;i++)lift[i]=100*Math.exp(-Math.pow(Math.abs(i-focus)/.60,2));
 if(s.phase==='detail'||s.phase==='opening'){
  const i=indexFor(s.selected);
  if(i>=0){
   focus=target=i;
   for(let j=0;j<N;j++)lift[j]=100*Math.exp(-Math.pow(Math.abs(j-focus)/.60,2));
   const pages=pagesFor(items[i]),byUrl=pages.indexOf(s.pageUrl);
   await open(i,{pageIndex:byUrl>=0?byUrl:Number(s.page)||0});
  }
 }
}
window.addEventListener('pagehide',saveView);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveView()});
restoreView().catch(()=>{}).finally(()=>{restoring=false;last=performance.now();requestAnimationFrame(frame);saveView()});


// Temporary material comparison controls; no changes to project content.
const paperStudy=document.getElementById('paperStudy');
if(paperStudy){const setPaper=value=>{detail.dataset.paper=value;paperStudy.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.paper===value)))};paperStudy.addEventListener('click',e=>{const b=e.target.closest('button[data-paper]');if(b)setPaper(b.dataset.paper)});setPaper('tracing')}

}
