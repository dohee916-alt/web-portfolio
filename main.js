
const $=id=>document.getElementById(id),scene=$('scene'),root=$('layers'),items=window.PROJECTS,dialog=$('detail');
const N=items.length, S=32, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), mix=(a,b,t)=>a+(b-a)*t, ease=t=>{t=clamp(t);return t*t*(3-2*t)}, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>matchMedia('(pointer:coarse), (max-width:600px)').matches;
let phase='intro',startAt=0,focus=Math.floor((N-1)/2),target=focus,hover=false,drag=null,blockClick=0,selected=-1,openedAt=0,closingAt=0,last=performance.now(),lift=[], poses=[];
const cards=[],anchors=[],visited=new Set(),svg=$('curve'),path=svg.querySelector('path');
const detail=$('detail');detail.removeAttribute('open');detail.setAttribute('aria-hidden','true');
function setPhase(p){phase=p;scene.dataset.phase=p;$('fold').hidden=p!=='explore'||focus>-.965||target>-.965}
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
const ctx=surface.getContext('2d');let silhouettes=[],velocity=0,lastDragX=0,lastDragT=0,impactPose=null,impactAnchor=null;const OPEN_MS=1320,CLOSE_MS=780;const HIT=.19,PUSH=.48;let closeFrom=1,wheelAt=0,scrollSpeed=0,lastWheel=0,unfold=0,unfoldTarget=0,returnFocus=0,autoUnfold=false,gate=false;const RANGE=8;
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
 const bent=p.fall>0.0001,L=[],R=[],rad=Math.PI/180,ry=p.ry*rad,rz=p.rz*rad,cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 let yy=0,zz=0;
 const convert=(x,y,z)=>{x*=p.scale;y*=p.scale;z*=p.scale;const a=x*cz-y*sz,b=x*sz+y*cz,v=project(p.x+a*cy+z*sy,p.y+b,p.z-a*sy+z*cy,m);v[1]+=z*.65;return v};
 L.push(convert(-m.w/2,yy,zz));R.push(convert(m.w/2,yy,zz));
 if(bent){
  // Two actual paper faces meet at a crease: the lower face folds first.
  const lower=Math.PI*.5*ease(clamp(p.fall*1.65)),upper=Math.PI*.5*ease(clamp((p.fall-.25)/.75)),crease=.46;
  yy-=Math.cos(lower)*m.h*crease;zz+=Math.sin(lower)*m.h*crease;
  L.push(convert(-m.w/2,yy,zz));R.push(convert(m.w/2,yy,zz));
  yy-=Math.cos(upper)*m.h*(1-crease);zz+=Math.sin(upper)*m.h*(1-crease);
 }else yy=-m.h;
 L.push(convert(-m.w/2,yy,zz));R.push(convert(m.w/2,yy,zz));
 return {i,L,R,bent,p,poly:L.concat(R.slice().reverse())}
}
function shape(poly){ctx.beginPath();if(poly.length===4){for(let i=0;i<4;i++){const p=poly[(i+3)%4],q=poly[i],r=poly[(i+1)%4],a=Math.min(2.5,Math.hypot(q[0]-p[0],q[1]-p[1])*.035),b=Math.min(2.5,Math.hypot(r[0]-q[0],r[1]-q[1])*.035),da=Math.hypot(q[0]-p[0],q[1]-p[1])||1,db=Math.hypot(r[0]-q[0],r[1]-q[1])||1,x=q[0]+(p[0]-q[0])*a/da,y=q[1]+(p[1]-q[1])*a/da;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);ctx.quadraticCurveTo(q[0],q[1],q[0]+(r[0]-q[0])*b/db,q[1]+(r[1]-q[1])*b/db)}}else poly.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath()}
function opticalRender(m){
 // Render on the entire scene, not just the lower world layout box.
 const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(m.W*dpr),h=Math.round(m.viewportH*dpr);
 if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h}
 surface.style.top=(-m.topInset)+'px';surface.style.width=m.W+'px';surface.style.height=m.viewportH+'px';
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
 ctx.setTransform(dpr,0,0,dpr,0,m.topInset*dpr);
 silhouettes=poses.map((p,i)=>mesh(p,m,i)).sort((a,b)=>{
  if(phase==='animation'){const rank=s=>s.p.fall>0&&s.p.fall<1?2:s.p.fall===0?1:0;return rank(a)-rank(b)||a.p.z-b.p.z}
  return (a.p.z+(a.i===selected?500:0))-(b.p.z+(b.i===selected?500:0));
 });
 for(const s of silhouettes){const {p,L,R,bent,poly}=s;if(p.opacity<.01)continue;
  ctx.save();ctx.globalAlpha=p.opacity;
   const g=ctx.createLinearGradient(L[0][0],L[0][1],R[R.length-1][0],R[R.length-1][1]);
   g.addColorStop(0,'rgba(253,252,245,.52)');g.addColorStop(.28,'rgba(247,248,240,.38)');g.addColorStop(.72,'rgba(250,250,242,.42)');g.addColorStop(1,'rgba(238,243,234,.47)');
   const paintFace=(face,tint)=>{
    ctx.beginPath();face.forEach((q,j)=>j?ctx.lineTo(...q):ctx.moveTo(...q));ctx.closePath();
    ctx.fillStyle=g;ctx.shadowColor='rgba(49,65,60,.09)';ctx.shadowBlur=8;ctx.shadowOffsetY=4;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    if(tint){ctx.fillStyle=tint;ctx.fill()}
    ctx.save();ctx.clip();ctx.globalAlpha=p.opacity*.4;ctx.fillStyle=paperGrain;ctx.fillRect(0,-m.topInset,m.W,m.viewportH);ctx.restore();
    ctx.strokeStyle='rgba(247,248,239,.64)';ctx.lineWidth=.8;ctx.stroke();
   };
   if(bent){
    const strength=Math.sin(Math.PI*p.fall);
    paintFace([L[1],R[1],R[2],L[2]],'rgba(33,67,48,'+(strength*.11)+')');
    paintFace([L[0],R[0],R[1],L[1]],'rgba(255,253,241,'+(strength*.29)+')');
    ctx.beginPath();ctx.moveTo(...L[1]);ctx.lineTo(...R[1]);ctx.strokeStyle='rgba(44,71,50,'+(strength*.42)+')';ctx.lineWidth=1.1;ctx.stroke();
   }else{shape(poly);ctx.fillStyle=g;ctx.shadowColor='rgba(49,65,60,.09)';ctx.shadowBlur=8;ctx.shadowOffsetY=4;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.save();shape(poly);ctx.clip();ctx.globalAlpha=p.opacity*.4;ctx.fillStyle=paperGrain;ctx.fillRect(0,-m.topInset,m.W,m.viewportH);ctx.restore();ctx.strokeStyle='rgba(247,248,239,.64)';ctx.lineWidth=.8;shape(poly);ctx.stroke()}
   ctx.beginPath();if(R.length===2){const a=R[0],b=R[1];ctx.moveTo(mix(a[0],b[0],.035),mix(a[1],b[1],.035));ctx.lineTo(mix(a[0],b[0],.965),mix(a[1],b[1],.965))}else R.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.strokeStyle='rgba(102,117,104,.18)';ctx.lineWidth=.7;ctx.stroke();ctx.restore()
 }
}
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function pick(e){const r=root.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(let j=silhouettes.length-1;j>=0;j--){let s=silhouettes[j];if(s.p.opacity>.3&&(s.bent?(inside(x,y,[s.L[0],s.R[0],s.R[1],s.L[1]])||inside(x,y,[s.L[1],s.R[1],s.R[2],s.L[2]])):inside(x,y,s.poly)))return s.i}return -1}
scene.addEventListener('click',e=>{if(phase==='intro'){if(performance.now()>=blockClick&&pick(e)>=0)start();return}if(phase!=='explore'||performance.now()<blockClick||e.target.closest('.anchor, #nav, #reset, #detail, .heading'))return;const i=pick(e);if(i<0)return;if(i!==Math.round(focus)){target=i;wheelAt=0;return}open(i)});

