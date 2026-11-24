// 공개할 이메일과 링크만 여기에 입력하세요. 빈 값은 공개하지 않습니다.
const CONTACT = { email: "", links: [] };

(()=>{
 const dialog=document.getElementById('contactDialog'),openButton=document.getElementById('contactOpen'),seedButton=document.getElementById('contactSeed'),water=document.getElementById('waterSeed'),skip=document.getElementById('contactSkip'),info=document.getElementById('contactInfo'),stage=document.getElementById('seedStage'),status=document.getElementById('contactStatus');
 let timer=0,previous=null;
 const showInfo=()=>{
  info.hidden=false;skip.hidden=true;
 };
 if(CONTACT.email){
  const a=document.createElement('a');a.href='mailto:'+CONTACT.email;a.textContent=CONTACT.email;info.append(a);
 }
 for(const link of CONTACT.links){
  if(!link.label||!/^https:\/\//i.test(link.url))continue;
  const a=document.createElement('a');a.href=link.url;a.textContent=link.label;a.target='_blank';a.rel='noopener noreferrer';info.append(a);
 }
 if(!info.children.length){const p=document.createElement('p');p.className='contact-preview';p.textContent='Contact details coming soon.';info.append(p)}
 function open(e){
  if(dialog.open)return;
  previous=e.currentTarget;clearTimeout(timer);stage.dataset.growth='seed';water.disabled=false;water.textContent='Water the seed';status.textContent='A little water, a little more growth.';info.hidden=true;skip.hidden=false;dialog.showModal();
 }
 openButton.addEventListener('click',open);
 seedButton.addEventListener('pointerdown',e=>e.stopPropagation());
 seedButton.addEventListener('click',e=>{e.stopPropagation();open(e)});
 document.getElementById('contactClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 dialog.addEventListener('close',()=>{clearTimeout(timer);previous?.focus({preventScroll:true})});
 skip.addEventListener('click',showInfo);
 water.addEventListener('click',()=>{
  if(water.disabled)return;water.disabled=true;stage.dataset.growth='watering';status.textContent='Thank you for helping me grow.';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  timer=setTimeout(()=>{stage.dataset.growth='grown';water.textContent='Watered';status.textContent="Let's grow together.";showInfo()},reduced?0:1850);
 });
})();
