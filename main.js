
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
function project(x,y,z,m){const camera=Math.max(780,m.W*1.05),k=camera/Math.max(180,camera-z);return [m.W*.5+(x-m.W*.5)*k,m.H*.4+(y-m.H*.4)*k,z]}
function mesh(p,m,i){
 const rows=p.fall>0.0001?64:1, L=[],R=[],rad=Math.PI/180,ry=p.ry*rad,rz=p.rz*rad,cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 let yy=0,zz=0;
 const convert=(x,y,z)=>{x*=p.scale;y*=p.scale;z*=p.scale;const a=x*cz-y*sz,b=x*sz+y*cz;return project(p.x+a*cy+z*sy,p.y+b,p.z-a*sy+z*cy,m)};
 for(let j=0;j<=rows;j++){
  if(j){const u=(j-.5)/rows,t=p.fall;const a=Math.PI*.5*ease(clamp(t*1.7+u*.7-.7))+Math.sin(Math.PI*t)*Math.sin(Math.PI*u)*.68;yy-=Math.cos(a)*m.h/rows;zz+=Math.sin(a)*m.h/rows}
  L.push(convert(-m.w/2,yy,zz));R.push(convert(m.w/2,yy,zz))
 }
 return {i,L,R,p,poly:L.concat(R.slice().reverse())}
}
function shape(poly){ctx.beginPath();if(poly.length===4){for(let i=0;i<4;i++){const p=poly[(i+3)%4],q=poly[i],r=poly[(i+1)%4],a=Math.min(10,Math.hypot(q[0]-p[0],q[1]-p[1])*.12),b=Math.min(10,Math.hypot(r[0]-q[0],r[1]-q[1])*.12),da=Math.hypot(q[0]-p[0],q[1]-p[1])||1,db=Math.hypot(r[0]-q[0],r[1]-q[1])||1,x=q[0]+(p[0]-q[0])*a/da,y=q[1]+(p[1]-q[1])*a/da;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);ctx.quadraticCurveTo(q[0],q[1],q[0]+(r[0]-q[0])*b/db,q[1]+(r[1]-q[1])*b/db)}}else poly.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath()}
function opticalRender(m){
 // Render on the entire scene, not just the lower world layout box.
 const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(m.W*dpr),h=Math.round(m.viewportH*dpr);
 if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h}
 surface.style.top=(-m.topInset)+'px';surface.style.width=m.W+'px';surface.style.height=m.viewportH+'px';
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
 ctx.setTransform(dpr,0,0,dpr,0,m.topInset*dpr);
 silhouettes=poses.map((p,i)=>mesh(p,m,i)).sort((a,b)=>(a.p.z+(a.i===selected?500:0))-(b.p.z+(b.i===selected?500:0)));
 for(const s of silhouettes){const {p,L,R,poly}=s;if(p.opacity<.01)continue;
  ctx.save();ctx.globalAlpha=p.opacity;shape(poly);
  const g=ctx.createLinearGradient(L[0][0]-30,L[0][1],R[R.length-1][0]+30,R[R.length-1][1]);
  g.addColorStop(0,'rgba(239,252,255,.60)');g.addColorStop(.19,'rgba(195,226,243,.20)');g.addColorStop(.48,'rgba(88,145,191,.17)');g.addColorStop(.78,'rgba(225,247,255,.49)');g.addColorStop(1,'rgba(99,158,201,.35)');
  ctx.fillStyle=g;ctx.shadowColor='rgba(45,87,125,.11)';ctx.shadowBlur=16;ctx.shadowOffsetY=8;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle='rgba(250,255,255,.88)';ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();if(R.length===2){const a=R[0],b=R[1];ctx.moveTo(mix(a[0],b[0],.035),mix(a[1],b[1],.035));ctx.lineTo(mix(a[0],b[0],.965),mix(a[1],b[1],.965))}else R.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.strokeStyle='rgba(76,117,155,.42)';ctx.lineWidth=1.6;ctx.stroke();
  // A broad, continuous highlight follows the curved sheet, without segment seams.
  ctx.save();shape(poly);ctx.clip();const a=L[Math.floor((L.length-1)*.6)],b=R[Math.floor((R.length-1)*.6)];
  const shimmer=ctx.createLinearGradient(a[0]-18,a[1]-35,b[0]+18,b[1]+35);shimmer.addColorStop(0,'#ffffff00');shimmer.addColorStop(.52,'#ffffff31');shimmer.addColorStop(1,'#ffffff00');ctx.fillStyle=shimmer;ctx.fillRect(0,-m.topInset,m.W,m.viewportH);ctx.restore();ctx.restore()
 }
}
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function pick(e){const r=root.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(let j=silhouettes.length-1;j>=0;j--){let s=silhouettes[j];if(s.p.opacity>.3&&inside(x,y,s.poly))return s.i}return -1}
scene.addEventListener('click',e=>{if(phase==='intro'){if(performance.now()>=blockClick&&pick(e)>=0)start();return}if(phase!=='explore'||performance.now()<blockClick||e.target.closest('.anchor, #nav, #reset, #detail, .heading'))return;const i=pick(e);if(i<0)return;if(i!==Math.round(focus)){target=i;wheelAt=0;return}open(i)});

