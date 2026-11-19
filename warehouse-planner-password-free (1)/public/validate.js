import {fits} from './geometry.js';
const cleanString=(value,max=80)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;
export function validatePlan(input){
  if(!input||input.schemaVersion!==2||!cleanString(input.title)||!Array.isArray(input.categories)||!Array.isArray(input.cages))throw new Error('Некоректний файл плану.');
  if(input.categories.length<1||input.categories.length>40||input.cages.length>200)throw new Error('Підтримується до 40 категорій і 200 рол-кейджів.');
  const g=input.geometry;
  if(!g||![g.width,g.length,g.clearance].every(Number.isFinite)||g.width<100||g.length<100||g.width>10000||g.length>10000||g.clearance<0||g.clearance>500||typeof g.confirmed!=='boolean'||!Array.isArray(g.obstacles)||g.obstacles.length>60)throw Error('Перевірте геометрію складу.');
  if([g.cageWidth,g.cageDepth].some(v=>v!==null&&(!Number.isFinite(v)||v<10||v>500)))throw Error('Перевірте розміри рол-кейджа.');
  const obstacles=g.obstacles.map(o=>{if(!cleanString(o.name,60)||!['room','column','door','stairs','aisle','rack','opening'].includes(o.kind)||![o.x,o.y,o.width,o.height].every(Number.isFinite)||o.x<0||o.y<0||o.width<=0||o.height<=0||o.x+o.width>g.width||o.y+o.height>g.length)throw Error('Перешкода виходить за межі складу.');if(o.wall!==undefined&&!['north','east','south','west'].includes(o.wall))throw Error('Перевірте стіну для дверей або проходу.');if(o.steps!==undefined&&(!Number.isInteger(o.steps)||o.steps<2||o.steps>100))throw Error('Перевірте умовні секції сходів.');return {name:o.name,kind:o.kind,...(o.wall?{wall:o.wall}:{}),...(o.steps!==undefined?{steps:o.steps}:{}),x:o.x,y:o.y,width:o.width,height:o.height,confirmed:o.confirmed===true}});
  const geometry={width:g.width,length:g.length,confirmed:g.confirmed,envelopeConfirmed:g.envelopeConfirmed===true,clearance:g.clearance,cageWidth:g.cageWidth,cageDepth:g.cageDepth,obstacles};
  const categoryIds=new Set(),cageIds=new Set();
  const categories=input.categories.map(c=>{
    if(!cleanString(c.id,60)||!/^[a-zA-Z0-9_-]+$/.test(c.id)||categoryIds.has(c.id)||!cleanString(c.name,60)||!cleanString(c.shortName,12))throw new Error('Перевірте назви категорій.');
    if(c.targetShare!==undefined&&(!Number.isFinite(c.targetShare)||c.targetShare<0||c.targetShare>1))throw Error('Некоректна частка категорії.');
    categoryIds.add(c.id);return {id:c.id,name:c.name.trim(),shortName:c.shortName.trim(),...(c.targetShare!==undefined?{targetShare:c.targetShare}:{})};
  });
  const cages=input.cages.map(c=>{
    if(!cleanString(c.id,60)||!/^[a-zA-Z0-9_-]+$/.test(c.id)||cageIds.has(c.id)||!cleanString(c.name,60)||!categoryIds.has(c.categoryId)||![c.x,c.y,c.width,c.height].every(Number.isFinite)||!(c.width>=10&&c.width<=500&&c.height>=10&&c.height<=500))throw new Error('Перевірте дані рол-кейджів.');
    if(c.parked!==undefined&&typeof c.parked!=='boolean')throw Error('Некоректний стан тимчасового списку.');
    if(c.kind!==undefined&&!['cage','pallet'].includes(c.kind))throw Error('Невідомий тип обладнання.');
    cageIds.add(c.id);return {id:c.id,kind:c.kind||'cage',...(c.parked===true?{parked:true}:{}),name:c.name.trim(),categoryId:c.categoryId,x:Math.round(c.x*10)/10,y:Math.round(c.y*10)/10,width:c.width,height:c.height};
  });
  if(cages.some(c=>!fits(c,cages,geometry)))throw new Error('Рол-кейджі перекривають один одного, колони або межі складу.');
  return {schemaVersion:2,title:input.title.trim(),geometry,categories,cages};
}
