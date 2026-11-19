import {validatePlan} from './validate.js';
import {fits} from './geometry.js';
const get=(plan,id)=>{const item=plan.cages.find(c=>c.id===id);if(!item)throw Error('Обладнання не знайдено.');return item};
export function parkEquipment(input,id){const plan=structuredClone(input);get(plan,id).parked=true;return validatePlan(plan)}
export function swapEquipment(input,firstId,secondId){
 if(firstId===secondId)throw Error('Виберіть інший РК або палету.');
 const plan=structuredClone(input),a=get(plan,firstId),b=get(plan,secondId);if(a.parked&&b.parked)throw Error('Обидва елементи вже поза схемою.');
 const first={x:a.x,y:a.y,parked:a.parked===true};Object.assign(a,{x:b.x,y:b.y,parked:b.parked===true});Object.assign(b,first);
 try{return validatePlan(plan)}catch{throw Error('Обмін не підходить за розмірами або перекриває інше обладнання чи прохід.')}
}
export function restoreEquipment(input,id,preferred){
 const plan=structuredClone(input),item=get(plan,id);if(!item.parked)return plan;const candidates=[preferred,{x:item.x,y:item.y}].filter(Boolean);
 for(const c of plan.cages){if(c.parked)continue;candidates.push({x:c.x-item.width,y:c.y},{x:c.x+c.width,y:c.y},{x:c.x,y:c.y-item.height},{x:c.x,y:c.y+c.height})}
 const place=p=>{const next={...item,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,parked:false};if(!fits(next,plan.cages,plan.geometry))return false;Object.assign(item,next);return true};
 for(const p of candidates)if(place(p))return validatePlan(plan);
 for(let y=0;y<=plan.geometry.length-item.height;y+=5)for(let x=0;x<=plan.geometry.width-item.width;x+=5)if(place({x,y}))return validatePlan(plan);
 throw Error('Вільного місця немає. Приберіть інший РК зі схеми або скористайтеся обміном місцями.');
}
