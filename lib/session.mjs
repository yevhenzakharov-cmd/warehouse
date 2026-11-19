// Password sessions removed. Retain same-origin and JSON utilities for the plan API.
export function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===(req.headers['x-forwarded-host']||req.headers.host)}catch{return false}}
export function json(res,status,body){res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.statusCode=status;res.end(JSON.stringify(body))}