function measure(){const r=root.getBoundingClientRect(),s=scene.getBoundingClientRect();const w=mobile()?Math.min(r.width*.43,185):Math.min(r.width*.19,260);return {W:r.width,H:r.height,w,h:w*(9.5/7),topInset:r.top-s.top,viewportH:s.height}}
function introPose(i,m){return {x:m.W*.5,y:m.H*.8,z:-i*12,ry:0,rz:0,fall:0,opacity:1,scale:1.15}}
// Reference composition: ascending convex arc, cards hanging below their anchors.
// A single continuous arc, shared by the entire stack and its timeline.
// The stack opens onto a shallow continuous curved track.
function anchorAt(i,m,f=focus){
 const t=.5+(i-f)*(mobile()?.34:.84/(N-1));
 const x=m.W*t;
 // The reference's steep lower-left to almost horizontal upper-right arc.
 const q=t, y=m.viewportH*(.15+.62*Math.pow(1-q,2))-m.topInset;
 return {x,y};
}
// Exact projection of the top midpoint for upright sheets; no iterative mesh calculations.
function topCenter(p,m){const ry=p.ry*Math.PI/180,rz=p.rz*Math.PI/180,a=m.h*p.scale*Math.sin(rz),b=-m.h*p.scale*Math.cos(rz);const z=p.z-a*Math.sin(ry);const v=project(p.x+a*Math.cos(ry),p.y+b,z,m);return {x:v[0],y:v[1]}}
function alignTop(p,m,i,x,y){const e=topCenter(p,m),ry=p.ry*Math.PI/180,rz=p.rz*Math.PI/180,z=p.z-m.h*p.scale*Math.sin(rz)*Math.sin(ry),camera=Math.max(780,m.W*1.05),k=camera/Math.max(180,camera-z);p.x+=(x-e.x)/k;p.y+=(y-e.y)/k;return p}
// A single impact transfers velocity to the circle. It flies independently.
function flight(u,m){
 const t=clamp((u-HIT)/(PUSH-HIT)),s=1-Math.pow(1-t,3);
 const y0=impactAnchor.y+5, room=y0+m.topInset-38;
 const rise=Math.max(0,Math.min(m.viewportH*.19,155,room));
 const dx=clamp(m.W*.065,24,90);
 const sign=impactAnchor.x>m.W*.80?-1:1;
 return {x:impactAnchor.x+sign*dx*s,y:y0-rise*s+Math.sin(Math.PI*t)*-Math.min(12,rise*.08)};
}
function currentDot(u,m){return flight(u,m)}
// Codrops 3DStackMotion: coherent group orientation and successive depth offsets.
 // Keep the planes parallel, like the supplied blue bank-card reference.
