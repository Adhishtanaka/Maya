import * as THREE from 'three';
import { createCar, VEHICLE_SPECS } from './actor-models.js';
import { resolveImpact } from './vehicle-dynamics.js';
import { clamp, distance } from './systems.js';
import { approach, segmentDistance, stoppingDistance, impactDamage } from './physics.js';
export function vehicleBlocked(collision,x,z,angle,spec={}){
 const dx=Math.sin(angle)*(spec.axle||1.15),dz=Math.cos(angle)*(spec.axle||1.15);
 return collision.blocked(x+dx,z+dz,spec.radius||1.16)||collision.blocked(x-dx,z-dz,spec.radius||1.16);
}
export function moveVehicle(car,dx,dz,collision){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));
 for(let i=0;i<steps;i++){
  const nx=car.x+dx/steps,nz=car.z+dz/steps;
  if(vehicleBlocked(collision,nx,nz,car.angle,car.spec))return true;
  car.x=nx;car.z=nz;
 }
 return false;
}
// Clearance uses both vehicles' full footprints, including long vans and buses.
export function vehicleGap(car,other,angle=car.angle){
 const dx=Math.sin(angle),dz=Math.cos(angle),x=other.x-car.x,z=other.z-car.z;
 const along=x*dx+z*dz,side=Math.abs(x*dz-z*dx),turn=other.angle-angle;
 const lateral=(car.spec?.radius||1.16)+(other.spec?.radius||1.16)+Math.abs(Math.sin(turn))*(other.spec?.axle||1.15);
 if(along<=0||side>=lateral+.3)return Infinity;
 return along-(car.spec?.axle||1.15)-(car.spec?.radius||1.16)-(other.spec?.radius||1.16)-Math.abs(Math.cos(turn))*(other.spec?.axle||1.15);
}
export function steerVehicle(car,angle,dt,collision){
 const turn=Math.atan2(Math.sin(angle-car.angle),Math.cos(angle-car.angle));
 const next=car.angle+clamp(turn,-2.5*dt,2.5*dt);
 if(!vehicleBlocked(collision,car.x,car.z,next,car.spec))car.angle=next;
 return Math.atan2(Math.sin(angle-car.angle),Math.cos(angle-car.angle));
}
function emergencyBody(mesh,kind){
 const mat=new THREE.MeshStandardMaterial({color:kind==='ambulance'?'#e7e8d9':'#d7ddce'});
 if(kind==='ambulance'){
  const rear=new THREE.Mesh(new THREE.BoxGeometry(2.25,1.8,3.2),mat);rear.position.set(0,1.8,-.6);rear.castShadow=true;mesh.add(rear);
  for(const side of [-1,1]){
   const red=new THREE.MeshBasicMaterial({color:'#bf5654'});
   const a=new THREE.Mesh(new THREE.BoxGeometry(.04,.25,1.1),red);a.position.set(side*1.14,2,-.5);mesh.add(a);
   const b=new THREE.Mesh(new THREE.BoxGeometry(.04,1.1,.25),red);b.position.set(side*1.15,2,-.5);mesh.add(b);
  }
 }
}
export class Vehicles {
 constructor(scene,collision){this.scene=scene;this.collision=collision;this.cars=[];this.counter=0;}
 add(x,z,color='#ddbd7f',angle=0,kind='parked',options={}){
  const emergency=kind==='police'||kind==='ambulance'||!!options.officialType;
  const model=options.model||(options.tuk?'tuk':kind==='ambulance'?'van':kind==='racer'?'sport':kind==='police'?'classic':['classic','hatch','sport','suv','van','tuk'][this.counter%6]);const spec=VEHICLE_SPECS[model]||VEHICLE_SPECS.classic;
  const mesh=createCar(color,emergency,model==='tuk',model);if(emergency)emergencyBody(mesh,options.officialType||kind);
  mesh.position.set(x,.26,z);mesh.rotation.y=angle;this.scene.add(mesh);
  const car={id:`car-${this.counter++}`,mesh,model,spec,color,impulseX:0,impulseZ:0,spin:0,impactTime:0,burnTime:0,exploded:false,x,z,prev:{x,z},angle,speed:0,cruise:options.cruise||11,kind,health:100,owned:kind==='parked',path:options.path||[],waypoint:0,reaction:0,braking:false,hitCooldown:0,stuck:0,...options};
  this.cars.push(car);return car;
 }
 populate(){
  this.add(3,30,'#ddbd7f',Math.PI);this.add(-45,57,'#9ab9b1');this.add(51,-31,'#c18287');this.add(93,70,'#b6c0a8',Math.PI);
  this.add(-237,43,'#a4bba4',0);this.add(3,-235,'#9faeb1',Math.PI);
  const loops=[
   [{x:-93,z:-93},{x:-3,z:-93},{x:-3,z:93},{x:-93,z:93}],
   [{x:3,z:93},{x:93,z:93},{x:93,z:-93},{x:3,z:-93}],
   [{x:-285,z:-45},{x:-147,z:-45},{x:-147,z:141},{x:-285,z:141}],
   [{x:-93,z:147},{x:93,z:147},{x:93,z:237},{x:-93,z:237}],
   [{x:-189,z:-93},{x:-3,z:-93},{x:-3,z:-237},{x:-189,z:-237}],
  ].map(loop=>{
   const centers=loop.map(p=>({x:Math.round(p.x/48)*48,z:Math.round(p.z/48)*48}));
   return centers.map((p,i)=>{const prev=centers[(i+centers.length-1)%centers.length],next=centers[(i+1)%centers.length],a=distance(prev,p),b=distance(p,next);return {x:p.x+2.8*((p.z-prev.z)/a+(next.z-p.z)/b),z:p.z-2.8*((p.x-prev.x)/a+(next.x-p.x)/b)};});
  });
  // Space each circuit by arc length; wrapping the edge index duplicated four spawns.
  for(let i=0;i<24;i++){
   const path=loops[i%loops.length],count=i%loops.length<4?5:4,index=Math.floor(i/loops.length);
   const lengths=path.map((p,j)=>distance(p,path[(j+1)%path.length]));
   let offset=lengths.reduce((a,b)=>a+b,0)*(index+.25)/count,edge=0;
   while(offset>lengths[edge])offset-=lengths[edge++];
   const from=path[edge],to=path[(edge+1)%path.length],t=offset/lengths[edge];
   const c=this.add(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t,['#a5b6ab','#d2a18a','#b8c1aa','#738f9b','#b77e75'][i%5],Math.atan2(to.x-from.x,to.z-from.z),'traffic',{path,tuk:i%5===0,cruise:9+i%5*1.7});c.waypoint=(edge+1)%4;c.speed=c.cruise;
  }
 }
 nearest(position,max=5.3){return this.cars.filter(c=>distance(c,position)<max&&c.kind!=='removed').sort((a,b)=>distance(a,position)-distance(b,position))[0];}
 update(dt,state,people,onPersonImpact,onPlayerImpact,onCarImpact){
  const actors=people.filter(p=>!p.vehicle&&!p.inside&&!p.removed&&!p.dead&&!p.injured);
  for(const c of this.cars){
   c.hitCooldown=Math.max(0,c.hitCooldown-dt);c.playerHitCooldown=Math.max(0,(c.playerHitCooldown||0)-dt);c.impactTime=Math.max(0,c.impactTime-dt);
   if(c.kind!=='removed'){
    const old=c.angle;c.angle+=(c.spin||0)*dt;if(vehicleBlocked(this.collision,c.x,c.z,c.angle,c.spec))c.angle=old;c.spin*=Math.exp(-dt*3);
    moveVehicle(c,(c.impulseX||0)*dt,(c.impulseZ||0)*dt,this.collision);c.impulseX*=Math.exp(-dt*2.8);c.impulseZ*=Math.exp(-dt*2.8);
    if(c!==state.driving&&(c.kind==='parked'||c.impactTime>0&&c.kind!=='traffic')){moveVehicle(c,Math.sin(c.angle)*c.speed*dt,Math.cos(c.angle)*c.speed*dt,this.collision);c.speed*=Math.exp(-dt*2);}
    c.mesh.userData.wheels.forEach(w=>{if(c.spec.twoWheel)w.rotation.z+=c.speed*dt/.43;else w.rotation.x+=c.speed*dt/.43;});if(c.spec.twoWheel){const d=c.mesh.userData.driver.userData;const pedal=c.model==='bicycle'&&Math.abs(c.speed)>.2?Math.sin(state.elapsed*8)*.4:0;d.left.rotation.x=-1.1+pedal;d.right.rotation.x=-1.1-pedal;}
    this.updateFire(c,dt,state);
   }c.mesh.userData.beams.visible=state.hour<6||state.hour>19||state.weather==='rain';
   if(c.health<=0){c.speed=0;if(c.kind==='traffic')c.kind='parked';}
   if(c.kind!=='traffic'||c===state.driving||c.transition)continue;
   c.prev={x:c.x,z:c.z};
   const waypoint=c.path[c.waypoint];if(!waypoint){c.speed=0;continue;}const d=distance(c,waypoint);
   if(d<.45){c.waypoint=(c.waypoint+1)%c.path.length;continue;}
   const desiredAngle=Math.atan2(waypoint.x-c.x,waypoint.z-c.z);
   const turn=steerVehicle(c,desiredAngle,dt,this.collision);
   const dx=Math.sin(c.angle),dz=Math.cos(c.angle),perception=stoppingDistance(c.speed,.55,state.weather==='rain'?5.5:9)+4;
   const ahead=p=>{const x=p.x-c.x,z=p.z-c.z;return x*dx+z*dz>0&&x*dx+z*dz<perception&&Math.abs(x*dz-z*dx)<2.1;};
   const obstacle=(!state.interior&&!state.driving&&!(state.altitude>2)&&ahead(state))||actors.some(a=>ahead(a))||this.cars.some(o=>o!==c&&o.kind!=='removed'&&vehicleGap(c,o)<perception);
   if(obstacle)c.reaction+=dt;else c.reaction=0;
   const gap=Math.min(Infinity,...this.cars.filter(o=>o!==c&&o.kind!=='removed').map(o=>vehicleGap(c,o)));
   const cruise=c.cruise*(state.weather==='rain'?.72:1),corner=Math.sqrt(Math.max(0,2*5*(d-.4)));
   const target=c.reaction>.55?0:Math.min(cruise,corner)*Math.max(0,Math.cos(turn));
   c.speed=approach(c.speed,target,dt*(target<c.speed?(state.weather==='rain'?5.5:9):3.4));
   const travel=Math.min(d,Math.max(0,gap-.6),Math.max(0,c.speed*dt));
   if(travel<c.speed*dt&&gap<1)c.speed=0;
   if(moveVehicle(c,dx*travel,dz*travel,this.collision)){c.speed=0;c.stuck+=dt;}else c.stuck=0;
  }
  // Swept relative motion also catches a sprinting pedestrian crossing between frames.
  for(const c of this.cars){
   if(c.kind==='removed')continue;
   const previous=c.prev||c;
   if(Math.abs(c.speed)>2){
    if(!state.interior&&!state.driving&&!(state.altitude>2)&&c.playerHitCooldown<=0){
     const start={x:previous.x-(state.previous?.x??state.x),z:previous.z-(state.previous?.z??state.z)};
     const end={x:c.x-state.x,z:c.z-state.z};
     if(segmentDistance({x:0,z:0},start,end)<1.8){onPlayerImpact(impactDamage(c.speed),c);c.playerHitCooldown=1.3;c.speed*=.45;}
    }
    for(const p of actors){
     if(p.hitCooldown>0)continue;
     if(segmentDistance(p,previous,c)<1.75){onPersonImpact(p,impactDamage(c.speed),c);p.hitCooldown=1.5;c.speed*=.6;break;}
    }
   }
   c.mesh.position.set(c.x,.26,c.z);c.mesh.rotation.y=c.angle;
  }
  for(let i=0;i<this.cars.length;i++)for(let j=i+1;j<this.cars.length;j++){
   const a=this.cars[i],b=this.cars[j];if(a.kind==='removed'||b.kind==='removed')continue;
   const pa=a.prev||a,pb=b.prev||b;
   const swept=[-(a.spec.axle||1.15),a.spec.axle||1.15].some(sa=>[-(b.spec.axle||1.15),b.spec.axle||1.15].some(sb=>{const ox=Math.sin(a.angle)*sa-Math.sin(b.angle)*sb,oz=Math.cos(a.angle)*sa-Math.cos(b.angle)*sb;return segmentDistance({x:0,z:0},{x:pa.x-pb.x+ox,z:pa.z-pb.z+oz},{x:a.x-b.x+ox,z:a.z-b.z+oz})<(a.spec.radius||1.16)+(b.spec.radius||1.16);}));
   if(!swept)continue;
   const impact=resolveImpact(a,b,pa,pb);
   // Damage has a cooldown; physical separation never does.
   if(impact>=3&&a.hitCooldown<=0&&b.hitCooldown<=0){a.health=clamp(a.health-impact,0,100);b.health=clamp(b.health-impact,0,100);a.hitCooldown=b.hitCooldown=1.5;onCarImpact(a,b,impact);}
   const previousOverlap=[-(a.spec.axle||1.15),a.spec.axle||1.15].some(sa=>[-(b.spec.axle||1.15),b.spec.axle||1.15].some(sb=>Math.hypot(pa.x-pb.x+Math.sin(a.angle)*sa-Math.sin(b.angle)*sb,pa.z-pb.z+Math.cos(a.angle)*sa-Math.cos(b.angle)*sb)<(a.spec.radius||1.16)+(b.spec.radius||1.16)));
   if(!previousOverlap){a.x=pa.x;a.z=pa.z;b.x=pb.x;b.z=pb.z;}
   else {
    const d=distance(a,b)||1,dx=(a.x-b.x)/d||1,dz=(a.z-b.z)/d,push=.2;
    moveVehicle(a,dx*push,dz*push,this.collision);moveVehicle(b,-dx*push,-dz*push,this.collision);
   }
   // Momentum transfer above preserves glancing deflection and pushes parked vehicles.
   
   for(const c of [a,b]){c.prev={x:c.x,z:c.z};c.mesh.position.set(c.x,.26,c.z);}
   if(state.driving===a||state.driving===b){state.x=state.driving.x;state.z=state.driving.z;state.speed=state.driving.speed;}
  }
  for(const c of this.cars)c.prev={x:c.x,z:c.z};
  if(state.driving){state.x=state.driving.x;state.z=state.driving.z;state.speed=state.driving.speed;}
 }
 repair(car){car.health=100;car.burnTime=0;car.exploded=false;car.mesh.userData.body.color.set(car.color);if(car.fire){car.mesh.remove(car.fire);car.fire.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});car.fire=null;}}
 updateFire(car,dt,state){
  if(car.model==='bicycle'){if(car.health<=0){car.speed=0;car.mesh.userData.body.color.set('#383536');}return;}
  if(car.health>12&&!car.exploded){car.burnTime=0;return;}
  if(car.exploded&&!car.fire&&car.burnTime===0){car.mesh.userData.body.color.set('#292929');return;}
  if(!car.fire){
   const fire=new THREE.Group();for(let i=0;i<5;i++){const flame=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,0),new THREE.MeshBasicMaterial({color:i<3?'#ef963f':'#47494c',transparent:true,opacity:.75,depthWrite:false}));flame.position.set((i%2-.5)*.6,1.3+i*.45,.9);fire.add(flame);}car.mesh.add(fire);car.fire=fire;
  }
  car.burnTime+=dt;car.fire.children.forEach((f,i)=>{f.scale.setScalar((car.exploded?1.5:.65)+Math.sin(state.elapsed*11+i)*.2);f.position.y=1.3+i*.45+(state.elapsed*(i<3?1:2)%1);});
  if(!car.exploded&&(car.burnTime>=5||car.health<=0)){car.exploded=true;car.health=0;car.speed=0;car.mesh.userData.body.color.set('#292929');car.mesh.userData.driver.visible=false;this.onExplosion?.(car,state);}
  car.fire.visible=car.burnTime<14;
 }
 drive(car,dt,input,weather,onCrash){
  car.prev={x:car.x,z:car.z};
  if(car.health<=0){car.speed=0;return;}
  const acceleration=input.up?car.spec.acceleration:input.down?-12:0;
  car.speed=clamp((car.speed+acceleration*dt)*Math.exp(-(acceleration?.23:1.15)*dt),-12,car.health<15?7:car.spec.maxSpeed);
  if(input.brake)car.speed*=Math.exp(-(weather==='rain'?3.3:6)*dt);
  const old=car.angle;
  car.angle+=(Number(!!input.left)-Number(!!input.right))*dt*car.spec.steering*clamp(Math.abs(car.speed)/8,0,1)*Math.sign(car.speed)*(weather==='rain'?.68:1);
  if(vehicleBlocked(this.collision,car.x,car.z,car.angle,car.spec))car.angle=old;
  if(moveVehicle(car,Math.sin(car.angle)*car.speed*dt,Math.cos(car.angle)*car.speed*dt,this.collision)){
   if(Math.abs(car.speed)>5&&car.hitCooldown<=0){onCrash(Math.abs(car.speed));car.hitCooldown=1;car.health=clamp(car.health-Math.abs(car.speed),0,100);}
   car.speed*=-.18;
  }
 }
}
export function makeHelicopter(){
 const group=new THREE.Group(),bodyMat=new THREE.MeshStandardMaterial({color:'#465e64',roughness:.5}),glass=new THREE.MeshStandardMaterial({color:'#90b0b2',metalness:.5,roughness:.2});
 const part=(w,h,d,x,y,z,mat=bodyMat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
 part(3,2.4,5,0,0,0);part(2.8,1.6,1.8,0,.2,2.4,glass);part(.8,.8,7,0,.3,-5);part(.3,2,2,0,1,-8);part(5,.2,1,0,.2,-7);
 for(const x of [-1.8,1.8]){part(.12,.12,6,x,-1.8,0);part(.12,1,.12,x,-1.3,-1.5);part(.12,1,.12,x,-1.3,1.5);}
 const rotor=new THREE.Group();rotor.position.y=1.7;group.add(rotor);
 for(const angle of [0,Math.PI/2]){const blade=new THREE.Mesh(new THREE.BoxGeometry(14,.09,.35),bodyMat);blade.rotation.y=angle;rotor.add(blade);}
 const light=new THREE.SpotLight('#e2e8d9',100,90,.28,.6,1);light.position.set(0,-1,1);group.add(light);group.add(light.target);light.target.position.set(0,-40,5);
 group.userData={rotor,light};return group;
}
