import { distance, approach } from './physics.js';
import { moveVehicle } from './vehicles.js';
import { startRace, tickRace, raceCourse, raceTarget } from './city-activities.js';
export const RIVALS=[
 {name:'Ishara Kotelawala',color:'#ce9aa7',pace:22,story:'A delivery driver who learned every harbor turn before entering her first organized race.'},
 {name:'Ruwan Aziz',color:'#9acbb8',pace:20,story:'A workshop owner who races the car he restored with his younger brother.'},
];
export function raceProgress(race,position){const c=raceCourse(race);return (race.lap-1)*c.route.length+race.checkpoint+Math.max(0,1-distance(position,raceTarget(race))/500);}
export class RivalRacing {
 constructor(vehicles,navigator){this.vehicles=vehicles;this.navigator=navigator;this.rivals=[];this.active=false;}
 start(course){
  this.active=!!raceCourse({course}).opponents;if(!this.active)return;
  if(!this.rivals.length)this.rivals=RIVALS.map((driver,i)=>({driver,car:this.vehicles.add(99,57+i*10,driver.color,0,'racer'),race:null,finished:false,path:[],repath:0,stage:'racing'}));
  for(const [i,r] of this.rivals.entries()){
   Object.assign(r.car,{x:99,z:57+i*10,angle:0,speed:0,health:100,kind:'racer',hitCooldown:0,prev:{x:99,z:57+i*10}});
   r.car.mesh.position.set(r.car.x,.26,r.car.z);r.car.mesh.visible=true;
   Object.assign(r,{race:startRace(course),finished:false,path:[],repath:0,stage:'racing'});r.race.countdown=0;
  }
 }
 rank(state){if(!this.active||!state.race)return 1;const progress=raceProgress(state.race,state);return 1+this.rivals.filter(r=>r.finished||raceProgress(r.race,r.car)>progress).length;}
 finish(state){const place=1+this.rivals.filter(r=>r.finished).length;this.active=false;for(const r of this.rivals)this.park(r);return place;}
 park(r){
  const spots=Array.from({length:7},(_,i)=>({x:103,z:62+i*10}));
  r.parking=spots.find(p=>!this.navigator.collision.blocked(p.x,p.z,2.5)&&this.rivals.every(o=>o===r||!o.parking||distance(o.parking,p)>6));
  r.stage='parking';r.path=r.parking?this.navigator.foot.route(r.car,r.parking,2.5):[];r.car.speed=0;
 }
 update(dt,state){
  if(this.active&&!state.race){this.active=false;for(const r of this.rivals)this.park(r);}
  for(const r of this.rivals){
   const {car}=r;if(car.health<=0||car.impactTime>0){if(car.health<=0)car.speed=0;continue;}
   if(this.active&&state.race?.countdown>0){car.speed=0;continue;}
   if(r.stage==='parked')continue;
   if(r.stage==='racing'){
    const result=tickRace(r.race,0,car,true);
    if(result==='won'){r.finished=true;this.park(r);continue;}
    r.repath-=dt;if(r.repath<=0||result==='checkpoint'){r.path=this.navigator.laneRoute(car,raceTarget(r.race),2.5);r.repath=3;}
   }
   const next=r.path[0];if(!next){car.speed=0;if(r.stage==='parking'&&r.parking&&distance(car,r.parking)<1)r.stage='parked';continue;}
   const d=distance(car,next);if(d<.45){r.path.shift();continue;}
   const dx=(next.x-car.x)/d,dz=(next.z-car.z)/d;
   const obstruction=this.vehicles.cars.some(o=>o!==car&&o.kind!=='removed'&&distance(o,car)<7&&(o.x-car.x)*dx+(o.z-car.z)*dz>0&&Math.abs((o.x-car.x)*dz-(o.z-car.z)*dx)<2.4);
   r.jammed=obstruction&&Math.abs(car.speed)<.5?(r.jammed||0)+dt:0;
   if(r.jammed>1.5&&this.rivals.indexOf(r)===1){const clear={x:car.x,z:car.z-8};if(this.navigator.collision.lineClear(car,clear,2.5,0)){r.path=[clear];r.repath=4;r.jammed=0;continue;}}
   const corner=r.path[1],sharp=corner&&((corner.x-next.x)*dx+(corner.z-next.z)*dz)/Math.max(.01,distance(corner,next))<.8;
   const pace=r.stage==='parking'?5:Math.min(r.driver.pace,car.health<20?8:40)*(state.weather==='rain'?.75:1);
   car.speed=approach(car.speed,obstruction?0:sharp&&d<14?9:pace,dt*(obstruction?14:7));car.angle=Math.atan2(dx,dz);
   if(moveVehicle(car,dx*Math.min(d,car.speed*dt),dz*Math.min(d,car.speed*dt),this.navigator.collision)){car.speed=0;r.repath=0;}
   car.mesh.position.set(car.x,.26,car.z);car.mesh.rotation.y=car.angle;
  }
 }
 snapshot(){return this.rivals.map(r=>({name:r.driver.name,x:r.car.x,z:r.car.z,health:r.car.health,finished:r.finished,stage:r.stage,checkpoint:r.race?.checkpoint,lap:r.race?.lap}));}
}
