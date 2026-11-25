if(!(window.PROJECTS||[]).some(p=>p&&p.enabled!==false)){
 const label=document.getElementById('stillGrowing');if(label){label.style.opacity='1';label.style.top='50%';label.style.transform='translate(-50%,-50%)'}
}else{

const $=id=>document.getElementById(id),scene=$('scene'),root=$('layers'),items=(window.PROJECTS||[]).filter(p=>p&&p.enabled!==false),dialog=$('detail');
const N=items.length, S=32, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), mix=(a,b,t)=>a+(b-a)*t, ease=t=>{t=clamp(t);return t*t*(3-2*t)}, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>matchMedia('(pointer:coarse), (max-width:600px)').matches;
const forestCompact=(W,H)=>Math.max(ease(clamp((980-W)/340)),ease(clamp((1.28-W/Math.max(1,H))/.48)));
const introPaperWidth=(W,H)=>Math.min(185,W*.43);
function sizeCone(img,s){const w=Math.max(12,8.5/Math.max(.12,s||.5)),h=w*1.6;img.setAttribute('x',String(-w/2));img.setAttribute('y',String(-h/2));img.setAttribute('width',String(w));img.setAttribute('height',String(h))}
let treeReturn=null,treeOpening=false;let phase='intro',startAt=0,focus=Math.floor((N-1)/2),target=focus,hover=false,drag=null,blockClick=0,selected=-1,openedAt=0,closingAt=0,last=performance.now(),lift=[], poses=[];
const cards=[],anchors=[],visited=new Set(),svg=$('curve'),path=svg.querySelector('path');
const svgNS='http://www.w3.org/2000/svg',futurePath=document.createElementNS(svgNS,'path'),futureText=document.createElementNS(svgNS,'text'),futureLabelPath=document.createElementNS(svgNS,'path'),futureTextPath=document.createElementNS(svgNS,'textPath');
futurePath.setAttribute('fill','none');futurePath.setAttribute('stroke-dasharray','4 7');futurePath.setAttribute('stroke-linecap','round');futurePath.setAttribute('id','futureTrack');futureText.setAttribute('id','futureMessage');futureText.setAttribute('text-anchor','middle');futureText.setAttribute('stroke','none');futureText.setAttribute('fill','#f4eedc');futureLabelPath.setAttribute('id','futureLabelCurve');futureLabelPath.setAttribute('fill','none');futureLabelPath.setAttribute('stroke','none');futureLabelPath.setAttribute('aria-hidden','true');futureTextPath.setAttribute('href','#futureLabelCurve');futureTextPath.setAttribute('startOffset','54%');futureTextPath.textContent='More to Unfold';futureText.append(futureTextPath);svg.append(futurePath,futureLabelPath,futureText);
// Fit the entire forest to the viewport, rather than cropping a fixed wide composition.
const forest=$('introForestTrees'),forestProjects=items.filter(p=>p.category==='Project');
const fruitKey='folio-fruit-counts-v1',fruitCounts=Object.create(null),fruitPending=Object.create(null);
const fruitId=p=>p.id||p.year+'|'+p.title;
try{const saved=JSON.parse(sessionStorage.getItem(fruitKey)||'{}');for(const p of forestProjects){const k=fruitId(p);fruitCounts[k]=Math.max(0,Math.floor(Number(saved[k])||0))}}catch(e){}
function addFruit(p){
 if(!p||p.category!=='Project')return;
 const k=fruitId(p);fruitCounts[k]=(fruitCounts[k]||0)+1;fruitPending[k]=(fruitPending[k]||0)+1;
 try{sessionStorage.setItem(fruitKey,JSON.stringify(fruitCounts))}catch(e){}
}
function showFallenFruit(){
 if(!forest)return;
 forest.querySelectorAll('.project-tree').forEach((tree,i)=>{
  const key=fruitId(forestProjects[i]),group=tree.querySelector('.fallen-fruits'),count=fruitCounts[key]||0,pending=fruitPending[key]||0;
  if(!group)return;
  // Keep a deterministic but project-specific scatter of cones around the roots.
  // The visit order is retained in sessionStorage; only the newest cones fall.
  let seed=2166136261;
  for(const char of key)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const landingSites=[];
  for(let k=0;k<24;k++){
   const side=k%2===0?-1:1;
   const spread=12+random()*34;
   landingSites.push({x:96+side*spread,y:353+random()*12,turn:side*(48+random()*66)});
  }
  // Different branch for each visit; the cone never originates outside the tree.
  const branchSites=[];
  for(let k=0;k<24;k++){
   const side=random()<.5?-1:1;
   branchSites.push({x:96+side*(20+random()*35),y:162+random()*135});
  }
  for(let j=group.children.length;j<count;j++){
   const ring=Math.floor(j/landingSites.length),site=landingSites[j%landingSites.length];
   const x=site.x+Math.sin(j*2.11)*Math.min(ring*3,7);
   const y=site.y-Math.min(ring*5,21);
   const turn=site.turn+(random()-.5)*17;
   const g=document.createElementNS(svgNS,'g');
   g.setAttribute('transform','translate('+x+' '+y+') rotate('+turn+')');
   const img=document.createElementNS(svgNS,'image');
   img.setAttribute('href','./assets/spruce-cone.svg?v=earth-brown-1');
   sizeCone(img,Number(tree.dataset.treeScale));
   g.append(img);group.append(g);
   const fresh=j>=count-pending&&!reduced;
   if(fresh){
    const source=branchSites[j%branchSites.length];
    const theta=turn*Math.PI/180,dx=source.x-x,dy=source.y-y;
    const fromX=dx*Math.cos(theta)+dy*Math.sin(theta);
    const fromY=-dx*Math.sin(theta)+dy*Math.cos(theta);
    const start='translate('+fromX+'px,'+fromY+'px) rotate('+(-turn*.7)+'deg)';
    const mid='translate('+(fromX*.58+4)+'px,'+(fromY*.54)+'px) rotate('+(36-turn*.5)+'deg)';
    const near='translate(0px,2px) rotate(9deg)';
    // Both transforms are local to the landing group. A delayed backward-filled
    // animation prevents cones from blinking at the ground before they fall.
    const fall=img.animate([
     {transform:start,opacity:.95,offset:0},
     {transform:mid,opacity:1,offset:.49},
     {transform:near,opacity:1,offset:.84},
     {transform:'translate(0px,-3px) rotate(-5deg)',opacity:1,offset:.93},
     {transform:'translate(0px,0px) rotate(0deg)',opacity:.88,offset:1}
    ],{duration:1100,delay:240+(j-(count-pending))*130,easing:'cubic-bezier(.38,.05,.28,1)',fill:'backwards'});
    fall.onfinish=()=>fall.cancel();
   }
  }
  fruitPending[key]=0;
 });
}
let updateForestLabels=()=>{};
if(forest){
 const forestSvg=$('introForest');
 const labelOverlay=document.createElementNS(svgNS,'svg');labelOverlay.id='forestLabelOverlay';labelOverlay.setAttribute('aria-hidden','true');scene.append(labelOverlay);
 const labels=[];scene.addEventListener('pointerdown',e=>{if(e.target.closest('.project-tree'))return;forest.querySelectorAll('.tree-preview').forEach(t=>t.classList.remove('tree-preview'));labels.forEach(l=>l.classList.remove('label-hover'))},true);
 const trees=forestProjects.map((p,i)=>{
  const tree=document.createElementNS(svgNS,'g');
  tree.classList.add('project-tree');tree.setAttribute('role','button');tree.setAttribute('tabindex','0');tree.setAttribute('aria-label',p.title);
  const layers=document.createElementNS(svgNS,'g');layers.classList.add('project-tree-layers');
  const custom=Array.isArray(p.treeLayers)&&p.treeLayers.length?p.treeLayers:null;
  const sources=custom||window.DEFAULT_TREE_PATHS||[];
  sources.forEach((source,j)=>{
   const layer=document.createElementNS(svgNS,custom?'image':'path');
   if(custom){layer.setAttribute('href',source);layer.setAttribute('width','192');layer.setAttribute('height','362');layer.setAttribute('preserveAspectRatio','xMidYMid meet')}
   else{layer.setAttribute('d',source);layer.setAttribute('fill','#183a29')}
   layer.classList.add('tree-layer');const depth=sources.length>1?j/(sources.length-1):0;layer.style.setProperty('--depth-width',String(1-.10*depth));layer.style.setProperty('--open-width',String(1-.40*depth));layer.style.setProperty('--layer-delay',(j*24)+'ms');layers.append(layer);
  });
  const label=document.createElementNS(svgNS,'text');label.classList.add('tree-label');label.setAttribute('x','98');label.setAttribute('y','384');label.setAttribute('text-anchor','middle');label.textContent=p.title;
  const hit=document.createElementNS(svgNS,'path');hit.classList.add('tree-hit');
  hit.setAttribute('d','M96 0 L124 70 L155 135 L181 210 L200 325 L140 350 L110 362 L83 362 L50 350 L-8 325 L12 210 L38 135 L68 70Z');
  const fruits=document.createElementNS(svgNS,'g');fruits.classList.add('fallen-fruits');fruits.setAttribute('aria-hidden','true');tree.append(layers,fruits,hit);forest.append(tree);labelOverlay.append(label);labels.push(label);tree.addEventListener('pointerenter',()=>label.classList.add('label-hover'));tree.addEventListener('pointerleave',()=>{if(!tree.classList.contains('tree-preview'))label.classList.remove('label-hover')});tree.addEventListener('focus',()=>label.classList.add('label-hover'));tree.addEventListener('blur',()=>{if(!tree.classList.contains('tree-preview'))label.classList.remove('label-hover')});
  const activate=e=>{e.stopPropagation();if(phase==='intro'||phase==='explore')openFromTree(items.indexOf(p),tree)};
  let holdTimer=0,held=false,touchPress=false,downX=0,downY=0;
  const preview=()=>{forest.querySelectorAll('.tree-preview').forEach(t=>t.classList.remove('tree-preview'));labels.forEach(l=>l.classList.remove('label-hover'));tree.classList.add('tree-preview');label.classList.add('label-hover')};
  const clearHold=()=>{clearTimeout(holdTimer);holdTimer=0};
  tree.addEventListener('pointerdown',e=>{touchPress=e.pointerType==='touch';if(!touchPress)return;held=false;downX=e.clientX;downY=e.clientY;clearHold();holdTimer=setTimeout(()=>{if(phase!=='intro')return;held=true;preview()},380)});
  tree.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>12)clearHold()});tree.addEventListener('pointerup',clearHold);tree.addEventListener('pointercancel',clearHold);tree.addEventListener('contextmenu',e=>e.preventDefault());
  tree.addEventListener('click',e=>{e.stopPropagation();if(held){held=false;return}if(touchPress&&phase==='intro'&&!tree.classList.contains('tree-preview')){preview();return}tree.classList.remove('tree-preview');activate(e)});tree.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(e)}});
  for(const event of ['pointerdown','touchstart','touchend','touchmove'])tree.addEventListener(event,e=>e.stopPropagation(),{passive:true});
  return tree;
 });
 let labelPaper=null,labelLayoutKey='';
 function placeForestLabels(paper){
  const W=scene.clientWidth,H=scene.clientHeight,margin=8;
  if(!W||!H)return;
  if(paper&&Number.isFinite(paper.left))labelPaper=paper;
  const w=introPaperWidth(W,H)*1.15,h=w*9.5/7;
  const card=labelPaper||{left:(W-w)/2,right:(W+w)/2,top:(H-h)/2,bottom:(H+h)/2};
  const key=[W,H,card.left,card.right,card.top,card.bottom].map(v=>Math.round(v*2)/2).join('|');
  if(key===labelLayoutKey)return;
  labelLayoutKey=key;
  labelOverlay.setAttribute('viewBox','0 0 '+W+' '+H);
  const growing=$('stillGrowing').getBoundingClientRect(),sr=scene.getBoundingClientRect();
  const title={left:growing.left-sr.left,right:growing.right-sr.left,top:card.top-29,bottom:card.top-7};
  const obstacles=[card],placed=[];
  trees.forEach((tree,i)=>{
   const label=labels[i],bx=Number(tree.dataset.baseX),by=Number(tree.dataset.baseY),s=Number(tree.dataset.treeScale);
   if(!label||!s||!Number.isFinite(bx)||!Number.isFinite(by))return;
   const height=362*s,treeHalf=105*s,half=Math.max(12,label.getComputedTextLength()/2)+5,vertical=11;
   const idealX=bx,idealY=by-height/2;
   const minX=Math.min(W/2,margin+half),maxX=Math.max(minX,W-margin-half);
   const minY=Math.min(H/2,60),maxY=Math.max(minY,H-vertical-8);
   const cx=v=>clamp(v,minX,maxX),cy=v=>clamp(v,minY,maxY);
   const xs=[idealX,treeHalf+8,W-treeHalf-8],ys=[idealY,height/2+8,H-height/2-8];
   for(const o of [...obstacles,...placed]){
    xs.push(o.left-half-7,o.right+half+7);
    ys.push(o.top-vertical-7,o.bottom+vertical+7);
   }
   let best=null,bestScore=Infinity;
   for(const xv of xs)for(const yv of ys){
    const x=cx(xv),y=cy(yv),rect={left:x-half,right:x+half,top:y-vertical,bottom:y+vertical};
    const intersect=o=>rect.right>o.left-5&&rect.left<o.right+5&&rect.bottom>o.top-5&&rect.top<o.bottom+5;
    if(obstacles.some(intersect))continue;
    const overlap=placed.some(intersect);
    const clip=Math.max(0,treeHalf+6-x,x+treeHalf+6-W)+Math.max(0,height/2+6-y,y+height/2+6-H);
    const displacement=Math.hypot(x-idealX,y-idealY);
    const score=displacement+clip*1.1+(overlap?10000:0);
    if(score<bestScore){bestScore=score;best={x,y,rect}}
   }
   // Tiny viewports may not fit a full name beside the stack. Prefer a free center above or below it.
   if(!best){
    const x=cx(idealX),above=card.top-vertical-8,below=card.bottom+vertical+8;
    const free=[above,below].filter(y=>y>=minY&&y<=maxY);
    const y=free.length?free.sort((a,b)=>Math.abs(a-idealY)-Math.abs(b-idealY))[0]:cy(idealY);
    best={x,y,rect:{left:x-half,right:x+half,top:y-vertical,bottom:y+vertical}};
   }
   const x=best.x,y=best.y+height/2;
   tree.setAttribute('transform','translate('+x+' '+y+') scale('+s+') translate(-96 -362)');
   tree.dataset.treeX=String(x);tree.dataset.treeY=String(y);
   label.setAttribute('x',String(best.x));label.setAttribute('y',String(best.y));label.setAttribute('dominant-baseline','central');
   placed.push(best.rect);
  });
 }
 updateForestLabels=placeForestLabels;
 function layoutForest(){
  const W=scene.clientWidth,H=scene.clientHeight;
  if(!W||!H)return;
  forestSvg.setAttribute('viewBox','0 0 '+W+' '+H);
  // Continuous interpolation between two asymmetric compositions, no breakpoint jump.
  const t=ease(clamp((W/H-.60)/1.05));
  const portrait=[{x:.19,y:.74,h:.35,alpha:.80},{x:.32,y:.31,h:.22,alpha:.80},{x:.83,y:.51,h:.27,alpha:.80},{x:.73,y:.92,h:.24,alpha:.80}];
  const landscape=[{x:.14,y:.84,h:.62,alpha:.80},{x:.29,y:.51,h:.35,alpha:.80},{x:.84,y:.64,h:.43,alpha:.80},{x:.72,y:.91,h:.34,alpha:.80}];
  trees.forEach((tree,i)=>{
   const fallback={x:.09+((i*157)%820)/1000,y:.78+(i%3)*.05,h:.26+(i%4)*.04,alpha:.38};
   const p=portrait[i]||fallback,l=landscape[i]||fallback;
   const height=Math.min(H*mix(p.h,l.h,t),W*mix(.35,.29,t)*362/192);
   const scale=height/362,half=height*96/362+height*.025;
   const x=clamp(W*mix(p.x,l.x,t),half+8,W-half-8),y=H*mix(p.y,l.y,t);
   tree.setAttribute('transform','translate('+x+' '+y+') scale('+scale+') translate(-96 -362)');
   tree.dataset.baseX=String(x);tree.dataset.baseY=String(y);tree.dataset.treeX=String(x);tree.dataset.treeY=String(y);tree.dataset.treeScale=String(scale);tree.querySelectorAll('.fallen-fruits image').forEach(img=>sizeCone(img,scale));
   tree.style.setProperty('--tree-opacity',String(mix(p.alpha,l.alpha,t)));tree.style.setProperty('--label-size',String(11/scale)+'px');
  });
  labelPaper=null;labelLayoutKey='';placeForestLabels();
 }
 layoutForest();
 document.fonts?.ready.then(()=>{labelLayoutKey='';placeForestLabels()});
 window.addEventListener('resize',layoutForest,{passive:true});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(layoutForest).observe(scene);
}
const detail=$('detail');detail.removeAttribute('open');detail.setAttribute('aria-hidden','true');
const touchLayout=()=>matchMedia('(pointer:coarse)').matches;
function setPhase(p){phase=p;scene.dataset.phase=p;if(p==='intro')showFallenFruit();$('foldEdge').hidden=true;$('fold').hidden=p!=='explore'||(!touchLayout()&&(focus>-.965||target>-.965))}
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
// Blend the blurred image once, through a continuously feathered overlap mask.
// Never cut and paste separate strips into the rendered paper.
const seamSource=document.createElement('canvas'),seamBlur=document.createElement('canvas');
const seamMask=document.createElement('canvas'),seamFeather=document.createElement('canvas');
const seamSourceCtx=seamSource.getContext('2d'),seamBlurCtx=seamBlur.getContext('2d');
const seamMaskCtx=seamMask.getContext('2d'),seamFeatherCtx=seamFeather.getContext('2d');
function diffuseCanvas(out,source,radius,w,h){
 out.setTransform(1,0,0,1,0,0);out.globalAlpha=1;out.globalCompositeOperation='source-over';out.clearRect(0,0,w,h);
 if(typeof out.filter==='string'){
  out.filter='blur('+radius+'px)';out.drawImage(source,0,0);out.filter='none';
 }else{
  out.globalCompositeOperation='lighter';
  const weights=[1,4,6,4,1];
  for(let j=0;j<5;j++)for(let i=0;i<5;i++){
   out.globalAlpha=weights[i]*weights[j]/256;
   out.drawImage(source,(i-2)*radius,(j-2)*radius);
  }
  out.globalAlpha=1;out.globalCompositeOperation='source-over';
 }
}
function softenOverlapSeams(m,dpr,w,h){
 const sheets=silhouettes.filter(s=>s.p.opacity>.05&&s.L.length===2);
 if(sheets.length<2)return;
 const bounds=sheets.map(s=>({s,minX:Math.min(...s.poly.map(v=>v[0])),maxX:Math.max(...s.poly.map(v=>v[0])),minY:Math.min(...s.poly.map(v=>v[1])),maxY:Math.max(...s.poly.map(v=>v[1]))}));
 const pairs=bounds.map(a=>bounds.filter(b=>a!==b&&a.minX<b.maxX&&a.maxX>b.minX&&a.minY<b.maxY&&a.maxY>b.minY));
 if(!pairs.some(p=>p.length))return;
 if(seamSource.width!==w||seamSource.height!==h){seamSource.width=seamBlur.width=w;seamSource.height=seamBlur.height=h}
 const mw=Math.ceil(m.W),mh=Math.ceil(m.viewportH);
 if(seamMask.width!==mw||seamMask.height!==mh){seamMask.width=seamFeather.width=mw;seamMask.height=seamFeather.height=mh}
 const mask=seamMaskCtx;
 mask.setTransform(1,0,0,1,0,0);mask.clearRect(0,0,mw,mh);mask.setTransform(1,0,0,1,0,m.topInset);
 const trace=poly=>{mask.beginPath();poly.forEach((p,i)=>i?mask.lineTo(p[0],p[1]):mask.moveTo(p[0],p[1]));mask.closePath()};
 mask.strokeStyle='#fff';mask.lineWidth=8;mask.lineJoin='round';mask.lineCap='round';
 bounds.forEach((a,i)=>{
  if(!pairs[i].length)return;
  mask.save();trace(a.s.poly);mask.clip();
  for(const b of pairs[i]){trace(b.s.poly);mask.stroke()}
  mask.restore();
 });
 // Feather the mask itself, so the blur strength fades smoothly to zero.
 diffuseCanvas(seamFeatherCtx,seamMask,2.5,mw,mh);
 seamSourceCtx.setTransform(1,0,0,1,0,0);seamSourceCtx.clearRect(0,0,w,h);seamSourceCtx.drawImage(surface,0,0);
 diffuseCanvas(seamBlurCtx,seamSource,1.8*dpr,w,h);
 seamBlurCtx.globalCompositeOperation='destination-in';seamBlurCtx.drawImage(seamFeather,0,0,w,h);
 seamBlurCtx.globalCompositeOperation='source-over';
 // Premultiplied-alpha interpolation: original*(1-mask) + blur*mask.
 // A single composition avoids repeated anti-aliased clip boundaries.
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
 ctx.globalCompositeOperation='destination-out';ctx.drawImage(seamFeather,0,0,w,h);
 ctx.globalCompositeOperation='lighter';ctx.drawImage(seamBlur,0,0);
 ctx.restore();
}
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
 if(phase==='explore')softenOverlapSeams(m,dpr,w,h);
}
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function pick(e){const r=root.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(let j=silhouettes.length-1;j>=0;j--){let s=silhouettes[j];if(s.p.opacity>.3&&inside(x,y,s.poly))return s.i}return -1}
scene.addEventListener('click',e=>{if(treeReturn||e.target.closest('.project-tree'))return;if(phase==='intro'){if(performance.now()>=blockClick&&!e.target.closest('#nav, #reset, #detail'))start();return}if(phase!=='explore'||performance.now()<blockClick||e.target.closest('.anchor, #nav, #reset, #detail, .heading'))return;const i=pick(e);if(i<0)return;if(i!==Math.round(focus)){target=i;wheelAt=0;return}open(i)});

