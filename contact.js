// 공개할 이메일과 링크만 여기에 입력하세요.
const CONTACT = { email: "", links: [] };

(()=>{
 const dialog=document.getElementById('contactDialog'),openButton=document.getElementById('contactOpen'),seedButton=document.getElementById('contactSeed'),inline=document.getElementById('contactBloom'),stage=document.getElementById('seedStage'),info=document.getElementById('contactInfo'),bloomInfo=document.getElementById('bloomInfo');
 let grown=false,timer=0;
 function fill(container){
  if(CONTACT.email){
   const a=document.createElement('a');a.href='mailto:'+CONTACT.email;a.textContent=CONTACT.email;container.append(a);
  }
  for(const link of CONTACT.links){
   if(!link.label||!/^https:\/\//i.test(link.url))continue;
   const a=document.createElement('a');a.href=link.url;a.textContent=link.label;a.target='_blank';a.rel='noopener noreferrer';container.append(a);
  }
  if(!container.children.length&&container===info){const p=document.createElement('p');p.className='contact-preview';p.textContent='Contact details coming soon.';container.append(p)}
 }
 fill(info);fill(document.getElementById('bloomLinks'));
 openButton.addEventListener('click',()=>{if(!dialog.open)dialog.showModal()});
 document.getElementById('contactClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 for(const el of [seedButton,inline]){
  el.addEventListener('pointerdown',e=>e.stopPropagation());
  el.addEventListener('click',e=>e.stopPropagation());
 }
 seedButton.addEventListener('click',()=>{
  if(grown)return;
  grown=true;inline.dataset.growth='watering';stage.dataset.growth='watering';seedButton.setAttribute('aria-expanded','true');seedButton.setAttribute('aria-label','Seed watered');seedButton.tabIndex=-1;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  timer=setTimeout(()=>{inline.dataset.growth='grown';stage.dataset.growth='grown';bloomInfo.hidden=false},reduced?0:1850);
 });
})();
