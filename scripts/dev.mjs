// Minimal local development server. Run `npm install` then `npm run dev`.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,extname,resolve} from 'node:path';
import planHandler from '../api/plan.js';
process.env.LOCAL_STORE='1';
const root=resolve('public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.json':'application/json; charset=utf-8'};
const server=createServer(async(req,res)=>{
  if(new URL(req.url,'http://localhost').pathname==='/api/plan'){
    try{if(req.method==='PUT'){let body='';for await(const part of req){body+=part;if(body.length>300_000)throw new Error('Request too large')}req.body=JSON.parse(body)}await planHandler(req,res)}
    catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))}
    return;
  }
  try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const safe=resolve(root,'.'+(p==='/'?'/index.html':p));if(safe!==root&&!safe.startsWith(root+'/'))throw Error('Forbidden');const bytes=await readFile(safe);res.writeHead(200,{'Content-Type':types[extname(safe)]||'application/octet-stream'});res.end(bytes)}catch{res.writeHead(404);res.end('Not found')}
});
const port=Number(process.env.PORT)||3000;
server.listen(port,()=>console.log(`Warehouse Planner at http://localhost:${port}`));
