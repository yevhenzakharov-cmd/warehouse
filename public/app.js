import {parkEquipment,swapEquipment,restoreEquipment} from './movement.js';
import {fits as geometryFits,perimeterPath} from './geometry.js';
const fits=(c,cs)=>geometryFits(c,cs,plan.geometry);
import {validatePlan} from './validate.js';
const $=id=>document.getElementById(id);
const ns='http://www.w3.org/2000/svg';
let plan=null,base=null,etag=null,history=[],revision=0,selected=null,filter=null,undoStack=[],redoStack=[],zoom=1,saving=false,drag=null,toastTimer;
const clone=value=>structuredClone(value);
const dirty=()=>plan&&JSON.stringify(plan)!==JSON.stringify(base);
const category=id=>plan.categories.find(c=>c.id===id);
const cage=()=>plan?.cages.find(c=>c.id===selected);
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000)}
function notice(message,error=false){$('notice').hidden=!message;$('notice').textContent=message||'';$('notice').classList.toggle('error-notice',error)}
async function api(path,options={}){
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json().catch(()=>({error:'Сервер повернув неочікувану відповідь.'}));
  if(!response.ok){const error=Error(data.error||'Не вдалося виконати запит.');error.status=response.status;throw error}
  return data;
}
async function load(){
  const data=await api('/api/plan');plan=validatePlan(data.plan);base=clone(plan);etag=data.etag;history=data.history;revision=data.revision;undoStack=[];redoStack=[];selected=null;filter=null;
  $('app').hidden=false;notice('');render();requestAnimationFrame(normalView);
}
function checkpoint(){undoStack.push(clone(plan));if(undoStack.length>50)undoStack.shift();redoStack=[]}
function change(action){checkpoint();action();render()}
function updateStatus(){
  const changed=dirty();$('save').disabled=!changed||saving;$('undo').disabled=!undoStack.length||saving;$('redo').disabled=!redoStack.length||saving;
  $('save-status').textContent=saving?'Збереження…':changed?'Є незбережені зміни':revision?'Збережено · версія '+revision:'Початковий план';
  $('save-status').className='save-status'+(changed?' unsaved':'');
}
function svgEl(tag,attrs,parent){const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));parent.appendChild(el);return el}
function structure(){
 const parent=$('map-structure');parent.replaceChildren();const g=plan.geometry;const hasStairs=g.obstacles.some(o=>o.kind==='stairs');const defs=svgEl('defs',{},parent),pattern=svgEl('pattern',{id:'walkway-hatch',width:16,height:16,patternUnits:'userSpaceOnUse'},defs);svgEl('path',{d:'M-4 4 L4 -4 M0 16 L16 0 M12 20 L20 12',stroke:'#526c5b','stroke-width':1},pattern);
 $('warehouse-map').setAttribute('viewBox',`-40 -50 ${g.width+80} ${g.length+100}`);
 svgEl('path',{d:perimeterPath(g),class:'wall', 'stroke-dasharray':g.envelopeConfirmed?'none':'10 5'},parent);
 svgEl('text',{x:g.width/2,y:-20,'text-anchor':'middle',class:'room-label'},parent).textContent=(g.width/100)+' м · '+(g.envelopeConfirmed?'між стінами':'попередньо');
 svgEl('text',{x:g.obstacles.some(o=>o.kind==='opening'&&o.wall==='south')?g.width/4:g.width/2,y:g.length+30,'text-anchor':'middle',class:'room-label'},parent).textContent=(g.length/100)+' м · довжина';
 for(const o of g.obstacles){if(o.kind==='rack'){svgEl('rect',{x:o.x,y:o.y,width:o.width,height:o.height,class:'fixed-rack'},parent);for(let x=o.x+80;x<o.x+o.width;x+=80)svgEl('path',{d:`M${x} ${o.y} V${o.y+o.height}`,class:'rack-divider'},parent);svgEl('text',{x:o.x+o.width/2,y:o.y+o.height/2+5,'text-anchor':'middle',class:'rack-label'},parent).textContent=o.name;continue}if(o.kind==='opening'&&o.wall==='south'){svgEl('rect',{x:o.x,y:o.y,width:o.width,height:o.height,class:'cold-access'},parent);svgEl('text',{x:o.x+o.width/2,y:o.y+25,'text-anchor':'middle',class:'cold-label'},parent).textContent=o.name;svgEl('path',{d:`M${o.x+o.width/2} ${o.y+42} V${o.y+o.height+26} l-8 -10 m8 10 l8 -10`,class:'cold-arrow'},parent);continue}if(o.kind==='opening'){svgEl('rect',{x:o.x,y:o.y,width:o.width,height:o.height,class:'ramp-access'},parent);svgEl('path',{d:`M${o.x+55} ${o.y+50} H${o.x-26} l10 -7 m-10 7 l10 7`,class:'ramp-arrow'},parent);svgEl('text',{x:o.x+40,y:o.y+25,'text-anchor':'middle',class:'ramp-label'},parent).textContent='РАМПА';continue}if(o.kind==='stairs'){svgEl('rect',{x:o.x,y:o.y,width:o.width,height:o.height,class:'stairs-zone'},parent);for(let i=1;i<(o.steps||15);i++)svgEl('path',{d:`M${o.x+o.width*i/(o.steps||15)} ${o.y} V${o.y+o.height}`,class:'stairs-step'},parent);svgEl('path',{d:`M${o.x+o.width-8} ${o.y+o.height/2+20} H${o.x+8} l9 -7 m-9 7 l9 7`,class:'stairs-arrow'},parent);const text=svgEl('text',{x:o.x+o.width/2,y:o.y+o.height/2-14,'text-anchor':'middle',class:'stairs-label'},parent);svgEl('tspan',{x:o.x+o.width/2},text).textContent='СХОДИ ДО ОФІСУ · 2 ПОВЕРХ';svgEl('tspan',{x:o.x+o.width/2,dy:17},text).textContent='орієнтовне розміщення';svgEl('text',{x:o.x+o.width/2,y:o.y-34,'text-anchor':'middle',class:'stairs-label'},parent).textContent='≈80 см';continue}if(o.kind==='door'&&o.wall==='east'){const edge=o.x+o.width;svgEl('rect',{x:o.x,y:o.y,width:o.width,height:o.height,class:'door-access'},parent);svgEl('path',{d:`M${edge} ${o.y} H${o.x} M${o.x} ${o.y} A${o.width} ${o.height} 0 0 0 ${edge} ${o.y+o.height}`,class:'door-symbol'},parent);svgEl('text',{x:o.x+o.width/2,y:o.y+o.height/2+5,'text-anchor':'middle',class:'door-label sales-door-label'},parent).textContent=o.name;continue}if(o.kind==='door'){const x=o.x,y=o.y,w=o.width;svgEl('rect',{x,y,width:w,height:o.height,class:'door-access'},parent);svgEl('path',{d:`M${x} ${y} H${x+w}`,class:'door-opening'},parent);svgEl('path',{d:`M${x} ${y} V${y+w} M${x} ${y+w} A${w} ${w} 0 0 0 ${x+w} ${y}`,class:'door-symbol'},parent);const text=svgEl('text',{x:x+w/2,y:y+o.height+22,'text-anchor':'middle',class:'door-label'},parent);svgEl('tspan',{x:x+w/2},text).textContent='ДВЕРІ';svgEl('tspan',{x:x+w/2,dy:16},text).textContent='ширина ?';continue}svgEl('rect',{x:o.x,y:o.y,width:o.width,height:o.height,class:o.kind==='aisle'?'room reserved-aisle':'room', 'stroke-dasharray':o.confirmed?'none':'6 4'},parent);svgEl('text',{x:o.x+o.width/2,y:o.y+o.height/2,'text-anchor':'middle',class:'room-label',...(o.height>o.width?{transform:`rotate(-90 ${o.x+o.width/2} ${o.y+o.height/2})`}:{})},parent).textContent=o.kind==='aisle'&&o.y===g.length-80?'ВХІД':hasStairs&&o.kind==='aisle'&&o.width===g.width?'ПРОХІД · ВІЛЬНО · ≈'+(o.height/100).toLocaleString('uk-UA')+' м':o.name+(o.confirmed?'':' ?')}
 $('dimension-status').textContent=g.confirmed?'Геометрію підтверджено':g.envelopeConfirmed?'РОЗМІРИ ПІДТВЕРДЖЕНО · ширина дверей умовна':'ГЕОМЕТРІЯ ПОПЕРЕДНЯ · см';
}
function displayName(item){const standard=item.name.match(/^(?:Рол-кейдж|Оцінка|Пропозиція) (\d+)$/);return standard?standard[1]:item.name}
function wrap(text,maxChars=6,maxLines=2){const chars=Array.from(text.trim());const lines=[];while(chars.length&&lines.length<maxLines){const cut=chars.splice(0,maxChars).join('');lines.push(cut)}if(chars.length)lines[lines.length-1]=lines[lines.length-1].slice(0,-1)+'…';return lines}
function renderMap(){
  const parent=$('map-cages');parent.replaceChildren();
  for(const item of plan.cages){
    if(item.parked)continue;
    const cat=category(item.categoryId);
    const g=svgEl('g',{class:'cage'+(item.kind==='pallet'?' pallet':'')+(item.id===selected?' selected':'')+(filter&&filter!==item.categoryId?' inactive':''),transform:`translate(${item.x} ${item.y})`,'data-cage-id':item.id,role:'button',tabindex:'0','aria-label':item.name+', '+cat.name},parent);
    svgEl('title',{},g).textContent=item.name+' · '+cat.name;
    svgEl('rect',{width:item.width,height:item.height,rx:1},g);
    svgEl('path',{d:`M4 0 V${item.height} M${item.width-4} 0 V${item.height} M0 4 H${item.width} M0 ${item.height-4} H${item.width}`,class:'rail'},g);
    const text=svgEl('text',{x:item.width/2,y:12,class:'cage-label'},g);
    wrap(cat.shortName,Math.max(4,Math.floor((item.width-12)/8.4)),2).forEach((line,i)=>svgEl('tspan',{x:item.width/2,y:16+i*12},text).textContent=line);
    svgEl('tspan',{x:item.width/2,y:item.height-9,class:'cage-name'},text).textContent=wrap(displayName(item),7,1)[0];
  }
  updateMapLabels();
}
function updateMapLabels(){
  const width=$('warehouse-map').getBoundingClientRect().width;
  const show=true;
  document.querySelectorAll('.cage-label').forEach(t=>{t.style.display=show?'':'none';t.style.fontSize='14px'});
  document.querySelectorAll('.room-label').forEach(t=>t.style.fontSize=(width<500?'24':'13')+'px');
}
function updateInspector(){
  const item=cage();$('empty-selection').hidden=Boolean(item);$('cage-form').hidden=!item;
  if(!item)return;
  $('equipment-kind').value=item.kind||'cage';$('selected-id').textContent=item.id.toUpperCase();$('placement-state').textContent=item.parked?'Зараз поза схемою':'Зараз на плані';$('park-equipment').hidden=Boolean(item.parked);$('restore-equipment').hidden=!item.parked;$('swap-target').replaceChildren();for(const other of plan.cages){if(other.id===item.id||(other.parked&&item.parked))continue;const option=document.createElement('option');option.value=other.id;option.textContent=other.name+' · '+category(other.categoryId).shortName+(other.parked?' · поза схемою':'');$('swap-target').append(option)}$('swap-equipment').disabled=!$('swap-target').options.length;$('cage-name').value=item.name;$('cage-x').value=item.x;$('cage-y').value=item.y;$('cage-width').value=item.width;$('cage-depth').value=item.height;
  $('cage-category').replaceChildren();for(const cat of plan.categories){const option=document.createElement('option');option.value=cat.id;option.textContent=cat.name;$('cage-category').append(option)}$('cage-category').value=item.categoryId;
}
function renderCategories(){
  const list=$('category-list');list.replaceChildren();
  for(const cat of plan.categories){const button=document.createElement('button');button.className='category-row'+(filter===cat.id?' active':'');button.setAttribute('aria-pressed',String(filter===cat.id));const name=document.createElement('span');name.className='category-name';name.textContent=cat.name+(cat.targetShare!==undefined?' · ≈'+Math.round(cat.targetShare*100)+'%':'');const count=document.createElement('span');count.className='count';count.textContent=plan.cages.filter(c=>c.categoryId===cat.id).length;button.append(name,count);button.addEventListener('click',()=>{filter=filter===cat.id?null:cat.id;renderCategories();renderMap()});list.append(button)}
}
function renderHistory(){const list=$('history-list');list.replaceChildren();if(!history.length){list.textContent='Поки що немає збережень.';return}for(const entry of history.slice(0,8)){const row=document.createElement('div');row.className='history-item';const title=document.createElement('b');title.textContent='Версія '+entry.revision+' · '+new Date(entry.at).toLocaleString('uk-UA');const detail=document.createElement('span');detail.textContent=entry.summary;row.append(title,detail);list.append(row)}}
function render(){structure();renderMap();renderTray();renderCategories();updateInspector();updateStatus();renderHistory();$('cage-count').textContent=plan.cages.filter(c=>c.kind!=='pallet'&&!c.parked).length;$('pallet-count').textContent=plan.cages.filter(c=>c.kind==='pallet'&&!c.parked).length;requestAnimationFrame(()=>setZoom(zoom));$('parked-count').textContent=plan.cages.filter(c=>c.parked).length;$('category-count').textContent=plan.categories.length}
function select(id){selected=id;renderMap();renderTray();updateInspector()}
function point(event){const svg=$('warehouse-map'),p=new DOMPoint(event.clientX,event.clientY);return p.matrixTransform(svg.getScreenCTM().inverse())}
$('warehouse-map').addEventListener('pointerdown',event=>{
  const group=event.target.closest('[data-cage-id]');if(event.button!==0||saving)return;
  if(!group){event.preventDefault();drag={mode:'pan',pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,left:$('map-scroll').scrollLeft,top:$('map-scroll').scrollTop};$('warehouse-map').setPointerCapture(event.pointerId);return}
  event.preventDefault();selected=group.dataset.cageId;const item=cage(),p=point(event);
  drag={pointerId:event.pointerId,id:item.id,start:{x:item.x,y:item.y},offset:{x:p.x-item.x,y:p.y-item.y},candidate:clone(item),snapshot:clone(plan),moved:false};
  $('warehouse-map').setPointerCapture(event.pointerId);document.querySelectorAll('[data-cage-id]').forEach(g=>g.classList.toggle('selected',g.dataset.cageId===selected));updateInspector();
});
$('warehouse-map').addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointerId)return;
  if(drag.mode==='pan'){$('map-scroll').scrollLeft=drag.left+drag.startX-event.clientX;$('map-scroll').scrollTop=drag.top+drag.startY-event.clientY;return}
  const p=point(event),next={...drag.candidate,x:Math.round((p.x-drag.offset.x)/2)*2,y:Math.round((p.y-drag.offset.y)/2)*2};
  drag.candidate=next;drag.moved=Math.abs(next.x-drag.start.x)+Math.abs(next.y-drag.start.y)>2;
  const el=document.querySelector(`[data-cage-id="${drag.id}"]`);el.setAttribute('transform',`translate(${next.x} ${next.y})`);el.classList.add('dragging');el.classList.toggle('invalid',!fits(next,plan.cages));
});
function endDrag(event,cancelled=false){
  if(!drag||event.pointerId!==drag.pointerId)return;
  if(drag.mode==='pan'){drag=null;return}
  const completed=drag;drag=null;
  if(!cancelled&&completed.moved){
    if(fits(completed.candidate,plan.cages)){undoStack.push(completed.snapshot);if(undoStack.length>50)undoStack.shift();redoStack=[];Object.assign(cage(),{x:completed.candidate.x,y:completed.candidate.y});notice('')}
    else toast('Тут рол-кейдж перекриває інше місце або виходить за межі складу.');
  }
  render();
}
$('warehouse-map').addEventListener('pointerup',e=>endDrag(e));$('warehouse-map').addEventListener('pointercancel',e=>endDrag(e,true));
$('warehouse-map').addEventListener('keydown',event=>{
  const target=event.target.closest('[data-cage-id]');if(!target)return;
  if(event.key==='Enter'||event.key===' '){event.preventDefault();select(target.dataset.cageId);$('cage-name').focus();return}
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const delta=directions[event.key];if(!delta)return;event.preventDefault();selected=target.dataset.cageId;const step=event.shiftKey?10:2;const next={...cage(),x:cage().x+delta[0]*step,y:cage().y+delta[1]*step};if(fits(next,plan.cages)){change(()=>Object.assign(cage(),next));document.querySelector(`[data-cage-id="${selected}"]`)?.focus()}else toast('Рух у цей бік заблоковано.');
});
$('cage-form').addEventListener('submit',event=>{event.preventDefault();const next={...cage(),kind:$('equipment-kind').value,name:$('cage-name').value.trim(),categoryId:$('cage-category').value,x:Number($('cage-x').value),y:Number($('cage-y').value),width:Number($('cage-width').value),height:Number($('cage-depth').value)};if(!next.name||next.width<10||next.width>500||next.height<10||next.height>500||!fits(next,plan.cages)){toast('Перевірте назву та вільне місце на схемі.');return}change(()=>Object.assign(cage(),next));toast('Зміни застосовано. Збережіть спільний план.')});
$('rotate').addEventListener('click',()=>{const current=cage();if(!current)return;const next={...current,width:current.height,height:current.width};if(!fits(next,plan.cages))return toast('Недостатньо місця для повороту.');change(()=>Object.assign(cage(),next))});
$('remove-cage').addEventListener('click',()=>{const current=cage();if(current&&confirm('Видалити «'+current.name+'» зі схеми?'))change(()=>{plan.cages=plan.cages.filter(c=>c.id!==selected);selected=null})});
$('add-cage').addEventListener('click',()=>{
  if(!plan.geometry.cageWidth||!plan.geometry.cageDepth){openGeometry();return toast('Спочатку задайте розміри кейджа.')}
  if(plan.cages.length>=200)return toast('Досягнуто межі у 200 рол-кейджів.');
  const next={id:'cage-'+crypto.randomUUID(),name:'Новий рол-кейдж',categoryId:filter||plan.categories[0].id,width:plan.geometry.cageWidth,height:plan.geometry.cageDepth,x:0,y:0};
  for(let y=0;y<plan.geometry.length;y+=5)for(let x=0;x<plan.geometry.width;x+=5){next.x=x;next.y=y;if(fits(next,plan.cages)){change(()=>{plan.cages.push(next);selected=next.id});$('cage-name').focus();$('cage-name').select();return}}
  toast('Не знайдено вільного місця. Перемістіть наявні рол-кейджі.');
});
$('undo').addEventListener('click',()=>{if(!undoStack.length)return;redoStack.push(clone(plan));plan=undoStack.pop();if(!cage())selected=null;if(!category(filter))filter=null;render()});
$('redo').addEventListener('click',()=>{if(!redoStack.length)return;undoStack.push(clone(plan));plan=redoStack.pop();if(!cage())selected=null;if(!category(filter))filter=null;render()});
function categoryEditor(){
  const editor=$('category-editor');editor.replaceChildren();
  for(const cat of plan.categories){
    const form=document.createElement('form');form.className='category-edit-row';
    const fields=document.createElement('div');fields.className='category-edit-fields';
    const full=document.createElement('div'),short=document.createElement('div');
    const nameLabel=document.createElement('label');nameLabel.textContent='Повна назва';const nameInput=document.createElement('input');nameInput.value=cat.name;nameInput.required=true;nameInput.maxLength=60;nameInput.id='category-name-'+cat.id;nameLabel.htmlFor=nameInput.id;full.append(nameLabel,nameInput);
    const shortLabel=document.createElement('label');shortLabel.textContent='Підпис на схемі';const shortInput=document.createElement('input');shortInput.value=cat.shortName;shortInput.required=true;shortInput.maxLength=12;shortInput.id='category-short-'+cat.id;shortLabel.htmlFor=shortInput.id;short.append(shortLabel,shortInput);fields.append(full,short);
    const actions=document.createElement('div');actions.className='category-edit-actions';const count=plan.cages.filter(c=>c.categoryId===cat.id).length;const caption=document.createElement('span');caption.textContent=count+' рол-кейджів';const buttons=document.createElement('div');buttons.className='buttons';const save=document.createElement('button');save.textContent='Застосувати';save.type='submit';const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Видалити';remove.disabled=count>0||plan.categories.length===1;remove.title=count?'Спочатку перенесіть рол-кейджі в іншу категорію':'';remove.addEventListener('click',()=>{change(()=>{plan.categories=plan.categories.filter(c=>c.id!==cat.id);if(filter===cat.id)filter=null});categoryEditor()});buttons.append(save,remove);actions.append(caption,buttons);form.append(fields,actions);
    form.addEventListener('submit',event=>{event.preventDefault();const name=nameInput.value.trim(),shortName=shortInput.value.trim();if(!name||!shortName)return;change(()=>Object.assign(category(cat.id),{name,shortName}));categoryEditor();toast('Категорію оновлено. Збережіть план.')});editor.append(form);
  }
}
function openCategories(){categoryEditor();$('category-dialog').showModal()}
$('categories-button').addEventListener('click',openCategories);$('edit-categories').addEventListener('click',openCategories);$('close-categories').addEventListener('click',()=>$('category-dialog').close());
$('new-category-form').addEventListener('submit',event=>{event.preventDefault();const name=$('new-category-name').value.trim(),shortName=$('new-category-short').value.trim();if(!name||!shortName)return;if(plan.categories.length>=40)return toast('Підтримується до 40 категорій.');if(plan.categories.some(c=>c.name.toLowerCase()===name.toLowerCase()))return toast('Категорія з такою назвою вже існує.');change(()=>plan.categories.push({id:'category-'+crypto.randomUUID(),name,shortName}));$('new-category-form').reset();categoryEditor();toast('Категорію додано. Призначте їй рол-кейджі та збережіть план.')});
$('save').addEventListener('click',async()=>{
  if(saving||!dirty())return;saving=true;updateStatus();const snapshot=clone(plan),oldBase=clone(base);
  try{const changed=snapshot.cages.filter(c=>JSON.stringify(c)!==JSON.stringify(oldBase.cages.find(old=>old.id===c.id))).length;const data=await api('/api/plan',{method:'PUT',body:JSON.stringify({clientVersion:4,plan:snapshot,etag,summary:changed+' змінених рол-кейджів · '+snapshot.categories.length+' категорій'})});etag=data.etag;base=clone(snapshot);history=data.history;revision=data.revision;notice('');renderHistory();toast('Спільний план збережено.')}
  catch(error){notice(error.message,true);$('save-status').classList.add('failed')}
  finally{saving=false;updateStatus()}
});
$('refresh').addEventListener('click',async()=>{if(dirty()&&!confirm('Завантажити останню збережену версію? Поточні незбережені зміни буде втрачено. За потреби спочатку натисніть «Експорт».'))return;try{await load();toast('Завантажено останню версію.')}catch(e){notice(e.message,true)}});
$('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),plan},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='warehouse-plan-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
$('import').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>200000)throw Error('Файл завеликий. Максимум 200 КБ.');const parsed=JSON.parse(await file.text()),next=validatePlan(parsed.plan||parsed);if(!confirm('Замінити поточну чернетку імпортованим планом?'))return;change(()=>{plan=clone(next);selected=null;filter=null});notice('');toast('План імпортовано в чернетку. Збережіть його, щоб поділитися змінами.')}catch(e){notice(e.message||'Не вдалося прочитати файл.',true)}});
function setZoom(next){
 zoom=Math.min(3,Math.max(.25,next));if(plan){const scroll=$('map-scroll'),g=plan.geometry;const visibleHeight=window.visualViewport?.height||window.innerHeight;const ratio=(g.width+80)/(g.length+100);const baseWidth=Math.max(1,scroll.clientWidth-8);const drawingWidth=baseWidth*zoom;const naturalHeight=drawingWidth/ratio+40;scroll.style.height=(zoom<=1?naturalHeight:Math.min(naturalHeight,Math.max(240,visibleHeight*.8)))+'px';$('warehouse-map').style.width=drawingWidth+'px';scroll.classList.toggle('is-zoomed',zoom>1);if(zoom<=1){scroll.scrollLeft=0;scroll.scrollTop=0}}
 $('zoom-level').textContent=Math.round(zoom*100)+'%';$('zoom-out').disabled=zoom===.25;$('zoom-in').disabled=zoom===3;requestAnimationFrame(updateMapLabels)
}
$('zoom-in').addEventListener('click',()=>setZoom(Math.round((zoom+.25)*100)/100));$('zoom-out').addEventListener('click',()=>setZoom(Math.round((zoom-.25)*100)/100));
function revealPlan(compact=false){requestAnimationFrame(()=>$('map-scroll').closest('.map-panel').scrollIntoView({block:compact?'center':'start',inline:'nearest',behavior:'instant'}))}
function normalView(){setZoom(1);revealPlan()}
function fitView(){if(!plan)return;const scroll=$('map-scroll'),panel=scroll.closest('.map-panel'),g=plan.geometry;const visibleHeight=window.visualViewport?.height||window.innerHeight;const chrome=panel.querySelector('.panel-head').getBoundingClientRect().height+panel.querySelector('.map-footer').getBoundingClientRect().height;const naturalHeight=Math.max(1,scroll.clientWidth-8)*(g.length+100)/(g.width+80);setZoom(Math.min(1,Math.max(.25,(visibleHeight-chrome-88)/naturalHeight)));revealPlan(true)}
$('zoom-fit').addEventListener('click',fitView);$('zoom-reset').addEventListener('click',normalView);function resizeView(){setZoom(zoom)}window.addEventListener('resize',resizeView);window.visualViewport?.addEventListener('resize',resizeView);new ResizeObserver(()=>setZoom(zoom)).observe($('map-scroll'));
window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue=''}});
document.addEventListener('keydown',event=>{if(!plan||event.target.closest('input,textarea,select')||$('category-dialog').open)return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();(event.shiftKey?$('redo'):$('undo')).click()}});
new ResizeObserver(updateMapLabels).observe($('warehouse-map'));
setZoom(1);
load().catch(e=>{ $('app').hidden=false; notice(e.message,true); });

