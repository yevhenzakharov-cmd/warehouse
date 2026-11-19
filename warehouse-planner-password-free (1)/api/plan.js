import {sameOrigin,json} from '../lib/session.mjs';
import {loadPlan,savePlan} from '../lib/store.mjs';
import {validatePlan} from '../lib/validate.mjs';
export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='PUT')return json(res,405,{error:'Метод не підтримується.'});
  try{
    if(req.method==='GET'){const {document,etag}=await loadPlan();return json(res,200,{...document,etag})}
    if(req.body?.clientVersion!==4)return json(res,409,{error:'Оновіть сторінку перед збереженням: оновлено нерухомі зони, двері та проходи. За потреби спочатку експортуйте чернетку.'});
    if(!sameOrigin(req))return json(res,403,{error:'Недозволений запит.'});
    if(typeof req.body?.etag!=='string'||req.body.etag.length>200)return json(res,400,{error:'Оновіть план перед збереженням.'});
    let plan;try{plan=validatePlan(req.body.plan)}catch(e){return json(res,400,{error:e.message})}
    const summary=String(req.body.summary||'Оновлення плану').slice(0,160);
    const {document,etag}=await savePlan(plan,req.body.etag,summary);return json(res,200,{...document,etag});
  }catch(e){if(e.status===409)return json(res,409,{error:'План уже змінив інший користувач. Завантажте останню версію. Ваші зміни можна експортувати.'});console.error('Plan storage error:',e.name);return json(res,503,{error:'Не вдалося зберегти або завантажити спільний план. Спробуйте ще раз; локальні зміни залишено.'})}
}
