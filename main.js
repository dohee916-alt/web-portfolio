
const $=id=>document.getElementById(id),scene=$('scene'),root=$('layers'),items=window.PROJECTS,dialog=$('detail');
const N=items.length, S=32, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), mix=(a,b,t)=>a+(b-a)*t, ease=t=>{t=clamp(t);return t*t*(3-2*t)}, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>matchMedia('(pointer:coarse), (max-width:600px)').matches;
let phase='intro',startAt=0,focus=(N-1)/2,target=focus,hover=false,drag=null,blockClick=0,selected=-1,openedAt=0,closingAt=0,last=performance.now(),lift=[], poses=[];
const cards=[],anchors=[],visited=new Set(),svg=$('curve'),path=svg.querySelector('path');
const detail=$('detail');detail.removeAttribute('open');detail.setAttribute('aria-hidden','true');
function setPhase(p){phase=p;scene.dataset.phase=p}
items.forEach((p,i)=>{
 const card=document.createElement('button');card.className='layer';card.type='button';card.disabled=true;card.setAttribute('aria-label',p.title);card.style.setProperty('--color',p.color);
 const shell=document.createElement('div');shell.className='sheet';const strips=[];
 
 card.append(shell);root.append(card);
 const anchor=document.createElement('button');anchor.type='button';anchor.className='anchor';anchor.setAttribute('aria-label',p.title);const y=document.createElement('span');y.textContent=p.year;const title=document.createElement('b');title.textContent=p.title;anchor.append(y,title);root.append(anchor);
 const select=()=>{if(performance.now()<blockClick||phase!=='explore')return;if(mobile()&&Math.abs(i-focus)>.55){target=i;return}open(i)};
 card.addEventListener('click',select);anchor.addEventListener('click',()=>{if(phase==='explore'&&performance.now()>blockClick)open(i)});
 card.addEventListener('focus',()=>{if(phase==='explore'&&!mobile()){target=i;hover=true}});
 cards.push({card,shell,strips});anchors.push(anchor);lift.push(0);
});

/* Continuous projected mesh: sheet bending and perspective are calculated in
   local coordinates; the final silhouette is rendered as one seamless surface.
   References: book-flip/src/bendMaterial.ts (bow during flip), Codrops circular
   gallery (damped continuous navigation), radial-gallery (spatial picking).
   Original implementation; no external example code copied. */
const surface=document.createElement('canvas');surface.id='optical-scene';surface.setAttribute('aria-hidden','true');root.prepend(surface);
const ctx=surface.getContext('2d');let silhouettes=[],velocity=0,lastDragX=0,lastDragT=0,impactPose=null,impactAnchor=null;const OPEN_MS=1580,CLOSE_MS=850;const HIT=.30,PUSH=.51;let closeFrom=1;
function project(x,y,z,m){const camera=Math.max(780,m.W*1.05),k=camera/Math.max(180,camera-z);return [m.W*.5+(x-m.W*.5)*k,m.H*.4+(y-m.H*.4)*k,z]}
function mesh(p,m,i){
 const rows=64, L=[],R=[],rad=Math.PI/180,ry=p.ry*rad,rz=p.rz*rad,cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
 let yy=0,zz=0;
 const convert=(x,y,z)=>{x*=p.scale;y*=p.scale;z*=p.scale;const a=x*cz-y*sz,b=x*sz+y*cz;return project(p.x+a*cy+z*sy,p.y+b,p.z-a*sy+z*cy,m)};
 for(let j=0;j<=rows;j++){
  if(j){const u=(j-.5)/rows,t=p.fall;const a=Math.PI*.5*ease(clamp(t*1.7+u*.7-.7))+Math.sin(Math.PI*t)*Math.sin(Math.PI*u)*.68;yy-=Math.cos(a)*m.h/rows;zz+=Math.sin(a)*m.h/rows}
  L.push(convert(-m.w/2,yy,zz));R.push(convert(m.w/2,yy,zz))
 }
 return {i,L,R,p,poly:L.concat(R.slice().reverse())}
}
function shape(poly){ctx.beginPath();poly.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath()}
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
  ctx.beginPath();R.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.strokeStyle='rgba(76,117,155,.42)';ctx.lineWidth=1.6;ctx.stroke();
  // A broad, continuous highlight follows the curved sheet, without segment seams.
  ctx.save();shape(poly);ctx.clip();const a=L[Math.floor(L.length*.6)],b=R[Math.floor(R.length*.6)];
  const shimmer=ctx.createLinearGradient(a[0]-18,a[1]-35,b[0]+18,b[1]+35);shimmer.addColorStop(0,'#ffffff00');shimmer.addColorStop(.52,'#ffffff31');shimmer.addColorStop(1,'#ffffff00');ctx.fillStyle=shimmer;ctx.fillRect(0,-m.topInset,m.W,m.viewportH);ctx.restore();ctx.restore()
 }
}
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function pick(e){const r=root.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(let j=silhouettes.length-1;j>=0;j--){let s=silhouettes[j];if(s.p.opacity>.3&&inside(x,y,s.poly))return s.i}return -1}
scene.addEventListener('click',e=>{if(phase!=='explore'||performance.now()<blockClick||e.target.closest('.anchor, #nav, #begin, #reset, #detail, .heading'))return;const i=pick(e);if(i<0)return;if(mobile()&&Math.abs(i-focus)>.55){target=i;return}open(i)});

