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
   // The same right-hand leaf silhouette takes off from its measured position.
   frames=[
    {transform:'translate('+x+'px,'+y+'px) rotate(-43deg) scale('+scale+')',offset:0},
    {transform:'translate('+(x*.91)+'px,'+(y-26)+'px) rotate(-65deg) scale('+(scale*1.3)+')',offset:.17},
    {transform:'translate('+(x*.56-12)+'px,'+(y*.62+32)+'px) rotate(14deg) scale(.33)',offset:.51},
    {transform:'translate('+(x*.12)+'px,'+(y*.1-9)+'px) rotate(-5deg) scale(.88)',offset:.83},
    {...final,offset:1}
   ];duration=1250;leaf.classList.add('detached');
  }else{
   frames=[{transform:'translateY(12px) rotate(-5deg) scale(.90)',opacity:0},final];duration=420;
  }
  flight=surface.animate(frames,{duration,easing:'cubic-bezier(.25,.65,.3,1)',fill:'both'});
  flight.finished.then(()=>{dialog.classList.add('leaf-arrived');flight?.cancel();flight=null}).catch(()=>{});
 }
 openButton.addEventListener('click',()=>showContact());
 document.getElementById('contactClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{flight?.cancel();flight=null;dialog.classList.remove('leaf-arrived');if(grown){stage.dataset.growth='grown';inline.dataset.growth='grown';seedButton.tabIndex=0;seedButton.setAttribute('aria-label','Open contact');seedButton.setAttribute('aria-expanded','false')}});
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
