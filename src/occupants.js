import { createPerson, animatePerson } from './actor-models.js';
import { distance } from './systems.js';
import { segmentDistance } from './physics.js';
import { moveVehicle } from './vehicles.js';
export class Occupants {
 constructor(vehicles,population,collision,scene,excluded=[]){this.vehicles=vehicles;this.population=population;this.collision=collision;this.scene=scene;this.exits=[];
  const candidates=population.people.filter(p=>!p.dead&&!excluded.includes(p.id)&&!['resident-0','resident-1','resident-2','resident-3','resident-4','resident-5','resident-20','resident-24','resident-31','resident-39'].includes(p.id)&&!p.gang);
  vehicles.cars.filter(c=>c.kind==='traffic').forEach((c,i)=>{const p=candidates[i];if(!p)return;this.board(c,p);c.tripRemaining=70+i*7;});
  vehicles.cars.filter(c=>c.kind==='parked').forEach(c=>c.mesh.userData.driver.visible=false);
 }
 board(c,p){const old=c.mesh.userData.driver;c.mesh.remove(old);old.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});const mesh=createPerson(p.skin,p.casual,p);mesh.scale.setScalar(c.spec.height<1.8?.6:.64);mesh.position.set(-.5,c.spec.height<1.8?.2:.42,.1);animatePerson(mesh,0,0,false,true);c.mesh.add(mesh);c.mesh.userData.driver=mesh;c.driver=p;p.vehicle=c;p.inside=null;p.mesh.visible=false;}
 playerBoard(car){const old=car.mesh.userData.driver;car.mesh.remove(old);old.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});const mesh=createPerson('#c99b75','#eed5a4');mesh.scale.setScalar(car.spec.twoWheel?.74:car.spec.height<1.8?.6:.64);mesh.position.set(car.spec.twoWheel?0:-.5,car.spec.twoWheel?.2:car.spec.height<1.8?.2:.42,car.spec.twoWheel?-.1:.1);animatePerson(mesh,0,0,false,true);car.mesh.add(mesh);car.mesh.userData.driver=mesh;}
 doorSpot(c,side=-1){return {x:c.x+Math.cos(c.angle)*3.3*side,z:c.z-Math.sin(c.angle)*3.3*side};}
 freeDoor(c,origin=null){return [-1,1].map(side=>({...this.doorSpot(c,side),side})).sort((a,b)=>origin?distance(a,origin)-distance(b,origin):0).find(p=>!this.collision.blocked(p.x,p.z,.6)&&this.vehicles.cars.every(o=>o===c||o.kind==='removed'||distance(o,p)>2.6)&&this.collision.lineClear({x:c.x+Math.cos(c.angle)*1.3*p.side,z:c.z-Math.sin(c.angle)*1.3*p.side},p,.55,0));}
 eject(c,state,frightened=false){const p=c.driver;if(!p)return true;const spot=this.freeDoor(c)||(c.exploded?{x:c.x,z:c.z,side:-1}:null);if(!spot)return false;
  c.driver=null;p.vehicle=null;c.mesh.userData.driver.visible=false;c.speed=0;p.x=spot.x;p.z=spot.z;p.mesh.position.set(p.x,.3,p.z);p.mesh.visible=true;p.routine='';p.stun=.8;p.route=[];p.routePending=true;
  this.exits.push({p,c,spot,time:0,start:{x:c.x-Math.cos(c.angle)*.5,z:c.z+Math.sin(c.angle)*.5}});
  if(frightened)this.population.frighten(c,state.elapsed,12);return true;
 }
 update(dt,state){for(const c of this.vehicles.cars){if(c.driver){c.driver.x=c.x;c.driver.z=c.z;c.driver.mesh.visible=false;if(c.health<18||c.driver.dead){if(this.eject(c,state,true))c.kind='parked';continue;}c.tripRemaining-=dt;
   // Finish a trip at a clear kerb; the same named resident continues their schedule on foot.
   if(c.kind==='traffic'&&!c.transition&&c.tripRemaining<=0&&Math.abs(c.speed)<16){const candidates=[5.5,-5.5,9,-9].map(offset=>({x:c.x+Math.cos(c.angle)*offset,z:c.z-Math.sin(c.angle)*offset}));const spot=candidates.find(p=>!this.population.world.roadSegments.some(r=>segmentDistance(p,{x:r.x1,z:r.z1},{x:r.x2,z:r.z2})<r.width/2+1.4)&&!this.collision.blocked(p.x,p.z,2.5));if(spot&&!this.collision.blocked(spot.x,spot.z,2.5)&&this.vehicles.cars.every(o=>o===c||distance(o,spot)>6)&&this.collision.lineClear(c,spot,2.4,0)){c.parkingGoal=spot;c.kind='parking';}}
  }
  if(c.kind==='parking'&&!c.transition){const d=distance(c,c.parkingGoal),step=Math.min(d,dt*2);if(d>.05){const dx=(c.parkingGoal.x-c.x)/d*step,dz=(c.parkingGoal.z-c.z)/d*step;if(this.vehicles.cars.every(o=>o===c||o.kind==='removed'||distance(o,{x:c.x+dx,z:c.z+dz})>4.8))moveVehicle(c,dx,dz,this.collision);}c.speed=0;if(d<.15&&this.eject(c,state)){c.kind='parked';c.owned=false;}}
 }
 for(const exit of [...this.exits]){exit.time+=dt;const t=Math.min(1,exit.time/.75),{p,c,spot,start}=exit;p.mesh.position.set(start.x+(spot.x-start.x)*t,.3, start.z+(spot.z-start.z)*t);p.mesh.rotation.y=c.angle+spot.side*Math.PI/2;animatePerson(p.mesh,state.elapsed,2);c.mesh.userData.doors[spot.side<0?0:1].rotation.y=spot.side*Math.sin(t*Math.PI)*1.15;if(t===1){p.mesh.position.set(p.x,.3,p.z);this.exits.splice(this.exits.indexOf(exit),1);}}
 }
}
