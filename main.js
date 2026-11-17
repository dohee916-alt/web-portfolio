
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
 for(let j=0;j<S;j++){const el=document.createElement('div');el.className='sheet-strip';el.style.setProperty('--strip',j);el.style.setProperty('--count',S);shell.append(el);strips.push(el)}
 card.append(shell);root.append(card);
 const anchor=document.createElement('button');anchor.type='button';anchor.className='anchor';anchor.setAttribute('aria-label',p.title);const y=document.createElement('span');y.textContent=p.year;const title=document.createElement('b');title.textContent=p.title;anchor.append(y,title);root.append(anchor);
 const select=()=>{if(performance.now()<blockClick||phase!=='explore')return;if(mobile()&&Math.abs(i-focus)>.55){target=i;return}open(i)};
 card.addEventListener('click',select);anchor.addEventListener('click',()=>{if(phase==='explore'&&performance.now()>blockClick)open(i)});
 card.addEventListener('focus',()=>{if(phase==='explore'&&!mobile()){target=i;hover=true}});
 cards.push({card,shell,strips});anchors.push(anchor);lift.push(0);
});
function measure(){const r=root.getBoundingClientRect();const w=mobile()?Math.min(r.width*.43,185):Math.min(r.width*.21,290);return {W:r.width,H:r.height,w,h:w*1.32}}
function introPose(i,m){return {x:m.W*.5,y:m.H*.8,z:-i*12,ry:0,rz:0,fall:0,opacity:1,scale:1}}
function archivePose(i,m,f=focus,amount=1){const d=i-f,mid=(N-1)/2,v=mobile()?d:i-mid,xx=mobile()?m.W*.5+d*m.W*.32:m.W*(.13+i*.74/(N-1));const norm=v/Math.max(mid,1);const yy=m.H*(.63+.16*Math.pow(Math.min(Math.abs(norm),1.7),2));return {x:xx,y:yy-lift[i]*amount,z:mobile()?-Math.abs(d)*34:35-Math.pow(norm,2)*95,ry:mobile()?clamp(d*25,-65,65):58+norm*18,rz:-norm*8,fall:0,opacity:mobile()?clamp(1-(Math.abs(d)-1.35)*.55):1,scale:mobile()?1-Math.min(Math.abs(d)*.09,.3):1}}
function between(a,b,t){const o={};for(const k in a)o[k]=mix(a[k],b[k],t);return o}
function drawSheet(obj,p,m,i){const {card,strips}=obj;card.style.width=m.w+'px';card.style.height=m.h+'px';card.style.transform='translate3d('+ (p.x-m.w/2)+'px,'+(p.y-m.h)+'px,'+p.z+'px) rotateY('+p.ry+'deg) rotateZ('+p.rz+'deg) scale('+p.scale+')';card.style.opacity=p.opacity;card.style.zIndex=String(Math.round(100+p.z+(selected===i&&phase!=='explore'?500:0)));
 // Integrate the tangent of the bent sheet from its fixed lower edge. Each strip
 // follows that centreline; the curvature travels down the sheet during the flip.
 let y=0,z=0;const ds=m.h/S;
 for(let j=0;j<S;j++){
  const u=(j+.5)/S;
  const lead=ease(clamp(p.fall*1.65+u*.65-.65));
  const theta=(Math.PI/2)*lead + Math.sin(Math.PI*p.fall)*Math.sin(Math.PI*u)*.62;
  const dy=-Math.cos(theta)*ds,dz=Math.sin(theta)*ds;
  const el=strips[S-1-j];el.style.height=(ds+.65)+'px';el.style.transform='translate3d(0,'+(m.h+y+dy/2-ds/2)+'px,'+(z+dz/2)+'px) rotateX('+(-theta*180/Math.PI)+'deg)';
  y+=dy;z+=dz;
 }
}
const FALL_STAGGER=.12,FALL_DURATION=.68,DOWN_END=(N-2)*FALL_STAGGER+FALL_DURATION,UP_START=DOWN_END+.22,UP_END=UP_START+(N-2)*.13+.72,LAUNCH_START=UP_END+.18,LAUNCH_END=LAUNCH_START+1.05;
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;const m=measure();focus=mix(focus,target,1-Math.exp(-dt*(drag?25:13)));
 if(phase==='animation'&&(now-startAt)/1000>=LAUNCH_END){setPhase('explore');$('nav').hidden=false;$('hint').textContent=mobile()?'좌우로 드래그하고 중앙 레이어를 선택하세요.':'커서를 움직여 레이어를 선택하세요.';$('eyebrow').textContent='02 / EXPLORE';$('headline').textContent='';cards.forEach(o=>o.card.disabled=false)}
 const time=(now-startAt)/1000;const archive=phase==='explore'||phase==='opening'||phase==='detail'||phase==='closing';
 const active=mobile()||hover;
 for(let i=0;i<N;i++){const d=i-focus;const want=archive&&active?Math.exp(-d*d/1.15)*(mobile()?m.h*.2:m.h*.28):0;lift[i]=mix(lift[i],want,1-Math.exp(-dt*14))}
 let points=[];
 for(let i=0;i<N;i++){
  let p=introPose(i,m);
  if(phase==='animation'){
   if(i<N-1){
    const fall=ease((time-i*FALL_STAGGER)/FALL_DURATION);
    const rise=ease((time-UP_START-(N-2-i)*.13)/.72);
    p.fall=fall*(1-rise);p.y+=p.fall*(N-1-i)*2;p.z+=p.fall*(N-1-i)*3;
   }
   if(time>=LAUNCH_START){const t=clamp((time-LAUNCH_START)/1.05), q=ease(t);p=between(p,archivePose(i,m,focus,0),q);p.y-= Math.sin(Math.PI*t)*m.H*.27;p.ry+=Math.sin(Math.PI*t)*18;p.z+=Math.sin(Math.PI*t)*65}
  }else if(archive){
   p=archivePose(i,m);
   if(selected>=0&&(phase==='opening'||phase==='detail'||phase==='closing')){
    const t=phase==='closing'?1-ease((now-closingAt)/650):ease((now-openedAt)/720);
    if(i===selected){const dest={...p,x:m.W*(mobile()?.5:.28),y:m.H*(mobile()?.56:.67),z:180,ry:-8,rz:0,scale:mobile()?1.03:1.48,opacity:1};p=between(p,dest,t);p.y-=Math.sin(Math.PI*t)*m.H*.17}
    else {p.y+=t*m.H*.12;p.opacity*=1-t*.83}
   }
  }
  poses[i]=p;cards[i].card.classList.toggle('selected',selected===i&&phase!=='explore');drawSheet(cards[i],p,m,i);
  const base=archivePose(i,m,focus,0);const a=anchors[i];const ax=base.x,ay=base.y+m.H*.12;points.push([ax,ay]);
  a.style.left=ax+'px';a.style.top=ay+'px';a.style.visibility=mobile()&&Math.abs(i-focus)>1.35?'hidden':'visible';a.classList.toggle('active',Math.abs(i-focus)<.5);a.classList.toggle('visited',visited.has(i));a.classList.toggle('picked',selected===i);a.disabled=phase!=='explore';
  const bump=selected===i&&phase==='opening'?Math.sin(Math.PI*clamp((now-openedAt)/220))*-11:0;
  a.style.setProperty('--bump',bump+'px')
 }
 svg.setAttribute('viewBox','0 0 '+m.W+' '+m.H);let d='M '+points[0].join(' ');for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],x=(a[0]+b[0])/2;d+=' C '+x+' '+a[1]+' '+x+' '+b[1]+' '+b.join(' ')}path.setAttribute('d',d);
 $('counter').textContent=(Math.round(focus)+1)+' / '+N;$('prev').disabled=target<=0;$('next').disabled=target>=N-1;
 if(phase==='opening'&&now-openedAt>=720){setPhase('detail');detail.classList.add('visible');detail.setAttribute('aria-hidden','false')}
 if(phase==='closing'&&now-closingAt>=650){selected=-1;setPhase('explore')}
 requestAnimationFrame(frame)
}
function start(){if(phase!=='intro')return;setPhase('animation');startAt=performance.now();if(reduced)startAt-=LAUNCH_END*1000;$('begin').hidden=true;$('hint').textContent='';target=focus=(N-1)/2}
function reset(){selected=-1;detail.classList.remove('visible');detail.setAttribute('aria-hidden','true');setPhase('intro');cards.forEach(o=>o.card.disabled=true);$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'터치하거나 드래그하여 시작하세요.':'스크롤하여 시작하세요.';$('begin').hidden=false;$('nav').hidden=true;hover=false;target=focus=(N-1)/2;lift.fill(0)}
function open(i){if(phase!=='explore')return;selected=i;visited.add(i);target=i;const p=items[i];$('category').textContent=p.category;$('projectTitle').textContent=p.title;$('projectDesc').textContent=p.description;const ph=$('placeholder');ph.replaceChildren();if(p.url){const a=document.createElement('a');a.href=p.url;a.textContent='View project';ph.append(a)}else ph.textContent='';openedAt=performance.now();setPhase('opening')}
function close(){if(phase!=='detail'&&phase!=='opening')return;detail.classList.remove('visible');detail.setAttribute('aria-hidden','true');closingAt=performance.now();setPhase('closing')}
$('close').onclick=close;$('reset').onclick=reset;$('begin').onclick=start;
function step(d){if(phase==='explore'){target=clamp(Math.round(target)+d,0,N-1);hover=true}}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
scene.addEventListener('wheel',e=>{if(phase==='intro'){e.preventDefault();start()}},{passive:false});
root.addEventListener('pointermove',e=>{if(phase!=='explore'||mobile()||e.pointerType!=='mouse')return;const r=root.getBoundingClientRect();target=clamp(((e.clientX-r.left)/r.width-.13)/.74*(N-1),0,N-1);hover=true});
root.addEventListener('pointerleave',()=>{if(!mobile())hover=false});
scene.addEventListener('pointerdown',e=>{if(phase==='intro'&&e.pointerType!=='mouse'){start();return}if(phase==='explore'&&mobile()&&!e.target.closest('#nav'))drag={x:e.clientX,index:target,id:e.pointerId,moved:false}});
window.addEventListener('pointermove',e=>{if(!drag||phase!=='explore'||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>8)drag.moved=true;if(drag.moved)target=clamp(drag.index-dx/(measure().W*.32),0,N-1)});
function endDrag(){if(!drag)return;if(drag.moved){blockClick=performance.now()+300;target=Math.round(target)}drag=null}
window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
window.addEventListener('keydown',e=>{if(e.key==='Escape')close();else if(phase==='intro'&&['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();start()}else if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1)});
reset();requestAnimationFrame(frame);