// Common track geometry, continuous through the intro-to-gallery handoff.
function archivePose(i,m,f=focus,amount=1){
 const d=i-f,t=clamp(.5+d*.84/(N-1)),a=anchorAt(i,m,f),size=mobile()?1.04:.96;
 const p={x:a.x,y:a.y+m.h,z:mobile()?-Math.abs(d)*38:55+t*105+lift[i]*.35*amount,ry:mobile()?(-30+clamp(d,-2,2)*11):(-38+t*14),rz:mobile()?-17:-24+t*12,fall:0,opacity:mobile()?clamp(1-(Math.abs(d)-1.35)*.55):clamp(1-(Math.abs(d)-4.1)*.65),scale:size};
 return alignTop(p,m,i,a.x+Math.min(m.w*.16,25),a.y+Math.max(35,88-lift[i]*amount*.48));
}
function panelTarget(m){
 const W=m.W,H=m.viewportH;
 return mobile()?{x:18,y:H*.52,w:W-36,h:H*.43}:{x:W*.56,y:H*.20,w:W*.365,h:H*.62};
}
function detailProgress(now){return phase==='closing'?closeFrom*(1-clamp((now-closingAt)/CLOSE_MS)):phase==='detail'?1:clamp((now-openedAt)/OPEN_MS)}
function renderPanel(m,u){
 if(detail.classList.contains('raon-mode')){
  detail.classList.toggle('morphing',u>.35);
  detail.classList.toggle('content-ready',u>.53);
  detail.classList.toggle('visible',phase==='detail');
  return;
 }
 if(!impactAnchor||u<PUSH){detail.classList.remove('morphing','visible','content-ready');return}
 const t=ease(clamp((u-PUSH)/(.94-PUSH))),dest=panelTarget(m),r=7,dot=currentDot(PUSH,m);
 // Keep the launch point inside the growing surface: first open the mouth,
 // then unfurl the entire reading area from that point.
 const w=mix(r*2,dest.w,t),h=mix(r*2,dest.h,ease(clamp((u-PUSH-.025)/(.92-PUSH-.025))));
 const x=mix(dot.x-r,dest.x,t),y=mix(dot.y+m.topInset-r,dest.y,t);
 detail.style.left=x+'px';detail.style.top=y+'px';detail.style.width=w+'px';detail.style.height=h+'px';detail.style.borderRadius=mix(r,20,t)+'px';
 const ox=clamp(dot.x-x,0,w),oy=clamp(dot.y+m.topInset-y,0,h);
 detail.style.setProperty('--origin-x',ox+'px');detail.style.setProperty('--origin-y',oy+'px');
 detail.style.setProperty('--reveal',String(ease(clamp((u-.56)/.38))));
 detail.classList.add('morphing');detail.classList.toggle('content-ready',u>.58);detail.classList.toggle('visible',phase==='detail');
}
function between(a,b,t){const o={};for(const k in a)o[k]=mix(a[k],b[k],t);return o}
function drawSheet(obj,p,m,i){const {card,strips}=obj;card.style.width=m.w+'px';card.style.height=m.h+'px';card.style.transform='translate3d('+ (p.x-m.w/2)+'px,'+(p.y-m.h)+'px,'+p.z+'px) rotateY('+p.ry+'deg) rotateZ('+p.rz+'deg) scale('+p.scale+')';card.style.opacity=p.opacity;card.style.zIndex=String(Math.round(100+p.z+(selected===i&&phase!=='explore'?500:0)));

}
const FALL_STAGGER=.42,FALL_DURATION=.44,DOWN_END=(N-2)*FALL_STAGGER+FALL_DURATION,LAUNCH_START=DOWN_END+.22,LAUNCH_END=LAUNCH_START+1.35,AUTO_DURATION=reduced?.45:Math.max(3.2,LAUNCH_END*1.12);
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;const m=measure();if(phase==='explore'&&!drag&&mobile()&&Math.abs(velocity)>.015){target=clamp(target+velocity*dt,-1,N-1);velocity*=Math.exp(-dt*10);if(Math.abs(velocity)<.1){velocity=0;target=Math.round(target)}}if(phase==='explore'&&!mobile()&&wheelAt&&now-wheelAt>125){const remaining=target-focus;target=clamp(Math.round(target+(Math.abs(remaining)>.03?Math.sign(remaining)*Math.min(.28,Math.abs(scrollSpeed)*.045):0)),-1,N-1);wheelAt=0;scrollSpeed=0}focus=mix(focus,target,1-Math.exp(-dt*(drag?35: wheelAt?19:12)));if(Math.abs(focus-target)<.001)focus=target;
 if(phase==='animation'){if(returning)unfold=Math.max(0,unfold-dt/LAUNCH_END);else if(autoUnfold&&!hoverScrubbing&&!holdScrubbing){unfold=Math.min(1,unfold+dt*autoRate/AUTO_DURATION);unfoldTarget=unfold}else{unfold=mix(unfold,unfoldTarget,1-Math.exp(-dt*32));if(Math.abs(unfoldTarget-unfold)<.001)unfold=unfoldTarget}}
 if(phase==='animation'&&unfold===0&&unfoldTarget===0&&!hoverScrubbing&&!holdScrubbing){returning=false;autoUnfold=false;lastWheel=performance.now();setPhase('intro');$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'위로 드래그하여 레이어를 펼치세요.':'스크롤하여 레이어를 펼치세요.';$('nav').hidden=true;cards.forEach((o,i)=>o.card.disabled=i!==0)}
 if(phase==='animation'&&unfold===1&&unfoldTarget===1){autoUnfold=false;hoverScrubbing=false;holdScrubbing=false;gate=true;lastWheel=performance.now();setPhase('explore');unfold=unfoldTarget=1;$('nav').hidden=false;$('hint').textContent=mobile()?'좌우로 탐색 · 아래로 드래그하여 접기':'스크롤하여 탐색';$('eyebrow').textContent='02 / EXPLORE';$('headline').textContent='';cards.forEach(o=>o.card.disabled=false)}
 const time=unfold*LAUNCH_END;const archive=phase==='explore'||phase==='opening'||phase==='detail'||phase==='closing';
 const active=archive||phase==='animation'&&unfold*LAUNCH_END>=LAUNCH_START;
 for(let i=0;i<N;i++){const d=i-focus;const want=active?100*Math.exp(-Math.pow(Math.abs(d)/.60,2)):0;lift[i]=phase==='animation'?want:mix(lift[i],want,1-Math.exp(-dt*14))}
 let points=[];
 for(let i=0;i<N;i++){
  let p=introPose(i,m);
  if(phase==='animation'){
   if(i<N-1){
    const fall=ease((time-i*FALL_STAGGER)/FALL_DURATION);
    p.fall=fall;p.y+=p.fall*(N-1-i)*2;p.z+=p.fall*(N-1-i)*3;
   }
   if(time>=LAUNCH_START){const t=clamp((time-LAUNCH_START)/1.35),q=ease(t);const dest=archivePose(i,m,focus,1);p=between(p,dest,q);p.y-=Math.sin(Math.PI*t)*m.H*.24;p.z+=Math.sin(Math.PI*t)*45}
  }else if(archive){
   p=archivePose(i,m);
   if(selected>=0&&(phase==='opening'||phase==='detail'||phase==='closing')){
    const u=detailProgress(now),hit=impactAnchor||anchorAt(selected,m);
    if(i===selected){
     const start=impactPose||p;
     const contact=alignTop({...start},m,i,hit.x,hit.y+12);
     if(u<HIT){
      const q=clamp(u/HIT);p=between(start,contact,q*q*q);
     }else{
      // Recoil, then peel away: the dot has its own much faster trajectory.
      const t=clamp((u-HIT)/(1-HIT)),q=1-Math.pow(1-t,3);
      const dest={...p,x:m.W*(mobile()?.5:.27),y:m.viewportH*(mobile()?.48:.78)-m.topInset,z:120,ry:-13,rz:-7,scale:mobile()?1.10:1.26,opacity:1};
      p=between(contact,dest,q);
       if(items[i].title==='라온이음')p.opacity*=1-ease(clamp((t-.12)/.58));
      p.y+=Math.sin(Math.PI*clamp(t/.24))*Math.min(24,m.H*.045)*(t<.24?1:0);
     }
    }else{const q=ease(clamp((u-.24)/.55));p.y-=q*m.viewportH*.035;p.opacity*=1-q*.83}
   }
  }
  poses[i]=p;cards[i].card.classList.toggle('selected',selected===i&&phase!=='explore');drawSheet(cards[i],p,m,i);
  const base=selected===i&&impactAnchor?impactAnchor:anchorAt(i,m);const a=anchors[i];const ax=base.x,ay=base.y;points.push([ax,ay+5]);
  a.style.left=ax+'px';a.style.top=ay+'px';a.style.visibility=ax<20||ax>m.W-20?'hidden':'visible';a.classList.toggle('active',Math.abs(i-focus)<.5);a.classList.toggle('visited',visited.has(i));a.classList.toggle('picked',selected===i);a.disabled=phase!=='explore';
  const u=selected===i&&phase!=='explore'?detailProgress(now):0;
  const flying=selected===i&&impactAnchor&&u>=HIT;
  const dot=flying?currentDot(u,m):null;
  a.classList.toggle('absorbed',selected===i&&u>=PUSH);
  a.style.setProperty('--bump',dot?(dot.y-(ay+5))+'px':'0px');
  a.style.setProperty('--fly-x',dot?(dot.x-ax)+'px':'0px');
  const squash=flying?1+.32*Math.sin(Math.PI*clamp((u-HIT)/.09)):1;
  a.style.setProperty('--dot-stretch',String(squash));
  if(selected===i&&u>=HIT&&u<PUSH){a.style.visibility='visible'}

 }
 opticalRender(m);
 svg.setAttribute('viewBox','0 0 '+m.W+' '+m.H);const a0=phase==='explore'&&focus<-.965?anchorAt(-1,m,focus+1.65):anchorAt(0,m),a1=anchorAt(N-1,m),midX=(a0.x+a1.x)/2,midY=(a0.y+a1.y)/2-m.viewportH*.62*Math.pow((a1.x-a0.x)/m.W,2)/2;path.setAttribute('d', 'M '+a0.x+' '+(a0.y+5)+' Q '+midX+' '+(midY+5)+' '+a1.x+' '+(a1.y+5));
 const back=$('fold'),ba=anchorAt(-1,m,focus+1.65),br=root.getBoundingClientRect();back.hidden=phase!=='explore'||focus>-.965||target>-.965;back.style.left=(br.left+ba.x)+'px';back.style.top=(br.top+ba.y+5)+'px';const tangent=Math.atan2(midY-a0.y,midX-a0.x)*180/Math.PI;back.style.setProperty('--back-angle',tangent+'deg');$('counter').textContent=(Math.max(0,Math.round(focus)+1))+' / '+N;$('prev').disabled=target<=-1;$('next').disabled=target>=N-1;
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
 if(phase==='intro'||phase==='explore'){autoUnfold=phase==='intro';autoRate=1;hoverScrubbing=holdScrubbing=false;setPhase('animation');cards.forEach(o=>o.card.disabled=true);$('nav').hidden=true}
 scene.classList.remove('intro-card-hover');
}
function start(){if(phase!=='intro')return;enterTransition();target=focus=returnFocus}
function navigate(delta,axis='y'){
 if(returning)return;
 if(!delta||!['intro','animation','explore'].includes(phase))return;
 if(axis==='x'){
  if(phase==='explore')target=clamp(target+delta,-1,N-1);
  return;
 }
 if(phase==='explore'){if(delta>=0)return;enterTransition()}
 if(phase==='intro'){if(delta<0)return;enterTransition();target=focus=returnFocus}
 if(phase==='animation'){unfold=unfoldTarget=clamp(unfoldTarget+delta/(RANGE*.72));if(!autoUnfold&&unfold>=LAUNCH_START/LAUNCH_END)autoUnfold=true}
}
function reset(){gate=false;autoUnfold=false;hoverScrubbing=holdScrubbing=false;clearTimeout(holdTimer);unfold=unfoldTarget=0;returnFocus=Math.floor((N-1)/2);velocity=0;wheelAt=0;scrollSpeed=0;lastWheel=0;selected=-1;impactPose=null;impactAnchor=null;detail.classList.remove('visible','morphing','content-ready');detail.setAttribute('aria-hidden','true');setPhase('intro');scene.classList.remove('intro-card-hover');cards.forEach((o,i)=>o.card.disabled=i!==0);$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'위로 드래그하여 레이어를 펼치세요.':'스크롤하여 레이어를 펼치세요.';$('nav').hidden=true;hover=false;target=focus=Math.floor((N-1)/2);lift.fill(0)}

