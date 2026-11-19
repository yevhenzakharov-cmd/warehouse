import {coldAccess} from './cold-access.mjs';
import {bottomFixtures} from './bottom-fixtures.mjs';
import {addOfficeStairs} from './office-stairs.mjs';
import {narrowAislesAndDoor} from './narrow-aisles.mjs';
import {continuousLayout} from './continuous-layout.mjs';
import {replaceDrinksForVisual} from './category-update.mjs';
export const pickingAisles=()=>[{name:'ПРОХІД · ВІЛЬНО',kind:'aisle',x:80,y:0,width:160,height:332,confirmed:true},{name:'ПРОХІД · ВІЛЬНО',kind:'aisle',x:653,y:0,width:160,height:332,confirmed:true}];
export function createInitialPlan(){
 const positions=[];for(const [start,rows]of [[0,5],[451.6,3]])for(let row=0;row<rows;row++)for(const x of [0,80,160,240,320,493,573,653,733,813,893]){const y=Math.round((start+row*66.4)*10)/10;if(x<240&&y>=518)continue;positions.push({x,y})}
 const groups=[['drinks',38],['snacks',22],['groceries',16],['unassigned',6]];let index=0;const cages=[];for(const [categoryId,count]of groups)for(let i=0;i<count;i++){const pos=positions[index];index++;cages.push({id:'dense-'+String(index).padStart(3,'0'),kind:'cage',name:'Пропозиція '+String(index).padStart(3,'0'),categoryId,...pos,width:80,height:66.4})}
 for(let row=0;row<2;row++)for(let col=0;col<2;col++)cages.push({id:'vegetable-pallet-'+(row*2+col+1),kind:'pallet',name:'Овочі · палета '+(row*2+col+1),categoryId:'vegetables',x:col*120,y:530+row*80,width:120,height:80});
 const aisles=pickingAisles();const remaining=cages.filter(c=>!aisles.some(a=>c.x<a.x+a.width-.01&&c.x+c.width>a.x+.01&&c.y<a.y+a.height-.01&&c.y+c.height>a.y+.01));
 return coldAccess(bottomFixtures(addOfficeStairs(narrowAislesAndDoor(continuousLayout(replaceDrinksForVisual({schemaVersion:2,title:'Склад 02 · 8,5 × 9,73 м',geometry:{width:973,length:850,envelopeConfirmed:true,confirmed:false,clearance:0,cageWidth:80,cageDepth:66.4,obstacles:[{name:'ПРОХІД · НІЧОГО НЕ СТАВИТИ · ≈1,6 м · 2 ширини кейджа',kind:'aisle',x:0,y:690,width:973,height:160,confirmed:false},...aisles]},categories:[{id:'drinks',name:'Напої',shortName:'Напої',targetShare:35/75},{id:'snacks',name:'Солодощі / снеки',shortName:'Снеки',targetShare:20/75},{id:'groceries',name:'Консерви / бакалія',shortName:'Бакалія',targetShare:15/75},{id:'unassigned',name:'Без категорії',shortName:'Без кат.',targetShare:5/75},{id:'vegetables',name:'Овочі · палети',shortName:'Овочі'}],cages:remaining}))))));
}