let obstacleDraft=[];
function obstacleEditor(){const box=$('obstacle-editor');box.replaceChildren();obstacleDraft.forEach((o,i)=>{const row=document.createElement('fieldset');const title=document.createElement('legend');title.textContent='Зона '+(i+1);row.append(title);const fields=[['name','Назва','text'],['kind','Тип','select'],['x','X, см','number'],['y','Y, см','number'],['width','Ширина, см','number'],['height','Глибина, см','number']];for(const [key,label,type]of fields){const l=document.createElement('label');l.textContent=label;const input=document.createElement(type==='select'?'select':'input');if(type==='select'){for(const [value,text]of [['room','Кімната'],['column','Колона'],['stairs','Сходи'],['door','Двері / доступ'],['aisle','Прохід'],['rack','Стелажі'],['opening','Відкритий прохід']]){const op=document.createElement('option');op.value=value;op.textContent=text;input.append(op)}}else {input.type=type;if(type==='number')input.step='0.1'}input.value=o[key]??'';input.required=true;input.addEventListener('input',()=>o[key]=type==='number'?Number(input.value):input.value);l.append(input);row.append(l)}const remove=document.createElement('button');remove.type='button';remove.textContent='Видалити зону';remove.onclick=()=>{obstacleDraft.splice(i,1);obstacleEditor()};row.append(remove);box.append(row)})}
function openGeometry(){const g=plan.geometry;$('warehouse-width').value=g.width;$('warehouse-length').value=g.length;$('default-width').value=g.cageWidth??'';$('default-depth').value=g.cageDepth??'';$('clearance').value=g.clearance;$('geometry-confirmed').checked=g.confirmed;obstacleDraft=clone(g.obstacles);obstacleEditor();$('geometry-error').textContent='';$('geometry-dialog').showModal()}
$('geometry-button').onclick=openGeometry;$('close-geometry').onclick=()=>$('geometry-dialog').close();
$('add-obstacle').onclick=()=>{obstacleDraft.push({name:'Нова зона',kind:'column',x:0,y:0,width:0,height:0,confirmed:false});obstacleEditor()};
$('geometry-form').onsubmit=e=>{e.preventDefault();try{const geometry={envelopeConfirmed:plan.geometry.envelopeConfirmed&&Number($('warehouse-width').value)===plan.geometry.width&&Number($('warehouse-length').value)===plan.geometry.length,width:Number($('warehouse-width').value),length:Number($('warehouse-length').value),cageWidth:$('default-width').value?Number($('default-width').value):null,cageDepth:$('default-depth').value?Number($('default-depth').value):null,clearance:Number($('clearance').value),confirmed:$('geometry-confirmed').checked,obstacles:obstacleDraft};const next=validatePlan({...plan,geometry});change(()=>plan=next);$('geometry-dialog').close();toast('Геометрію змінено в чернетці. Збережіть план.')}catch(err){$('geometry-error').textContent=err.message}};