function measure(){const r=root.getBoundingClientRect(),s=scene.getBoundingClientRect();const w=mobile()?Math.min(r.width*.43,185):Math.min(r.width*.21,290);return {W:r.width,H:r.height,w,h:w*1.32,topInset:r.top-s.top,viewportH:s.height}}
function introPose(i,m){return {x:m.W*.5,y:m.H*.8,z:-i*12,ry:0,rz:0,fall:0,opacity:1,scale:1}}
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
const FALL_STAGGER=.12,FALL_DURATION=.68,DOWN_END=(N-2)*FALL_STAGGER+FALL_DURATION,LAUNCH_START=DOWN_END+.22,LAUNCH_END=LAUNCH_START+1.35;
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;const m=measure();if(phase==='explore'&&!drag&&mobile()&&Math.abs(velocity)>.015){target=clamp(target+velocity*dt,-1,N-1);velocity*=Math.exp(-dt*10);if(Math.abs(velocity)<.1){velocity=0;target=Math.round(target)}}if(phase==='explore'&&!mobile()&&wheelAt&&now-wheelAt>125){const remaining=target-focus;target=clamp(Math.round(target+(Math.abs(remaining)>.03?Math.sign(remaining)*Math.min(.28,Math.abs(scrollSpeed)*.045):0)),-1,N-1);wheelAt=0;scrollSpeed=0}focus=mix(focus,target,1-Math.exp(-dt*(drag?35: wheelAt?19:12)));if(Math.abs(focus-target)<.001)focus=target;
 if(phase==='animation'){if(returning)unfold=Math.max(0,unfold-dt/LAUNCH_END);else if(launchLocked){unfold=Math.min(1,unfold+dt/LAUNCH_END)}else{unfold=mix(unfold,unfoldTarget,1-Math.exp(-dt*(drag?32:18)));const boundary=LAUNCH_START/LAUNCH_END;if(unfoldTarget>=boundary&&unfold>=boundary-.003){unfold=boundary;unfoldTarget=1;launchLocked=true;}}if(Math.abs(unfoldTarget-unfold)<.001)unfold=unfoldTarget;}
 if(phase==='animation'&&unfold===0&&unfoldTarget===0){returning=false;launchLocked=false;lastWheel=performance.now();setPhase('intro');$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'위로 드래그하여 레이어를 펼치세요.':'스크롤하여 레이어를 펼치세요.';$('nav').hidden=true;cards.forEach((o,i)=>o.card.disabled=i!==0)}
 if(phase==='animation'&&unfold===1&&unfoldTarget===1){autoUnfold=false;launchLocked=false;gate=true;lastWheel=performance.now();setPhase('explore');unfold=unfoldTarget=1;$('nav').hidden=false;$('hint').textContent=mobile()?'좌우로 탐색 · 아래로 드래그하여 접기':'스크롤하여 탐색';$('eyebrow').textContent='02 / EXPLORE';$('headline').textContent='';cards.forEach(o=>o.card.disabled=false)}
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
 const back=$('fold'),ba=anchorAt(-1,m,focus+1.65),br=root.getBoundingClientRect();back.hidden=phase!=='explore'||focus>-.965||target>-.965;back.style.left=(br.left+ba.x)+'px';back.style.top=(br.top+ba.y+5)+'px';$('counter').textContent=(Math.max(0,Math.round(focus)+1))+' / '+N;$('prev').disabled=target<=-1;$('next').disabled=target>=N-1;
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
function start(){if(phase!=='intro')return;enterTransition();target=focus=returnFocus;unfoldTarget=Math.max(unfoldTarget,.025)}
function navigate(delta,axis='y'){
 if(returning||launchLocked)return;
 if(!delta||!['intro','animation','explore'].includes(phase))return;
 if(axis==='x'){
  if(phase==='explore')target=clamp(target+delta,-1,N-1);
  return;
 }
 if(phase==='explore'){if(delta>=0)return;enterTransition()}
 if(phase==='intro'){if(delta<0)return;enterTransition();target=focus=returnFocus}
 if(phase==='animation')unfoldTarget=clamp(unfoldTarget+delta/(RANGE*.72),0,LAUNCH_START/LAUNCH_END);
}
function reset(){gate=false;launchLocked=false;unfold=unfoldTarget=0;returnFocus=Math.floor((N-1)/2);autoUnfold=false;velocity=0;wheelAt=0;scrollSpeed=0;lastWheel=0;selected=-1;impactPose=null;impactAnchor=null;detail.classList.remove('visible','morphing','content-ready');detail.setAttribute('aria-hidden','true');setPhase('intro');scene.classList.remove('intro-card-hover');cards.forEach((o,i)=>o.card.disabled=i!==0);$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'위로 드래그하여 레이어를 펼치세요.':'스크롤하여 레이어를 펼치세요.';$('nav').hidden=true;hover=false;target=focus=Math.floor((N-1)/2);lift.fill(0)}
function open(i){if(phase!=='explore')return;target=focus;wheelAt=0;scrollSpeed=0;selected=i;visited.add(i);velocity=0;impactPose={...poses[i]};impactAnchor=anchorAt(i,measure());const p=items[i];$('category').textContent=p.category;$('projectTitle').textContent=p.title;$('projectDesc').textContent=p.description;const ph=$('placeholder');ph.replaceChildren();if(p.url){const a=document.createElement('a');a.href=p.url;a.textContent='View project';ph.append(a)}else ph.textContent='';openedAt=performance.now();setPhase('opening')}
function close(){if(phase!=='detail'&&phase!=='opening')return;closeFrom=detailProgress(performance.now());detail.classList.remove('visible');detail.setAttribute('aria-hidden','true');closingAt=performance.now();setPhase('closing')}
$('close').onclick=close;$('fold').onclick=()=>{if(phase==='explore'){enterTransition();unfoldTarget=0;gate=false;returning=true;}};
function step(d){if(phase==='explore'){gate=false;target=clamp(Math.round(target)+d,-1,N-1);wheelAt=0}}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
let wheelAxis=null,returning=false,launchLocked=false;
scene.addEventListener('wheel',e=>{
 if(!['intro','animation','explore'].includes(phase))return;e.preventDefault();
 const now=performance.now(),gap=now-lastWheel;lastWheel=now;
 if(returning||launchLocked)return;
 if(phase==='explore'&&gate){if(gap<220)return;gate=false;}
 const gallery=phase==='explore';
 let delta=gallery?(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY):e.deltaY;
 if(e.deltaMode===1)delta*=16;if(e.deltaMode===2)delta*=innerHeight;
 const units=clamp(delta/105,-1.5,1.5);
 if(gallery){scrollSpeed=mix(scrollSpeed,units*1000/Math.max(16,gap),.35);wheelAt=now}
 navigate(units,gallery?'x':'y');
},{passive:false});
scene.addEventListener('pointerdown',e=>{
 if(returning||!['intro','animation','explore'].includes(phase)||e.target.closest('#nav')||e.button!==0)return;
 drag={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false,axis:null,lastY:e.clientY};velocity=0;lastDragX=e.clientX;lastDragT=performance.now();
});
window.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.axis&&Math.hypot(dx,dy)>7){drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';drag.moved=true;scene.classList.add('dragging')}
 if(!drag.axis||launchLocked||returning)return;
 const now=performance.now(),m=measure();
 if(drag.axis==='y'&&(mobile()||phase!=='explore'))navigate(-(e.clientY-drag.lastY)/(m.viewportH*.16),'y');
 if(drag.axis==='x'&&phase==='explore'){gate=false;const delta=-(e.clientX-lastDragX)/(m.W*.25);navigate(delta,'x');velocity=clamp(mix(velocity,delta*1000/Math.max(8,now-lastDragT),.45),-5,5)}
 drag.lastY=e.clientY;lastDragX=e.clientX;lastDragT=now;
});
function endDrag(){if(!drag)return;if(drag.moved){blockClick=performance.now()+350;if(drag.axis==='x'&&phase==='explore'){if(performance.now()-lastDragT>90)velocity=0;target=clamp(Math.round(target+clamp(velocity*.12,-1,1)),-1,N-1)}velocity=0}drag=null;scene.classList.remove('dragging')}
scene.addEventListener('pointermove',e=>{if(phase==='intro'&&e.pointerType==='mouse')scene.classList.toggle('intro-card-hover',pick(e)>=0)});
scene.addEventListener('pointerleave',()=>scene.classList.remove('intro-card-hover'));
window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
window.addEventListener('keydown',e=>{if(e.key==='Escape')close();else if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(['intro','animation','explore'].includes(phase)){e.preventDefault();navigate(e.key==='ArrowDown'?1:-1,'y')}}});
reset();requestAnimationFrame(frame);