function measure(){
 const r=root.getBoundingClientRect(),s=scene.getBoundingClientRect(),W=r.width,V=s.height;
 // Fixed intro paper size; shrink only to fit a small viewport.
 const w=Math.min(185,W*.43); // Restore original intro stack size; keep revised forest layout.
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
// Contact uses the restored circle radius, including squash.
function circleBottom(u){const stretch=u>=HIT?1+.06*Math.sin(Math.PI*clamp((u-HIT)/.12)):1;return 7*stretch}
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
const actualMobileReader=()=>navigator.maxTouchPoints>0&&(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
function panelTarget(m){
 const W=m.W,H=m.viewportH,rotated=actualMobileReader()&&detail.classList.contains('has-slides')&&H>W;
 const pad=clamp(W*.018,8,22),iw=rotated?Math.min(H*.86-2*pad,(W*.82-2*pad)*16/9):Math.min(W*(mobile()?.92:.86)-2*pad,(H*.72-2*pad)*16/9),w=iw+2*pad,h=iw*9/16+2*pad;
 detail.classList.toggle('mobile-rotated-reader',rotated);
 return {x:(W-w)/2,y:(H-h)/2,w,h,pad,rotated};
}
function detailProgress(now){return phase==='closing'?closeFrom*(1-clamp((now-closingAt)/CLOSE_MS)):phase==='detail'?1:clamp((now-openedAt)/OPEN_MS)}
function renderPanel(m,u){
 if(!impactAnchor||u<PUSH){detail.classList.remove('morphing','visible','content-ready');return}
 const t=ease(clamp((u-PUSH)/(.92-PUSH))),dest=panelTarget(m),r=7,dot=currentDot(PUSH,m);
 const w=mix(r*2,dest.w,t),h=mix(r*2,dest.h,t);
 const x=mix(dot.x-r,dest.x,t),y=mix(dot.y+m.topInset-r,dest.y,t);
 detail.style.left=x+'px';detail.style.top=y+'px';detail.style.width=w+'px';detail.style.height=h+'px';detail.style.borderRadius=mix(r,2,t)+'px';
 detail.style.setProperty('--reader-angle',dest.rotated?String(-90*t)+'deg':'0deg');
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
  else{unfold=Math.min(1,unfold+playDt/(LAUNCH_END*1.5));unfoldTarget=1}
  if(drag){drag=null;scene.classList.remove('dragging')}
 }
 if(phase==='animation'&&returning&&unfold===0&&unfoldTarget===0){returning=false;launchLocked=false;lastWheel=performance.now();setPhase('intro');$('eyebrow').textContent='01 / LAYERS';$('headline').textContent='지금의 나를 이루기까지';$('hint').textContent=mobile()?'터치하여 레이어를 펼치세요.':'클릭하여 레이어를 펼치세요.';$('nav').hidden=true;cards.forEach((o,i)=>o.card.disabled=i!==0)}
 if(phase==='animation'&&unfold===1&&unfoldTarget===1){clearIntroControl();autoUnfold=false;launchLocked=false;gate=true;lastWheel=performance.now();setPhase('explore');unfold=unfoldTarget=1;$('nav').hidden=false;$('hint').textContent=mobile()?'좌우로 탐색 · 아래로 드래그하여 접기':'스크롤하여 탐색';$('eyebrow').textContent='02 / EXPLORE';$('headline').textContent='';cards.forEach(o=>o.card.disabled=false)}
 const time=unfold*LAUNCH_END;const archive=phase==='explore'||(!treeReturn&&(phase==='opening'||phase==='detail'||phase==='closing'));
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
     const contact=alignTop({...start},m,i,hit.x,hit.y+5+circleBottom(HIT));
     const release=HIT+(PUSH-HIT)*.56;
     const pushedDot=flight(release,m);
     const pushed=alignTop({...contact},m,i,pushedDot.x,pushedDot.y+circleBottom(release));
     if(u<HIT){
      const q=clamp(u/HIT);p=between(start,contact,ease(q));
     }else if(u<=release){
      // The paper edge stays in contact with the underside of the moving dot.
      const dot=flight(u,m);
      p=alignTop({...contact},m,i,dot.x,dot.y+circleBottom(u));
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
  if(treeReturn){p.opacity=0;}
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
  const bottom=Math.max(...vertices.map(v=>v[1]));
  growing.style.left=(right-12)+'px';
  growing.style.top=(bottom+m.topInset-12)+'px';
  updateForestLabels({left,right,top:top+m.topInset,bottom:bottom+m.topInset});
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
  const seedRight=endX-(m.W<=650?6:36);
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
 futureTextPath.setAttribute('startOffset','54%');
 futureText.setAttribute('font-size','11');futureText.setAttribute('letter-spacing','.35');
 const back=$('fold'),br=root.getBoundingClientRect();
 back.hidden=touchBack?phase!=='explore':!atStart;back.classList.toggle('mobile-fold',touchBack);back.style.left=touchBack?'50%':(br.left+ba.x)+'px';back.style.top=touchBack?'auto':(br.top+ba.y+5)+'px';
 const tangent=Math.atan2(trackY(ba.x+1,m)-trackY(ba.x-1,m),2)*180/Math.PI;
 back.style.setProperty('--back-angle',touchBack?'-90deg':tangent+'deg');
 const edgeBack=$('foldEdge');edgeBack.hidden=!touchBack||!atStart;edgeBack.style.left=(br.left+ba.x)+'px';edgeBack.style.top=(br.top+ba.y+5)+'px';edgeBack.style.setProperty('--back-angle',tangent+'deg');$('counter').textContent=(Math.max(0,Math.round(focus)+1))+' / '+N;$('prev').disabled=target<=-1;$('next').disabled=target>=N-1;
 if(selected>=0&&['opening','detail','closing'].includes(phase)){if(treeReturn)renderTreePanel(m,detailProgress(now));else renderPanel(m,detailProgress(now));}
 if(treeReturn)updateForestLabels();
 if(phase==='opening'&&now-openedAt>=OPEN_MS){addFruit(items[selected]);setPhase('detail');detail.classList.add('visible');detail.setAttribute('aria-hidden','false')}
 if(phase==='closing'&&now-closingAt>=CLOSE_MS){target=Math.round(focus);selected=-1;impactPose=null;impactAnchor=null;detail.classList.remove('morphing','visible','content-ready');if(treeReturn){const back=treeReturn;treeReturn=null;back.tree?.classList.remove('tree-chosen');scene.classList.remove('tree-route');setPhase(back.phase);updateForestLabels();$('nav').hidden=back.phase==='intro';}else setPhase('explore')}
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
function start(){if(phase!=='intro')return;enterTransition();clearIntroControl();target=focus=returnFocus;autoUnfold=true;unfoldTarget=1;$('hint').textContent=''}
function navigate(delta,axis='y'){
 if(returning||phase==='animation')return;
 if(!delta||!['intro','explore'].includes(phase))return;
 if(axis==='x'){
  if(phase==='explore')target=clamp(target+delta,-1,N-1);
  return;
 }
 if(phase==='explore'){if(delta>=0)return;enterTransition();clearIntroControl();autoUnfold=false;unfoldTarget=0;returning=true;return}
 if(phase==='intro'){if(delta<=0)return;start();return}
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
  // Expand only the texture sampling triangles, then clip the entire sheet once.
  // This covers subpixel antialias gaps without drawing outside the paper.
  const points=[d0,d1,d2],cx=(d0[0]+d1[0]+d2[0])/3,cy=(d0[1]+d1[1]+d2[1])/3;
  const expanded=points.map(p=>{const dx=p[0]-cx,dy=p[1]-cy,k=1+1.5/Math.max(.01,Math.hypot(dx,dy));return [cx+dx*k,cy+dy*k]});
  // Use offset edge lines rather than radial expansion for narrow triangles.
  const edges=points.map((p,i)=>{const q=points[(i+1)%3],dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1;let nx=-dy/len,ny=dx/len;if((cx-p[0])*nx+(cy-p[1])*ny>0){nx=-nx;ny=-ny}return {x:p[0]+nx*.85,y:p[1]+ny*.85,dx,dy}});
  const clip=edges.map((e,i)=>{const f=edges[(i+2)%3],den=e.dx*f.dy-e.dy*f.dx;if(Math.abs(den)<1e-8)return expanded[i];const t=((f.x-e.x)*f.dy-(f.y-e.y)*f.dx)/den;return [e.x+e.dx*t,e.y+e.dy*t]});
  g.save();g.beginPath();g.moveTo(...clip[0]);g.lineTo(...clip[1]);g.lineTo(...clip[2]);g.closePath();g.clip();
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
   g.save();g.beginPath();
   // Union of the quadrilaterals: consistent winding even as the sheet curls.
   for(let j=0;j<N;j++){let poly=[nodes[j].top,nodes[j+1].top,nodes[j+1].bottom,nodes[j].bottom];let area=0;for(let k=0;k<4;k++){const a=poly[k],b=poly[(k+1)%4];area+=a[0]*b[1]-b[0]*a[1]}if(area<0)poly.reverse();g.moveTo(...poly[0]);for(let k=1;k<4;k++)g.lineTo(...poly[k]);g.closePath()}
   g.clip();
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
   }
   // A single continuous gradient over the sheet avoids individual strip shadows.
   const x0=Math.min(...nodes.map(n=>n.top[0])),x1=Math.max(...nodes.map(n=>n.top[0]));
   if(x1-x0>.01){
    const shade=g.createLinearGradient(x0,0,x1,0);
    for(let j=0;j<=16;j++){const u=j/16,angle=Math.PI*.5*q+bend*radius*(u-.5);shade.addColorStop(u,'rgba(30,42,32,'+Math.min(.23,Math.abs(Math.sin(angle))*.16)+')')}
    g.fillStyle=shade;g.fillRect(-pad,-pad,W+2*pad,H+2*pad);
   }
   g.restore();g.globalAlpha=1;
   if(t<1)requestAnimationFrame(frameTurn);else resolve(true);
  }
  requestAnimationFrame(frameTurn);
 });
}
async function moveRaonSlide(direction){
 if(slideBusy||!detail.classList.contains('has-slides')||phase!=='detail')return;
 const next=clamp(raonSlideIndex+direction,0,projectPages.length-1);if(next===raonSlideIndex)return;
 resetPageZoom();
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
// Touch gestures are confined to the page viewport, not the browser viewport.
const pageMedia=$('raonReader').querySelector('.raon-reader-media');
const pageTouches=new Map();let pageZoom=1,pagePanX=0,pagePanY=0,pageGesture=null;
function applyPageZoom(){
 const W=pageMedia.clientWidth,H=pageMedia.clientHeight;
 pagePanX=clamp(pagePanX,-W*(pageZoom-1)/2,W*(pageZoom-1)/2);
 pagePanY=clamp(pagePanY,-H*(pageZoom-1)/2,H*(pageZoom-1)/2);
 $('raonSlide').style.transform='translate('+pagePanX+'px,'+pagePanY+'px) scale('+pageZoom+')';
 pageMedia.classList.toggle('page-zoomed',pageZoom>1.001);
}
function resetPageZoom(){pageZoom=1;pagePanX=pagePanY=0;pageTouches.clear();pageGesture=null;applyPageZoom()}
function pagePoint(e){
 const r=pageMedia.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2);
 return detail.classList.contains('mobile-rotated-reader')?{x:-y,y:x}:{x,y};
}
function beginPinch(){
 const [a,b]=[...pageTouches.values()];
 pageGesture={kind:'pinch',distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),scale:pageZoom,x:(a.x+b.x)/2,y:(a.y+b.y)/2,panX:pagePanX,panY:pagePanY};
}
pageMedia.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'||phase!=='detail'||slideBusy)return;
 e.preventDefault();pageMedia.setPointerCapture(e.pointerId);const p=pagePoint(e);pageTouches.set(e.pointerId,p);
 if(pageTouches.size===2)beginPinch();
 else if(pageTouches.size===1)pageGesture={kind:pageZoom>1.001?'pan':'swipe',x:p.x,y:p.y,panX:pagePanX,panY:pagePanY};
});
pageMedia.addEventListener('pointermove',e=>{
 if(!pageTouches.has(e.pointerId)||!pageGesture)return;
 const p=pagePoint(e);pageTouches.set(e.pointerId,p);const g=pageGesture;
 if(g.kind==='pinch'&&pageTouches.size>=2){
  const [a,b]=[...pageTouches.values()],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
  pageZoom=clamp(g.scale*Math.hypot(b.x-a.x,b.y-a.y)/g.distance,1,5);
  const k=pageZoom/g.scale;pagePanX=mx-(g.x-g.panX)*k;pagePanY=my-(g.y-g.panY)*k;applyPageZoom();
 }else if(g.kind==='pan'){pagePanX=g.panX+p.x-g.x;pagePanY=g.panY+p.y-g.y;applyPageZoom()}
});
function finishPagePointer(e){
 if(!pageTouches.has(e.pointerId))return;
 const p=pagePoint(e),g=pageGesture;pageTouches.delete(e.pointerId);
 if(pageTouches.size===1){const v=[...pageTouches.values()][0];pageGesture={kind:'pan',x:v.x,y:v.y,panX:pagePanX,panY:pagePanY};return}
 if(pageTouches.size){beginPinch();return}
 pageGesture=null;
 if(e.type==='pointerup'&&g?.kind==='swipe'&&pageZoom<=1.001){const dx=p.x-g.x,dy=p.y-g.y;if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.3)moveRaonSlide(dx<0?1:-1)}
}
pageMedia.addEventListener('pointerup',finishPagePointer);pageMedia.addEventListener('pointercancel',finishPagePointer);
let openingRequest=0;
function renderTreePanel(m,u){
 const dest=panelTarget(m),origin=treeReturn.origin;
 // One continuous, restrained translation and uniform enlargement.
 const t=ease(clamp((u-.12)/.88)),appear=ease(clamp((u-.08)/.32));
 if(u<.08){detail.classList.remove('morphing','visible','content-ready');return}
 const initialScale=clamp(Math.min(origin.w/dest.w,origin.h/dest.h)*.62,.06,.20);
 const scale=mix(initialScale,1,t),w=dest.w*scale,h=dest.h*scale;
 const cx=mix(origin.x,dest.x+dest.w/2,t),cy=mix(origin.y,dest.y+dest.h/2,t);
 detail.style.left=(cx-w/2)+'px';detail.style.top=(cy-h/2)+'px';detail.style.width=w+'px';detail.style.height=h+'px';detail.style.borderRadius=mix(4,2,t)+'px';
 detail.style.setProperty('--tree-reveal',String(appear));
 detail.style.setProperty('--reader-angle',dest.rotated?String(-90*t)+'deg':'0deg');
 detail.style.setProperty('--paper-pad',dest.pad+'px');detail.style.setProperty('--page-width',dest.w+'px');detail.style.setProperty('--page-height',dest.h+'px');
 detail.style.setProperty('--page-scale-x',String(scale));detail.style.setProperty('--page-scale-y',String(scale));detail.style.setProperty('--page-clip-radius',mix(4,2,t)+'px');detail.style.setProperty('--reveal',String(ease(clamp((u-.65)/.35))));
 detail.classList.add('morphing','content-ready');detail.classList.toggle('visible',phase==='detail');
}
async function openFromTree(i,tree){
 if(treeOpening||treeReturn||i<0||!['intro','explore'].includes(phase))return;
 treeOpening=true;const b=tree.querySelector('.project-tree-layers').getBoundingClientRect(),from=phase;
 treeReturn={phase:from,tree,origin:{x:b.left+b.width/2,y:b.top+b.height*.48,w:b.width,h:b.height}};
 drag=null;velocity=0;wheelAt=0;
 try{await open(i)}finally{treeOpening=false}
}
async function open(i,restore=null){
 if((phase!=='explore'&&!treeReturn)||!items[i])return;
 const request=++openingRequest,p=items[i],pages=pagesFor(p),hasPages=pages.length>0;
 const pageIndex=hasPages?clamp(Math.trunc(restore?.pageIndex||0),0,pages.length-1):0;
 let loaded=false;
 if(hasPages){
  try{const ready=await preparePage(pageIndex,pages);if(request!==openingRequest||(phase!=='explore'&&!treeReturn))return;const img=$('raonSlide');img.src=ready.src;await img.decode();loaded=true;}catch(err){}
  if(request!==openingRequest||(phase!=='explore'&&!treeReturn))return;
 }
 target=focus;wheelAt=0;scrollSpeed=0;selected=i;visited.add(i);velocity=0;
 const m=measure();impactPose=restore?archivePose(i,m):{...poses[i]};impactAnchor=anchorAt(i,m);
 ++slideEpoch;slideBusy=false;projectPages=pages;readerTitle=p.title;resetPageZoom();
 detail.classList.remove('raon-mode');detail.classList.add('portfolio-mode');detail.classList.toggle('has-slides',hasPages);
 const reader=$('raonReader');reader.hidden=!hasPages;reader.setAttribute('aria-label',p.title+' 포트폴리오 '+pages.length+'페이지');detail.classList.remove('slide-loaded');
 $('category').textContent=p.category||'';
 $('projectTitle').textContent=p.title;
 $('projectDesc').textContent=p.description||'';
 const ph=$('placeholder');ph.replaceChildren();
 if(hasPages){raonSlideIndex=pageIndex;const img=$('raonSlide');if(loaded){img.alt=readerTitle+' 포트폴리오 '+(pageIndex+1)+' / '+pages.length+' 페이지';img.style.visibility='visible';detail.classList.add('slide-loaded');updatePageNav();warmPages(pageIndex)}else renderRaonSlide();}
 else if(p.url){const link=document.createElement('a');link.href=p.url;link.textContent='View project';ph.append(link);}
 if(treeReturn){treeReturn.tree?.classList.add('tree-chosen');scene.classList.add('tree-route')}
 openedAt=performance.now();if(restore){setPhase('detail');if(treeReturn)renderTreePanel(m,1);else renderPanel(m,1);detail.setAttribute('aria-hidden','false')}else setPhase('opening');
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
function clearIntroControl(){drag=null;scene.classList.remove('dragging')}
scene.addEventListener('wheel',e=>{
 if(treeReturn||!['intro','animation','explore'].includes(phase))return;e.preventDefault();
 const now=performance.now(),gap=now-lastWheel;lastWheel=now;
 if(returning||phase==='animation')return;
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
 }else navigate(clamp(delta/105,-1.5,1.5),'y');
},{passive:false});
scene.addEventListener('pointerdown',e=>{
 // Touch gestures during the intro are owned exclusively by the touch handlers below.
 if(e.pointerType==='touch'&&(phase==='intro'||phase==='animation'))return;
 if(phase==='intro'&&e.pointerType==='pen'&&e.isPrimary!==false){e.preventDefault();start();return}
 if(returning||!['intro','explore'].includes(phase)||e.target.closest('#nav')||e.button!==0)return;
 if(phase==='explore'&&wheelAt){wheelAt=0;scrollSpeed=0;wheelDirection=0;target=focus}
 drag={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false,axis:null,lastY:e.clientY,startTarget:target,touch:e.pointerType==='touch'};velocity=0;lastDragX=e.clientX;lastDragT=performance.now();
});
window.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id||phase==='animation')return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.axis&&Math.hypot(dx,dy)>7){drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';drag.moved=true;scene.classList.add('dragging')}
 if(!drag.axis||launchLocked||returning)return;
 const now=performance.now(),m=measure();
 if(drag.axis==='y'&&(mobile()||phase!=='explore'))navigate(-(e.clientY-drag.lastY)/(m.viewportH*.16),'y');
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
 scene.classList.remove('dragging');
}
// The pointer only highlights the unopened stack; playback cannot be scrubbed.
scene.addEventListener('pointermove',e=>{
 if(e.pointerType==='mouse'&&phase==='intro')scene.classList.toggle('intro-card-hover',pick(e)>=0);
});
scene.addEventListener('pointerleave',()=>scene.classList.remove('intro-card-hover'));
// Own the initial touch and consume further touches until the transition is complete.
let introTouch=null;
scene.addEventListener('touchstart',e=>{
 if(!['intro','animation'].includes(phase)||e.target.closest('#nav, #reset, #detail, .project-tree'))return;
 const t=e.changedTouches[0];if(!t)return;
 if(e.cancelable)e.preventDefault();
 if(introTouch)return;
 introTouch={id:t.identifier};drag=null;
 if(phase==='intro')start();
},{passive:false});
window.addEventListener('touchmove',e=>{
 if(introTouch&&e.cancelable)e.preventDefault();
},{passive:false});
function finishIntroTouch(e){
 if(!introTouch||!Array.from(e.changedTouches).some(v=>v.identifier===introTouch.id))return;
 if(e.cancelable)e.preventDefault();
 introTouch=null;drag=null;
}
window.addEventListener('touchend',finishIntroTouch,{passive:false});
window.addEventListener('touchcancel',finishIntroTouch,{passive:false});
window.addEventListener('blur',()=>{introTouch=null;drag=null});
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
 const state={phase,treeOrigin:treeReturn?.phase||null,focus,anchor:itemKey(p),offset:focus-anchor,unfold,returning,selected:itemKey(items[selected]),page:raonSlideIndex,pageUrl:projectPages[raonSlideIndex]||null,visited:[...visited].map(i=>itemKey(items[i])).filter(Boolean)};
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
   if(s.treeOrigin){const tree=[...forest.querySelectorAll('.project-tree')][forestProjects.indexOf(items[i])];if(tree){const b=tree.getBoundingClientRect();treeReturn={phase:s.treeOrigin,tree,origin:{x:b.left+b.width/2,y:b.top+b.height*.48,w:b.width,h:b.height}};tree.classList.add('tree-chosen');scene.classList.add('tree-route')}}
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