function measure(){const r=root.getBoundingClientRect(),s=scene.getBoundingClientRect();const w=mobile()?Math.min(r.width*.43,185):Math.min(r.width*.21,290);return {W:r.width,H:r.height,w,h:w*1.32,topInset:r.top-s.top,viewportH:s.height}}
function introPose(i,m){return {x:m.W*.5,y:m.H*.8,z:-i*12,ry:0,rz:0,fall:0,opacity:1,scale:1}}
// Reference composition: ascending convex arc, cards hanging below their anchors.
function anchorAt(i,m,f=focus){
 const t=mobile()? .5+(i-f)*.34 : .08+i*.84/(N-1);
 const x=m.W*t;
 // The reference's steep lower-left to almost horizontal upper-right arc.
 const q=clamp(t,-.8,1.6), y=m.viewportH*(.15+.62*Math.pow(1-q,2))-m.topInset;
 return {x,y};
}
// Exact projection of the top midpoint for upright sheets; no iterative mesh calculations.
function topCenter(p,m){const ry=p.ry*Math.PI/180,rz=p.rz*Math.PI/180,a=m.h*p.scale*Math.sin(rz),b=-m.h*p.scale*Math.cos(rz);const z=p.z-a*Math.sin(ry);const v=project(p.x+a*Math.cos(ry),p.y+b,z,m);return {x:v[0],y:v[1]}}
function alignTop(p,m,i,x,y){const e=topCenter(p,m),ry=p.ry*Math.PI/180,rz=p.rz*Math.PI/180,z=p.z-m.h*p.scale*Math.sin(rz)*Math.sin(ry),camera=Math.max(780,m.W*1.05),k=camera/Math.max(180,camera-z);p.x+=(x-e.x)/k;p.y+=(y-e.y)/k;return p}
// The upper edge is aligned to the bottom of the SAME moving circle.
function pushDistance(m){return Math.min(m.viewportH*.115,98)}
function dotTravel(u,m){return pushDistance(m)*ease(clamp((u-HIT)/(PUSH-HIT)))}
function currentDot(u,m){return {x:impactAnchor.x,y:impactAnchor.y+5-dotTravel(u,m)}}