const RAON_SLIDES=Array.from({length:6},(_,i)=>'./assets/raon/'+(i+1)+'.jpg');
let raonSlideIndex=0,raonTouchStart=null;
function renderRaonSlide(){
 const image=$('raonSlide');
 image.src=RAON_SLIDES[raonSlideIndex];
 image.alt='라온이음 포트폴리오 '+(raonSlideIndex+1)+' / 6 페이지';
 image.onerror=()=>{image.style.visibility='hidden';$('raonCount').textContent='이미지 파일 미등록 · '+String(raonSlideIndex+1).padStart(2,'0')+' / 06';};
 image.onload=()=>{image.style.visibility='visible';};
 $('raonCount').textContent=String(raonSlideIndex+1).padStart(2,'0')+' / 06';
 $('raonPrev').disabled=raonSlideIndex===0;
 $('raonNext').disabled=raonSlideIndex===RAON_SLIDES.length-1;
}
function moveRaonSlide(direction){
 if(!detail.classList.contains('raon-mode')||!['detail','opening'].includes(phase))return;
 const next=clamp(raonSlideIndex+direction,0,RAON_SLIDES.length-1);
 if(next===raonSlideIndex)return;
 raonSlideIndex=next;
 const img=$('raonSlide');img.classList.remove('page-enter');void img.offsetWidth;img.classList.add('page-enter');
 renderRaonSlide();
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
function open(i){
 if(phase!=='explore')return;
 target=focus;wheelAt=0;scrollSpeed=0;selected=i;visited.add(i);velocity=0;
 impactPose={...poses[i]};impactAnchor=anchorAt(i,measure());
 const p=items[i],isRaon=p.title==='라온이음';
 detail.classList.toggle('raon-mode',isRaon);
 $('raonReader').hidden=!isRaon;
 $('category').textContent=p.category;
 $('projectTitle').textContent=p.title;
 $('projectDesc').textContent=p.description;
 const ph=$('placeholder');ph.replaceChildren();
 if(isRaon){raonSlideIndex=0;renderRaonSlide();}
 else if(p.url){const link=document.createElement('a');link.href=p.url;link.textContent='View project';ph.append(link);}
 openedAt=performance.now();setPhase('opening');
}
function close(){
 if(phase!=='detail'&&phase!=='opening')return;
 closeFrom=detailProgress(performance.now());detail.classList.remove('visible');
 detail.setAttribute('aria-hidden','true');closingAt=performance.now();setPhase('closing')
}
$('close').onclick=close;$('fold').onclick=()=>{if(phase==='explore'){enterTransition();unfoldTarget=0;gate=false;returning=true;}};
function step(d){if(phase==='explore'){gate=false;target=clamp(Math.round(target)+d,-1,N-1);wheelAt=0}}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
let wheelAxis=null,returning=false,hoverScrubbing=false,holdScrubbing=false,holdTimer=0,hoverX=null,hoverY=null,autoRate=1;
function pauseUnfold(){autoUnfold=false;unfoldTarget=unfold}
function resumeUnfold(){if(phase==='animation'&&!returning&&!hoverScrubbing&&!holdScrubbing){autoRate=1.45;autoUnfold=true}}
scene.addEventListener('wheel',e=>{
 if(!['intro','animation','explore'].includes(phase))return;e.preventDefault();
 const now=performance.now(),gap=now-lastWheel;lastWheel=now;
 if(returning)return;
 if(phase==='explore'&&gate){if(gap<220)return;gate=false;}
 const gallery=phase==='explore';
 let delta=gallery?(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY):-e.deltaY;
 if(e.deltaMode===1)delta*=16;if(e.deltaMode===2)delta*=innerHeight;
 const units=clamp(delta/105,-1.5,1.5);
 if(gallery){scrollSpeed=mix(scrollSpeed,units*1000/Math.max(16,gap),.35);wheelAt=now}
 navigate(units,gallery?'x':'y');
},{passive:false});
scene.addEventListener('pointerdown',e=>{
 if(returning||!['intro','animation','explore'].includes(phase)||e.target.closest('#nav')||e.button!==0)return;
 drag={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false,axis:null,lastY:e.clientY};velocity=0;lastDragX=e.clientX;lastDragT=performance.now();
 if(phase==='animation'&&pick(e)>=0){
  if(e.pointerType==='mouse'){holdScrubbing=true;pauseUnfold()}
  else holdTimer=setTimeout(()=>{if(drag?.id===e.pointerId&&phase==='animation'){holdScrubbing=true;pauseUnfold()}},180);
 }
});
window.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.axis&&Math.hypot(dx,dy)>7){drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';drag.moved=true;scene.classList.add('dragging')}
 if(!drag.axis||returning)return;
 const now=performance.now(),m=measure();
 if(phase==='animation'&&drag.axis==='y'){clearTimeout(holdTimer);if(!holdScrubbing){holdScrubbing=true;pauseUnfold()}unfoldTarget=clamp(unfoldTarget-(e.clientY-drag.lastY)/(m.viewportH*.65))}
 else if(drag.axis==='y'&&(mobile()||phase!=='explore'))navigate(-(e.clientY-drag.lastY)/(m.viewportH*.16),'y');
 if(drag.axis==='x'&&phase==='explore'){gate=false;const delta=-(e.clientX-lastDragX)/(m.W*.25);navigate(delta,'x');velocity=clamp(mix(velocity,delta*1000/Math.max(8,now-lastDragT),.45),-5,5)}
 drag.lastY=e.clientY;lastDragX=e.clientX;lastDragT=now;
});
function endDrag(){clearTimeout(holdTimer);if(!drag)return;if(drag.moved){blockClick=performance.now()+350;if(drag.axis==='x'&&phase==='explore'){if(performance.now()-lastDragT>90)velocity=0;target=clamp(Math.round(target+clamp(velocity*.12,-1,1)),-1,N-1)}velocity=0}drag=null;holdScrubbing=false;resumeUnfold();scene.classList.remove('dragging')}
scene.addEventListener('pointermove',e=>{
 if(e.pointerType!=='mouse')return;
 if(phase==='intro'){scene.classList.toggle('intro-card-hover',pick(e)>=0);hoverX=e.clientX;hoverY=e.clientY;return}
 if(phase!=='animation'||returning||drag)return;
 if(hoverX===null){hoverX=e.clientX;hoverY=e.clientY;return}
 const overCard=pick(e)>=0;
 if(hoverScrubbing&&!overCard){hoverScrubbing=false;resumeUnfold()}
 else if(overCard){
  if(!hoverScrubbing&&hoverX!==null&&Math.hypot(e.clientX-hoverX,e.clientY-hoverY)>5){hoverScrubbing=true;pauseUnfold()}
  if(hoverScrubbing)unfoldTarget=clamp(unfoldTarget+(hoverY-e.clientY)/(measure().viewportH*.65));
 }
 if(hoverScrubbing||!overCard){hoverX=e.clientX;hoverY=e.clientY}
});
scene.addEventListener('pointerleave',()=>{scene.classList.remove('intro-card-hover');hoverScrubbing=false;hoverX=hoverY=null;resumeUnfold()});
window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
window.addEventListener('keydown',e=>{if(e.key==='Escape')close();else if(detail.classList.contains('raon-mode')&&['detail','opening'].includes(phase)&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();moveRaonSlide(e.key==='ArrowRight'?1:-1)}else if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(['intro','animation','explore'].includes(phase)){e.preventDefault();navigate(e.key==='ArrowDown'?1:-1,'y')}}});
reset();requestAnimationFrame(frame);

