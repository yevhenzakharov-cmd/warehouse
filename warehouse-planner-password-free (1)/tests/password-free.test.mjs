import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createInitialPlan} from '../lib/seed.mjs';
import {validatePlan} from '../lib/validate.mjs';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('password login removed from web UI and API',async()=>{
 const [html,app,api]=await Promise.all([read('../public/index.html'),read('../public/app.js'),read('../api/plan.js')]);
 assert.doesNotMatch(html,/login-form|login-screen|type="password"|id="logout"/);
 assert.doesNotMatch(app,/\/api\/auth|login-form|login-screen|\$\('logout'\)|isAuthenticated/);
 assert.doesNotMatch(api,/isAuthenticated|Увійдіть за паролем/);
 assert.match(app,/load\(\)\.catch\(/);
 assert.match(api,/sameOrigin\(req\)/);
});
test('warehouse seed still validates',()=>{
 const plan=createInitialPlan();
 assert.deepEqual(validatePlan(plan).schemaVersion,2);
 assert.ok(plan.cages.length>0);
});
test('authentication endpoint is not included',async()=>{
 const files=await readdir(new URL('../api/',import.meta.url));
 assert.ok(!files.includes('auth.js'));
});
