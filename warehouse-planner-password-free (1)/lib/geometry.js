export const intersects=(a,b,gap=0)=>a.x<b.x+b.width+gap-.01&&a.x+a.width+gap>b.x+.01&&a.y<b.y+b.height+gap-.01&&a.y+a.height+gap>b.y+.01;
export function fits(cage,cages,geometry){
 if(!geometry)return false;
 if(cage.parked===true)return true;
 if(cage.x<0||cage.y<0||cage.x+cage.width>geometry.width||cage.y+cage.height>geometry.length)return false;
 if(geometry.obstacles.some(r=>intersects(cage,r)))return false;
 return !cages.some(c=>c.id!==cage.id&&c.parked!==true&&intersects(cage,c,geometry.clearance));
}
export function perimeterSegments(g){
 const result=[];for(const side of ['north','east','south','west']){const length=['north','south'].includes(side)?g.width:g.length;const openings=g.obstacles.filter(o=>['door','opening'].includes(o.kind)&&(o.wall||'north')===side).filter(o=>side==='north'?Math.abs(o.y)<.01:side==='south'?Math.abs(o.y+o.height-g.length)<.01:side==='west'?Math.abs(o.x)<.01:Math.abs(o.x+o.width-g.width)<.01).map(o=>['north','south'].includes(side)?[o.x,o.x+o.width]:[o.y,o.y+o.height]).sort((a,b)=>a[0]-b[0]);let cursor=0;for(const [start,end]of openings){if(start>cursor)result.push({side,from:cursor,to:Math.min(length,start)});cursor=Math.max(cursor,Math.min(length,end))}if(cursor<length)result.push({side,from:cursor,to:length})}return result;
}
export function perimeterPath(g){return perimeterSegments(g).map(s=>s.side==='north'?`M${s.from} 0 H${s.to}`:s.side==='south'?`M${s.from} ${g.length} H${s.to}`:s.side==='west'?`M0 ${s.from} V${s.to}`:`M${g.width} ${s.from} V${s.to}`).join(' ')}
