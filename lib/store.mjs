import {get,head,put,BlobPreconditionFailedError} from '@vercel/blob';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createInitialPlan} from './seed.mjs';
const PATH='warehouse-2871/layout-v2.json';
const initial=()=>({plan:createInitialPlan(),revision:0,updatedAt:null,history:[]});
export async function loadPlan(){
  if(process.env.LOCAL_STORE==='1'){
    try{const raw=await readFile('.local-data/plan.json','utf8');return {document:JSON.parse(raw),etag:createHash('sha256').update(raw).digest('hex')}}catch(e){if(e.code==='ENOENT')return {document:initial(),etag:'initial'};throw e}
  }
  const canonical=value=>String(value).replace(/^W\//,'').replace(/^"|"$/g,'');
  for(let attempt=0;attempt<3;attempt++){
    const blob=await get(PATH,{access:'private',useCache:false});
    if(!blob)return {document:initial(),etag:'initial'};
    if(blob.statusCode!==200)throw Error('Unexpected storage response');
    const document=await new Response(blob.stream).json();
    // Download responses can contain a weak, quoted HTTP ETag. Conditional
    // writes require the authoritative strong ETag returned by metadata.
    const metadata=await head(PATH);
    if(canonical(metadata.etag)===canonical(blob.blob.etag))return {document,etag:metadata.etag};
  }
  throw Error('Plan changed while reading; retry');
}
export async function savePlan(plan,expected,summary){
  const current=await loadPlan();
  if(current.etag!==expected){const e=Error('Conflict');e.status=409;throw e}
  const now=new Date().toISOString();
  const document={plan,revision:current.document.revision+1,updatedAt:now,history:[{revision:current.document.revision+1,at:now,summary},...current.document.history].slice(0,30)};
  if(process.env.LOCAL_STORE==='1'){
    const raw=JSON.stringify(document);await mkdir('.local-data',{recursive:true});await writeFile('.local-data/plan.json',raw);return {document,etag:createHash('sha256').update(raw).digest('hex')};
  }
  try{
    const blob=await put(PATH,JSON.stringify(document),{access:'private',addRandomSuffix:false,allowOverwrite:expected!=='initial',...(expected!=='initial'?{ifMatch:expected}:{}),contentType:'application/json'});
    return {document,etag:blob.etag};
  }catch(e){if(e instanceof BlobPreconditionFailedError||e.name==='BlobAlreadyExistsError'){e.status=409}throw e}
}