$('add-pallet').onclick=()=>{if(plan.cages.length>=200)return toast('Досягнуто межі обладнання.');let cat=plan.categories.find(c=>c.id==='vegetables');if(!cat&&plan.categories.length>=40)return toast('Спочатку звільніть місце для категорії овочів.');const next={id:'pallet-'+crypto.randomUUID(),kind:'pallet',name:'Нова палета · попередній розмір',categoryId:'vegetables',width:120,height:80,x:0,y:0};for(let y=0;y<plan.geometry.length;y+=5)for(let x=0;x<plan.geometry.width;x+=5){next.x=x;next.y=y;if(fits(next,plan.cages)){change(()=>{if(!cat)plan.categories.push({id:'vegetables',name:'Овочі · палети',shortName:'Овочі'});plan.cages.push(next);selected=next.id});return toast('Палету додано. Перевірте попередні розміри 120 × 80 см.')}}toast('Немає місця для палети. Звільніть ділянку або змініть розміщення.')};

function renderTray(){const box=$('parked-list');box.replaceChildren();const items=plan.cages.filter(c=>c.parked);if(!items.length){const p=document.createElement('p');p.className='tray-note';p.textContent='Список порожній. Виберіть РК і натисніть «Тимчасово прибрати зі схеми».';box.append(p)}for(const item of items){const button=document.createElement('button');button.className='category-row'+(item.id===selected?' active':'');button.textContent=item.name+' · '+category(item.categoryId).shortName;button.onclick=()=>{select(item.id);$('cage-form').scrollIntoView({block:'nearest'})};box.append(button)}}
$('park-equipment').onclick=()=>{try{const next=parkEquipment(plan,selected);change(()=>plan=next);toast('РК у тимчасовому списку. Його місце на схемі вільне.')}catch(e){toast(e.message)}};
$('restore-equipment').onclick=()=>{try{const next=restoreEquipment(plan,selected,{x:Number($('cage-x').value),y:Number($('cage-y').value)});change(()=>plan=next);toast('Обладнання повернуто на план. Збережіть зміни.')}catch(e){toast(e.message)}};
$('swap-equipment').onclick=()=>{try{const next=swapEquipment(plan,selected,$('swap-target').value);change(()=>plan=next);toast('Місця обміняно. Збережіть зміни.')}catch(e){toast(e.message)}};