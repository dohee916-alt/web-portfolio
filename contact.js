// Public contact information, shared by both entry points.
const CONTACT = { email: "dohee916@gmail.com", links: [] };

(()=>{
 const dialog=document.getElementById('contactDialog'),openButton=document.getElementById('contactOpen'),seedButton=document.getElementById('contactSeed'),inline=document.getElementById('contactBloom'),stage=document.getElementById('seedStage'),leaf=document.getElementById('detachableLeaf'),surface=document.getElementById('contactLeafSurface'),email=document.getElementById('contactEmail');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let grown=false,timer=0,flight=null;
 email.href='mailto:'+CONTACT.email;email.textContent=CONTACT.email;
 function showContact(source=null){
  if(dialog.open)return;
  clearTimeout(timer);
  dialog.classList.remove('leaf-arrived');
  dialog.showModal();
  const dest=surface.getBoundingClientRect();
  const final={transform:'translate(0px,0px) rotate(0deg) scale(1)',opacity:1};
  if(reduced()){if(source)leaf.classList.add('detached');dialog.classList.add('leaf-arrived');return}
  let frames,duration;
  if(source&&source.width>0&&source.height>0&&dest.width>0){
   const sx=source.left+source.width/2,sy=source.top+source.height/2,dx=dest.left+dest.width/2,dy=dest.top+dest.height/2;
   const x=sx-dx,y=sy-dy,scale=Math.max(.012,source.width/dest.width);
   // Smooth cubic flight, independently damped flutter and depth.
   // Sample one continuous trajectory rather than interpolating a few angular poses.
   const bezier=(a,b,c,d,t)=>{const q=1-t;return q*q*q*a+3*q*q*t*b+3*q*t*t*c+t*t*t*d};
   const smooth=t=>t*t*(3-2*t);
   const outline=surface.querySelector('#leafOutline');
   const bend=(t)=>{
    const wave=Math.sin(t*Math.PI*3.2)*Math.sin(Math.PI*t)*24;
    return 'M8 246 C95 '+(40+wave)+' 312 '+(5-wave*.7)+' 532 52 C450 '+(232-wave*.55)+' 235 '+(311+wave*.4)+' 8 246Z';
   };
   const steps=80;frames=[];
   for(let i=0;i<=steps;i++){
    const t=i/steps,q=smooth(t),envelope=Math.sin(Math.PI*t);
    const px=bezier(x,x+Math.min(28,Math.abs(x)*.16),-Math.abs(x)*.15,0,q);
    const py=bezier(y,y-95,-55,0,q);
    const swell=scale+(1-scale)*smooth(Math.pow(t,1.18));
    const tilt=43*(1-q)+Math.sin(t*Math.PI*3.4)*envelope*21;
    const pitch=Math.sin(t*Math.PI*3.2)*envelope*38;
    const yaw=Math.sin(t*Math.PI*2.4)*envelope*23;
    frames.push({offset:t,transform:'translate('+px+'px,'+py+'px) perspective(950px) rotate('+tilt+'deg) rotateX('+pitch+'deg) rotateY('+yaw+'deg) scale('+swell+')',opacity:1});
   }
   duration=1650;leaf.classList.add('detached');
   const begin=performance.now();
   const flex=now=>{if(!dialog.open||!flight)return;const t=Math.min(1,(now-begin)/duration);outline?.setAttribute('d',bend(t));if(t<1)requestAnimationFrame(flex);};
   requestAnimationFrame(flex);
  }else{
   frames=[{transform:'translateY(12px) rotate(-5deg) scale(.90)',opacity:0},final];duration=420;
  }
  flight=surface.animate(frames,{duration,easing:'linear',fill:'both'});
  const active=flight;
  active.finished.then(()=>{if(flight!==active||!dialog.open)return;dialog.classList.add('leaf-arrived');surface.querySelector('#leafOutline')?.setAttribute('d','M8 246 C95 40 312 5 532 52 C450 232 235 311 8 246Z');active.cancel();flight=null}).catch(()=>{});
 }
 openButton.addEventListener('click',()=>showContact());
 document.getElementById('contactClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{flight?.cancel();flight=null;dialog.classList.remove('leaf-arrived');surface.querySelector('#leafOutline')?.setAttribute('d','M8 246 C95 40 312 5 532 52 C450 232 235 311 8 246Z');if(grown){stage.dataset.growth='grown';inline.dataset.growth='grown';seedButton.tabIndex=0;seedButton.setAttribute('aria-label','Open contact');seedButton.setAttribute('aria-expanded','false')}});
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 for(const el of [seedButton,inline]){
  el.addEventListener('pointerdown',e=>{e.stopPropagation();if(e.pointerType==='mouse'&&e.button===0)e.preventDefault()});
  el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation()});
  el.addEventListener('dragstart',e=>e.preventDefault());
  el.addEventListener('click',e=>e.stopPropagation());
 }
 seedButton.addEventListener('click',()=>{
  if(dialog.open)return;
  if(grown){if(stage.dataset.growth==='grown')showContact();return}
  grown=true;inline.dataset.growth='watering';stage.dataset.growth='watering';seedButton.setAttribute('aria-expanded','true');
  timer=setTimeout(()=>{
   inline.dataset.growth='grown';stage.dataset.growth='grown';
   const origin=leaf.getBoundingClientRect();
   showContact(inline.hidden?null:origin);
  },reduced()?0:1900);
 });
})();