function archivePose(i,m,f=focus,amount=1){
 const d=i-f,t=i/Math.max(1,N-1),a=anchorAt(i,m,f),size=mobile()?1.04:.96;
 const p={x:a.x,y:a.y+m.h,z:mobile()?-Math.abs(d)*38:55+t*105,ry:mobile()?(-30+clamp(d,-2,2)*11):(-38+t*14),rz:mobile()?-17:-24+t*12,fall:0,opacity:mobile()?clamp(1-(Math.abs(d)-1.35)*.55):1,scale:size};
 return alignTop(p,m,i,a.x+Math.min(m.w*.16,25),a.y+Math.max(35,88-lift[i]*amount));
}
function panelTarget(m){
 const W=m.W,H=m.viewportH;
 return mobile()?{x:18,y:H*.52,w:W-36,h:H*.43}:{x:W*.56,y:H*.20,w:W*.365,h:H*.62};
}
function detailProgress(now){return phase==='closing'?closeFrom*(1-clamp((now-closingAt)/CLOSE_MS)):phase==='detail'?1:clamp((now-openedAt)/OPEN_MS)}
function renderPanel(m,u){
 if(!impactAnchor||u<PUSH){detail.classList.remove('morphing','visible','content-ready');return}
 const t=ease(clamp((u-PUSH)/(0.89-PUSH))),dest=panelTarget(m),r=7,dot=currentDot(u,m);
 const x=mix(dot.x-r,dest.x,t),y=mix(dot.y+m.topInset-r,dest.y,t),w=mix(r*2,dest.w,t),h=mix(r*2,dest.h,t);
 detail.style.left=x+'px';detail.style.top=y+'px';detail.style.width=w+'px';detail.style.height=h+'px';detail.style.borderRadius=mix(r,20,t)+'px';
 detail.classList.add('morphing');detail.classList.toggle('content-ready',u>.78);detail.classList.toggle('visible',phase==='detail');
}
function between(a,b,t){const o={};for(const k in a)o[k]=mix(a[k],b[k],t);return o}
function drawSheet(obj,p,m,i){const {card,strips}=obj;card.style.width=m.w+'px';card.style.height=m.h+'px';card.style.transform='translate3d('+ (p.x-m.w/2)+'px,'+(p.y-m.h)+'px,'+p.z+'px) rotateY('+p.ry+'deg) rotateZ('+p.rz+'deg) scale('+p.scale+')';card.style.opacity=p.opacity;card.style.zIndex=String(Math.round(100+p.z+(selected===i&&phase!=='explore'?500:0)));

}
const FALL_STAGGER=.12,FALL_DURATION=.68,DOWN_END=(N-2)*FALL_STAGGER+FALL_DURATION,UP_START=DOWN_END+.22,UP_END=UP_START+(N-2)*.13+.72,LAUNCH_START=UP_END+.18,LAUNCH_END=LAUNCH_START+1.05;
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;const m=measure();if(phase==='explore'&&!drag&&mobile()&&Math.abs(velocity)>.015){target=clamp(target+velocity*dt,0,N-1);velocity*=Math.exp(-dt*10);if(Math.abs(velocity)<.1){velocity=0;target=Math.round(target)}}focus=mix(focus,target,1-Math.exp(-dt*(drag?25:13)));
 if(phase==='animation'&&(now-startAt)/1000>=LAUNCH_END){setPhase('explore');$('nav').hidden=false;$('hint').textContent=mobile()?'좌우로 드래그하고 중앙 레이어를 선택하세요.':'커서를 움직여 레이어를 선택하세요.';$('eyebrow').textContent='02 / EXPLORE';$('headline').textContent='';cards.forEach(o=>o.card.disabled=false)}
 const time=(now-startAt)/1000;const archive=phase==='explore'||phase==='opening'||phase==='detail'||phase==='closing';
 const active=mobile()||hover;
 for(let i=0;i<N;i++){const d=i-focus;const want=archive&&active?Math.exp(-d*d/1.65)*30:0;lift[i]=mix(lift[i],want,1-Math.exp(-dt*14))}
 let points=[];
 for(let i=0;i<N;i++){
  let p=introPose(i,m);
  if(phase==='animation'){
   if(i<N-1){
    const fall=ease((time-i*FALL_STAGGER)/FALL_DURATION);
    const rise=ease((time-UP_START-(N-2-i)*.13)/.72);
    p.fall=fall*(1-rise);p.y+=p.fall*(N-1-i)*2;p.z+=p.fall*(N-1-i)*3;
   }
   if(time>=LAUNCH_START){const t=clamp((time-LAUNCH_START)/1.05), q=ease(t);p=between(p,archivePose(i,m,focus,0),q);p.y-= Math.sin(Math.PI*t)*m.H*.32;p.ry+=Math.sin(Math.PI*t)*42;p.z+=Math.sin(Math.PI*t)*85}
  }else if(archive){
   p=archivePose(i,m);
   if(selected>=0&&(phase==='opening'||phase==='detail'||phase==='closing')){
    const u=detailProgress(now),hit=impactAnchor||anchorAt(selected,m);
    if(i===selected){
     const start=impactPose||p;
     const contact=alignTop({...start},m,i,hit.x,hit.y+12);
     if(u<HIT){
      // Accelerate into contact, rather than easing to a stop before the hit.
      const q=clamp(u/HIT);p=between(start,contact,q*q);
     }else if(u<PUSH){
      const dot=currentDot(u,m),q=ease((u-HIT)/(PUSH-HIT));
      p=alignTop({...contact,z:contact.z+30*q},m,i,dot.x,dot.y+7);
     }else{
      const dot=currentDot(PUSH,m);
      const pushed=alignTop({...contact,z:contact.z+30},m,i,dot.x,dot.y+7);
      const dest={...p,x:m.W*(mobile()?.5:.27),y:m.viewportH*(mobile()?.48:.78)-m.topInset,z:120,ry:-13,rz:-7,scale:mobile()?1.10:1.26,opacity:1};
      p=between(pushed,dest,ease((u-PUSH)/(1-PUSH)));
     }
    }else{const q=ease(clamp((u-.24)/.55));p.y-=q*m.viewportH*.035;p.opacity*=1-q*.83}
   }
  }
  poses[i]=p;cards[i].card.classList.toggle('selected',selected===i&&phase!=='explore');drawSheet(cards[i],p,m,i);
  const base=selected===i&&impactAnchor?impactAnchor:anchorAt(i,m);const a=anchors[i];const ax=base.x,ay=base.y;points.push([ax,ay+5]);
  a.style.left=ax+'px';a.style.top=ay+'px';a.style.visibility=mobile()&&Math.abs(i-focus)>1.35?'hidden':'visible';a.classList.toggle('active',Math.abs(i-focus)<.5);a.classList.toggle('visited',visited.has(i));a.classList.toggle('picked',selected===i);a.disabled=phase!=='explore';
  const u=selected===i&&phase!=='explore'?detailProgress(now):0;const bump=selected===i?-dotTravel(u,m):0;a.classList.toggle('absorbed',selected===i&&u>=PUSH);
  a.style.setProperty('--bump',bump+'px')
 }
 opticalRender(m);
 svg.setAttribute('viewBox','0 0 '+m.W+' '+m.H);let d='M '+points[0].join(' ');for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],x=(a[0]+b[0])/2;d+=' C '+x+' '+a[1]+' '+x+' '+b[1]+' '+b.join(' ')}path.setAttribute('d',d);
 $('counter').textContent=(Math.round(focus)+1)+' / '+N;$('prev').disabled=target<=0;$('next').disabled=target>=N-1;
 if(selected>=0&&['opening','detail','closing'].includes(phase))renderPanel(m,detailProgress(now));
 if(phase==='opening'&&now-openedAt>=OPEN_MS){setPhase('detail');detail.classList.add('visible');detail.setAttribute('aria-hidden','false')}
 if(phase==='closing'&&now-closingAt>=CLOSE_MS){selected=-1;impactPose=null;impactAnchor=null;detail.classList.remove('morphing','visible','content-ready');setPhase('explore')}
 requestAnimationFrame(frame)
}
function start(){if(phase!=='intro')return;setPhase('animation');startAt=performance.now();if(reduced)startAt-=LAUNCH_END*1000;$('begin').hidden=true;$('hint').textContent='';target=focus=(N-1)/2}
function reset(){velocity=0;selected=-1;impactPose=null;impactAnchor=null;detail.classList.remove('visible','morphing','content-ready');detail.setAttribute('aria-hidden','true');setPhase('intro');cards.forEach(o=>o.card.disabled=true);$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'터치하거나 드래그하여 시작하세요.':'스크롤하여 시작하세요.';$('begin').hidden=false;$('nav').hidden=true;hover=false;target=focus=(N-1)/2;lift.fill(0)}
function open(i){if(phase!=='explore')return;selected=i;visited.add(i);velocity=0;impactPose={...poses[i]};impactAnchor=anchorAt(i,measure());const p=items[i];$('category').textContent=p.category;$('projectTitle').textContent=p.title;$('projectDesc').textContent=p.description;const ph=$('placeholder');ph.replaceChildren();if(p.url){const a=document.createElement('a');a.href=p.url;a.textContent='View project';ph.append(a)}else ph.textContent='';openedAt=performance.now();setPhase('opening')}
function close(){if(phase!=='detail'&&phase!=='opening')return;closeFrom=detailProgress(performance.now());detail.classList.remove('visible');detail.setAttribute('aria-hidden','true');closingAt=performance.now();setPhase('closing')}
$('close').onclick=close;$('reset').onclick=reset;$('begin').onclick=start;
function step(d){if(phase==='explore'){target=clamp(Math.round(target)+d,0,N-1);hover=true}}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
scene.addEventListener('wheel',e=>{if(phase==='intro'){e.preventDefault();start()}},{passive:false});
scene.addEventListener('pointermove',e=>{if(phase!=='explore'||mobile()||e.pointerType!=='mouse')return;const r=root.getBoundingClientRect();target=clamp(((e.clientX-r.left)/r.width-.08)/.84*(N-1),0,N-1);hover=true});
scene.addEventListener('pointerleave',()=>{if(!mobile())hover=false});
scene.addEventListener('pointerdown',e=>{if(phase==='intro'&&e.pointerType!=='mouse'){start();return}if(phase==='explore'&&mobile()&&!e.target.closest('#nav')){drag={x:e.clientX,index:target,id:e.pointerId,moved:false};velocity=0;lastDragX=e.clientX;lastDragT=performance.now()}});
window.addEventListener('pointermove',e=>{if(!drag||phase!=='explore'||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>8)drag.moved=true;if(drag.moved){const now=performance.now();const v=-(e.clientX-lastDragX)/(measure().W*.32)*1000/Math.max(8,now-lastDragT);velocity=clamp(mix(velocity,v,.45),-5,5);lastDragX=e.clientX;lastDragT=now;target=clamp(drag.index-dx/(measure().W*.32),0,N-1)}});
function endDrag(){if(!drag)return;if(drag.moved){blockClick=performance.now()+300;if(performance.now()-lastDragT>100||Math.abs(velocity)<.1){velocity=0;target=Math.round(target)}}drag=null}
window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
window.addEventListener('keydown',e=>{if(e.key==='Escape')close();else if(phase==='intro'&&['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();start()}else if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1)});
reset();requestAnimationFrame(frame);
