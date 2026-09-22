import {CITY_JOBS} from './city-jobs.js';
export const SERVICE_CONTACTS=[{id:'police',name:'Police dispatch',number:'110'},{id:'ambulance',name:'Medical dispatch',number:'1990'}];
export const phoneNumber=id=>'077'+String(4100000+Number(id.split('-')[1])).padStart(7,'0');
export function normalizePhone(raw={}){raw=raw&&typeof raw==='object'?raw:{};return {contacts:[...new Set((Array.isArray(raw.contacts)?raw.contacts:[]).filter(id=>/^resident-\d+$/.test(id)&&Number(id.slice(9))<44))].slice(0,44),read:[...new Set((raw.read||[]).filter?.(id=>id in CITY_JOBS)||[])],snakeBest:Math.max(0,Math.min(144,Math.floor(Number(raw.snakeBest)||0))),memoryBest:Math.max(0,Math.min(999,Math.floor(Number(raw.memoryBest)||0)))};}
export class CityPhone{
 constructor(saved){this.data=normalizePhone(saved);this.call=null;this.cooldowns={};this.offers=Object.keys(CITY_JOBS);}
 add(p){if(p.police||p.age<18||p.relationship<0||!/^resident-\d+$/.test(p.id))return false;if(!this.data.contacts.includes(p.id))this.data.contacts.push(p.id);return true;}
 dial(id,point,s){if(this.call&&this.call.phase==='ringing')return 'A call is already ringing.';if((this.cooldowns[id]||0)>s.elapsed)return 'Dispatch has your request. Try again shortly.';this.call={id,point:{x:point.x,z:point.z},phase:'ringing',time:0,status:'Connecting…'};return null;}
 update(dt,s){if(!this.call||this.call.phase!=='ringing')return;this.call.time+=dt;if(this.call.time>=2){const c=this.call;this.cooldowns[c.id]=s.elapsed+45;c.phase='connected';c.status=this.onConnect?.(c,s)||'Connected.';}}
 hangup(){this.call=null;}
}
export class PocketSnake{
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.body=[{x:5,y:6},{x:4,y:6},{x:3,y:6}];this.direction={x:1,y:0};this.next={...this.direction};this.queued=false;this.score=0;this.over=false;this.timer=0;this.food=this.place();}
 place(){const free=[];for(let y=0;y<12;y++)for(let x=0;x<12;x++)if(!this.body.some(p=>p.x===x&&p.y===y))free.push({x,y});return free[Math.floor(this.random()*free.length)]||null;}
 turn(x,y){if(this.queued||x===-this.direction.x&&y===-this.direction.y||Math.abs(x)+Math.abs(y)!==1)return;this.next={x,y};this.queued=true;}
 step(){if(this.over)return;this.direction={...this.next};this.queued=false;const h={x:this.body[0].x+this.direction.x,y:this.body[0].y+this.direction.y},eat=this.food&&h.x===this.food.x&&h.y===this.food.y;if(h.x<0||h.x>=12||h.y<0||h.y>=12||this.body.slice(0,eat?undefined:-1).some(p=>p.x===h.x&&p.y===h.y)){this.over=true;return;}this.body.unshift(h);if(eat){this.score++;this.food=this.place();if(!this.food)this.over=true;}else this.body.pop();}
 update(dt){this.timer+=dt;while(this.timer>=.2&&!this.over){this.timer-=.2;this.step();}}
}
export class MemoryPairs{
 constructor(random=Math.random){this.cards=Array.from({length:12},(_,i)=>i%6);for(let i=11;i>0;i--){const j=Math.floor(random()*(i+1));[this.cards[i],this.cards[j]]=[this.cards[j],this.cards[i]];}this.open=[];this.matched=[];this.moves=0;this.wait=0;}
 flip(i){if(i<0||i>=12||this.wait||this.open.includes(i)||this.matched.includes(i))return false;this.open.push(i);if(this.open.length===2){this.moves++;const [a,b]=this.open;if(this.cards[a]===this.cards[b]){this.matched.push(a,b);this.open=[];}else this.wait=.8;}return true;}
 update(dt){if(this.wait){this.wait=Math.max(0,this.wait-dt);if(!this.wait)this.open=[];}}
 get won(){return this.matched.length===12;}
}
