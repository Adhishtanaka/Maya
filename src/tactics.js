import { clamp, distance } from './physics.js';

export function findCover(position, collision, radius = 3) {
 const points=[];
 for(const shape of collision.candidates(position.x,position.z,radius)){
  if((shape.height??100)<.85)continue;
  if(shape.r!=null){
   for(let i=0;i<12;i++){const a=i*Math.PI/6;points.push({x:shape.x+Math.sin(a)*(shape.r+.72),z:shape.z+Math.cos(a)*(shape.r+.72),height:shape.height??100});}
  }else{
   const x=clamp(position.x,shape.x-shape.w/2,shape.x+shape.w/2),z=clamp(position.z,shape.z-shape.d/2,shape.z+shape.d/2);
   for(const side of [-1,1])points.push({x:shape.x+side*(shape.w/2+.72),z,height:shape.height??100},{x,z:shape.z+side*(shape.d/2+.72),height:shape.height??100});
  }
 }
 return points.filter(p=>distance(p,position)<=radius&&!collision.blocked(p.x,p.z,.6)&&collision.lineClear(position,p,.6,0)).sort((a,b)=>distance(a,position)-distance(b,position))[0]||null;
}
export function visibilityRange(state){
 const dark=state.hour<5||state.hour>=19.5,weather=state.weather==='rain'||state.weather==='snow';
 return 55*(dark?.72:1)*(weather?.8:1)*(state.crouching&&!state.exposed?.48:1);
}
export function targetHeight(state){return state.crouching&&state.exposed<=0?.8:1.4;}
export function aimedShotHits(origin,aim,target,collision){
 return distance(aim,target)<(target.driving?2:.85)&&collision.lineClear(origin,target,.08,targetHeight(target));
}
export class PlayerTactics {
 constructor(state){Object.assign(state,{crouching:false,cover:null,stamina:100,exhausted:false,dodge:0,dodgeCooldown:0,dodgeX:0,dodgeZ:0,exposed:0});}
 crouch(state){if(state.driving||state.flightMode||state.knocked||state.dodge)return;state.crouching=!state.crouching;state.cover=null;}
 cover(state,collision){
  if(state.driving||state.flightMode||state.knocked||state.dodge)return false;
  if(state.cover){state.cover=null;state.crouching=false;return true;}
  const spot=findCover(state,collision);if(!spot)return false;
  state.cover=spot;state.x=spot.x;state.z=spot.z;state.crouching=true;return true;
 }
 dodge(state,direction){
  if(state.driving||state.flightMode||state.knocked||state.dodgeCooldown>0||state.stamina<30)return false;
  const len=Math.hypot(direction.x,direction.z)||1;
  Object.assign(state,{dodge:.4,dodgeCooldown:1,stamina:state.stamina-30,dodgeX:direction.x/len,dodgeZ:direction.z/len,cover:null,crouching:false});return true;
 }
 update(dt,state){
  state.exposed=Math.max(0,state.exposed-dt);state.dodgeCooldown=Math.max(0,state.dodgeCooldown-dt);
  state.stamina=clamp(state.stamina+dt*(state.dodge>0?0:state.sprinting&&state.walking?-17:14),0,100);
  if(state.stamina===0)state.exhausted=true;else if(state.stamina>=25)state.exhausted=false;
  if(state.cover&&(state.driving||state.knocked||distance(state,state.cover)>2))state.cover=null;
 }
 moveDodge(dt,state,collision){
  const step=Math.min(dt,state.dodge);collision.move(state,state.dodgeX*14*step,state.dodgeZ*14*step,.6);
  state.dodge=Math.max(0,state.dodge-dt);
 }
}
