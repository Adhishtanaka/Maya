import * as THREE from 'three';
import { createPerson } from './world.js';
import { makeHelicopter, moveVehicle, vehicleGap, steerVehicle } from './vehicles.js';
import { clamp, distance } from './systems.js';
import { approach } from './physics.js';
import { weaponModel } from './combat.js';
import {reachableRoute,stepWalker} from './navigation-recovery.js';
import {react} from './reactions.js';
import { visibilityRange, targetHeight, aimedShotHits, findCover } from './tactics.js';
export function unitsForHeat(heat){return heat<=0?0:Math.min(4,1+Math.floor(heat));}
export class EmergencyServices {
 constructor(scene,vehicles,navigator,population,toast){
  this.scene=scene;this.vehicles=vehicles;this.navigator=navigator;this.population=population;this.toast=toast;
  this.lastKnown=null;this.reportCooldown=0;this.escape=0;this.incidents=[];this.contact=0;this.pathClock=0;
  this.patrols=[[-93,-18],[-147,-45],[-237,93],[51,195]].map(([x,z],i)=>{
   const car=vehicles.add(x,z,'#cbd5d1',0,'police');car.station={x,z};car.path=[];car.target=null;car.repath=0;
   const officer=createPerson('#b68d6b','#637d91');const gun=weaponModel('pistol');gun.position.set(.44,1.35,.3);officer.add(gun);scene.add(officer);officer.visible=false;return {car,officer,gun,health:100,active:false,shot:0,index:i,patrol:0,onFoot:false,footPath:[],footRepath:0,aim:null,aimTime:0,patrolStops:[{x,z},{x:i%2?-237:-93,z:93},{x:i%2?-147:51,z:-45}]};
  });
  this.roadblocks=[[-93,-66],[-93,-78]].map(([x,z])=>({car:vehicles.add(x,z,'#b5c9cb',0,'police'),home:{x,z},stage:'idle',goal:null}));
  this.ambulances=[[-174,-6],[-160,-6]].map(([x,z])=>({car:vehicles.add(x,z,'#ecebdc',Math.PI/2,'ambulance'),home:{x,z},incident:null,stage:'idle',timer:0,medics:[]}));
  this.helicopter=makeHelicopter();this.helicopter.position.set(-144,38,-96);this.helicopter.visible=false;scene.add(this.helicopter);
 }
 releaseVehicle(car,state){car.officialType=car.kind;const owner=[...this.patrols,...this.ambulances,...this.roadblocks].find(u=>u.car===car);if(owner){this.finishServiceCall(owner);owner.stolen=true;owner.stolenAt=state.elapsed;owner.active=false;owner.onFoot=false;if(owner.officer)owner.officer.visible=false;if(owner.incident){owner.incident.assigned=false;owner.incident.person.medicalHold=false;owner.incident=null;}for(const m of owner.medics||[])m.visible=false;}car.kind='parked';car.owned=false;car.path=[];car.speed=0;car.mesh.userData.siren?.forEach(m=>m.visible=false);}
 restoreService(unit,state,kind){if(!unit.stolen)return false;const home=unit.home||unit.car.station;if(state.elapsed-unit.stolenAt>30&&distance(state,home)>80){const car=this.vehicles.add(home.x,home.z,'#cbd5d1',0,kind);car.station={...home};car.path=[];car.repath=0;unit.car=car;unit.stolen=false;unit.health=100;if(unit.officer){unit.officer.userData.action=null;unit.officer.rotation.z=0;}unit.stage='idle';unit.aim=null;unit.medics=[];}return true;}
 requestService(kind,point,state){
  const list=kind==='police'?this.patrols:this.ambulances;if(kind==='police'&&state.heat>0)return 'Police are already searching for you.';
  const unit=list.find(u=>!u.stolen&&!u.assist&&u.car.health>0&&(kind==='police'?u.health>0&&!u.active:u.stage==='idle'));if(!unit)return 'All units are busy. Please try again shortly.';
  unit.assist={kind,point:{x:point.x,z:point.z},until:state.elapsed+120,phase:'driving'};unit.car.repath=0;if(kind==='ambulance')unit.stage='call';return 'A '+(kind==='police'?'police patrol':'medical team')+' is coming to your shared location.';
 }
 finishServiceCall(unit){
  const call=unit.assist;if(!call)return;if(call.medic){this.scene.remove(call.medic);const geometries=new Set(),materials=new Set();call.medic.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  unit.assist=null;if(call.kind==='ambulance')unit.stage='returning';else{unit.officer.visible=false;unit.onFoot=false;}unit.car.mesh.userData.driver.visible=unit.car.health>0;unit.car.speed=0;
 }
 updateServiceCall(unit,dt,state){
  const call=unit.assist;if(!call)return false;const finish=()=>this.finishServiceCall(unit);
  if(state.elapsed>call.until||unit.car.health<=0||call.kind==='police'&&(state.heat>0||unit.health<=0)){finish();return false;}
  if(call.phase==='driving'){const arrived=distance(unit.car,call.point)<6||this.navigate(unit.car,call.point,dt,16);if(arrived||distance(unit.car,call.point)<28&&unit.car.stalled>2){const starts=[-3,3].map(v=>({x:unit.car.x+Math.cos(unit.car.angle)*v,z:unit.car.z-Math.sin(unit.car.angle)*v}));const start=starts.find(p=>!this.navigator.collision.blocked(p.x,p.z,.6));if(start){call.walker=start;call.phase='walking';unit.car.mesh.userData.driver.visible=false;if(call.kind==='police')unit.onFoot=true;unit.car.speed=0;if(call.kind==='ambulance'){call.medic=createPerson('#bd8e68','#c8ddd0');this.scene.add(call.medic);}}}}
  if(call.phase!=='driving'){const m=call.medic||unit.officer,pace=stepWalker(call.walker,call.point,this.navigator.foot,dt,state.elapsed,{speed:3.4,stop:1.7});m.visible=!state.interior;m.position.set(call.walker.x,.3,call.walker.z);m.rotation.y=call.walker.facing||0;m.userData.left.rotation.x=pace?Math.sin(state.elapsed*10)*.5:0;m.userData.right.rotation.x=-m.userData.left.rotation.x;if(distance(call.walker,call.point)<2){if(call.phase!=='arrived'){call.phase='arrived';call.until=state.elapsed+15;this.toast(call.kind==='police'?'Patrol arrived at your shared location.':'Medical team arrived. Approach the medic for treatment.');}if(call.kind==='ambulance'&&!call.treated&&!state.interior&&distance(call.walker,state)<3){call.treated=true;this.onAid?.(state);}}}
  unit.car.mesh.userData.siren.forEach((m,i)=>m.visible=call.phase==='driving'&&(Math.sin(state.elapsed*12)>0?i===0:i===1));return true;
 }
 report(severity,position,state){
  if(this.reportCooldown>0&&severity<2)return false;
  const witnesses=this.population.people.some(p=>!p.dead&&!p.injured&&!p.inside&&!p.removed&&distance(p,position)<35&&this.navigator.collision.lineClear(p,position,.1,1.5));
  const police=this.patrols.some(u=>u.health>0&&distance(u.car,position)<55&&this.navigator.collision.lineClear(u.car,position,.1,1.5));
  if(!witnesses&&!police)return false;
  state.heat=clamp(state.heat+severity,0,5);state.factions.police=clamp(state.factions.police-severity*2,-100,100);this.lastKnown={x:position.x,z:position.z};this.escape=0;this.reportCooldown=2;
  this.toast(`Incident reported · ${unitsForHeat(state.heat)} patrols responding${state.heat>=3?' · air support requested':''}`);return true;
 }
 collision(a,b,impact,state){
  if(impact<6||!state.driving||a!==state.driving&&b!==state.driving)return;
  const unit=this.patrols.find(u=>u.car===a||u.car===b);if(!unit||unit.health<=0)return;
  unit.forcedExit=true;unit.car.speed=0;state.heat=Math.max(state.heat,3);this.lastKnown={x:state.x,z:state.z};
 }
 dispatch(person,state,position=person){
  if(this.incidents.some(i=>i.person.id===person.id&&!i.closed))return;
  this.incidents.push({person,position:{x:position.x,z:position.z},created:state.elapsed,closed:false,assigned:false});
  this.toast('Emergency call received. An ambulance has been dispatched.');
 }
 navigate(car,goal,dt,speed=17){
  if(car.health<=0||car.impactTime>0){if(car.health<=0)car.speed=0;return false;}
  const roadPoint=this.navigator.project(goal);if(!roadPoint){car.speed=0;return false;}
  goal={x:roadPoint.x,z:roadPoint.z};
  car.stalled=car.lastProgress&&distance(car,car.lastProgress)<.03?(car.stalled||0)+dt:0;car.lastProgress={x:car.x,z:car.z};
  car.repath=(car.repath||0)-dt;
  if(car.repath<=0||!car.target||distance(car.target,goal)>12){car.path=this.navigator.laneRoute(car,goal,1.8,car.alternateLane?-2.8:2.8);if(!car.path.length)car.path=this.navigator.route(car,goal,1.8);car.target={...goal};car.repath=4;}
  car.prev={x:car.x,z:car.z};
  if(car.stalled>2.5&&!car.recoverTime&&(!car.waitingForTraffic||car.stalled>6)){car.recoverTime=1.1;car.alternateLane=!car.alternateLane;car.repath=0;car.stalled=0;car.navRecoveries=(car.navRecoveries||0)+1;}
  if(car.recoverTime>0){car.recoverTime-=dt;const clear=this.vehicles.cars.every(o=>o===car||o.kind==='removed'||vehicleGap(car,o,car.angle+Math.PI)>1+2*dt);car.speed=clear?-2:0;if(clear)moveVehicle(car,-Math.sin(car.angle)*2*dt,-Math.cos(car.angle)*2*dt,this.navigator.collision);car.mesh.position.set(car.x,.26,car.z);return false;}
  const next=car.path?.[0];if(!next){car.speed=approach(car.speed,0,dt*12);return distance(car,goal)<6;}
  const d=distance(car,next);if(d<.45){car.path.shift();return false;}
  const turn=steerVehicle(car,Math.atan2(next.x-car.x,next.z-car.z),dt,this.navigator.collision);
  const gap=Math.min(Infinity,...this.vehicles.cars.filter(o=>o!==car&&o.kind!=='removed').map(o=>vehicleGap(car,o)));
  car.waitingForTraffic=gap<3;
  const following=car.path[1],straight=following&&((next.x-car.x)*(following.x-next.x)+(next.z-car.z)*(following.z-next.z))/(d*distance(next,following))>.98;
  const corner=straight?speed:Math.sqrt(Math.max(0,2*8*(d-.4)));
  const target=Math.abs(turn)>.3?0:Math.min(speed,corner,Math.sqrt(Math.max(0,2*8*(gap-1))))*Math.max(0,Math.cos(turn));
  car.speed=approach(car.speed,target,dt*10);
  const travel=Math.abs(turn)>.3?0:Math.min(d,Math.max(0,gap-.6),Math.max(0,car.speed*dt));
  if(car.waitingForTraffic&&travel<car.speed*dt)car.speed=0;
  if(moveVehicle(car,Math.sin(car.angle)*travel,Math.cos(car.angle)*travel,this.navigator.collision)){car.speed=0;car.repath=Math.min(car.repath,.75);}
  car.mesh.position.set(car.x,.26,car.z);car.mesh.rotation.y=car.angle;return distance(car,goal)<6;
 }
 returnToCar(unit,dt,state){
  const {car,officer}=unit;car.speed=0;unit.aim=null;unit.forcedExit=false;
  car.mesh.userData.driver.visible=false;car.mesh.userData.doors.forEach(d=>d.rotation.y=0);
  const pos={x:officer.position.x,z:officer.position.z};
  const doors=[-1,1].map(side=>({x:car.x+Math.cos(car.angle)*3*side,z:car.z-Math.sin(car.angle)*3*side})).filter(p=>!this.navigator.collision.blocked(p.x,p.z,.55)).sort((a,b)=>distance(a,pos)-distance(b,pos));
  const goal=doors[0];if(!goal)return;
  const walker=unit.walker||{...pos};walker.x=pos.x;walker.z=pos.z;unit.walker=walker;
  const pace=stepWalker(walker,goal,this.navigator.foot,dt,state.elapsed,{speed:3.6,radius:.55,stop:.7});
  officer.visible=!state.interior;officer.position.set(walker.x,.3,walker.z);
  if(walker.facing!=null)officer.rotation.y=walker.facing;
  officer.userData.left.rotation.x=pace>.1?Math.sin(state.elapsed*11)*.5:0;officer.userData.right.rotation.x=-officer.userData.left.rotation.x;
  if(distance(walker,goal)<.8){unit.onFoot=false;unit.returning=false;unit.walker=null;unit.exitTime=0;officer.visible=false;car.mesh.userData.driver.visible=unit.health>0&&!car.exploded;car.repath=0;}
 }
 update(dt,state,onPlayerDamage,onArrest){
  this.reportCooldown=Math.max(0,this.reportCooldown-dt);
  const outside=state.interior?this.outsidePosition?.()||state:state;
  let detected=false,nearest=Infinity;
  for(const unit of this.patrols){
   if(this.restoreService(unit,outside===state?state:{...state,x:outside.x,z:outside.z},'police'))continue;
   if(this.updateServiceCall(unit,dt,state))continue;
   const {car,officer}=unit;unit.active=unit.index<unitsForHeat(state.heat)&&unit.health>0;
   if(unit.health<=0||car.health<=0){unit.reinforcement=(unit.reinforcement||0)+dt;if(unit.reinforcement>30&&distance(car,outside)>85){Object.assign(car,{x:car.station.x,z:car.station.z,prev:{...car.station},health:100,repath:0,speed:0});this.vehicles.repair(car);unit.health=100;officer.userData.action=null;officer.rotation.z=0;unit.reinforcement=0;unit.onFoot=false;unit.forcedExit=false;unit.aim=null;}}
   if(unit.onFoot&&unit.health>0&&(!unit.active||unit.returning)){unit.returning=true;car.mesh.userData.siren.forEach(m=>m.visible=false);this.returnToCar(unit,dt,state);continue;}
   if(!unit.active){officer.visible=false;unit.onFoot=false;unit.aim=null;car.mesh.userData.driver.visible=unit.health>0&&!car.exploded;car.mesh.userData.siren.forEach(m=>m.visible=false);if(unit.health>0&&car.health>0){const destination=unit.patrolStops[unit.patrol];if(this.navigate(car,destination,dt,7))unit.patrol=(unit.patrol+1)%unit.patrolStops.length;}else car.speed=0;continue;}
   nearest=Math.min(nearest,distance(car,outside));
   const observer=unit.onFoot?{x:officer.position.x,z:officer.position.z}:car;
   const sees=!state.interior&&distance(observer,state)<visibilityRange(state)&&this.navigator.collision.lineClear(observer,state,.1,targetHeight(state));
   if(sees){this.lastKnown={x:state.x,z:state.z};detected=true;}
   if(this.lastKnown&&!unit.onFoot){
    let goal={x:this.lastKnown.x+(unit.index%2?4:-4),z:this.lastKnown.z+(unit.index>1?5:-5)};
    if(this.navigator.collision.blocked(goal.x,goal.z,1.8))goal={...this.lastKnown};
    if(distance(car,goal)>7)this.navigate(car,goal,dt,state.driving?22:12);
    else car.speed=0;
   }
   car.mesh.userData.siren.forEach((m,i)=>m.visible=Math.sin(state.elapsed*17+unit.index)>0?i===0:i===1);
   if(!unit.onFoot&&sees&&distance(car,state)<23&&(!state.driving||unit.forcedExit||car.health<35||Math.abs(car.speed)<4&&state.heat>=3)){
    const starts=[-1,1].map(side=>({x:car.x+Math.cos(car.angle)*3*side,z:car.z-Math.sin(car.angle)*3*side}));
    const start=starts.find(p=>!this.navigator.collision.blocked(p.x,p.z,.55)&&this.vehicles.cars.every(c=>c===car||distance(c,p)>2.5));
    if(start){unit.onFoot=true;unit.returning=false;unit.walker=null;unit.exitTime=.7;car.mesh.userData.driver.visible=false;officer.position.set(start.x,.3,start.z);unit.footRepath=0;}
   }
   if(unit.exitTime>0){unit.exitTime-=dt;car.mesh.userData.doors[0].rotation.y=-Math.sin(Math.max(0,unit.exitTime)/.7*Math.PI)*1.2;}
   car.mesh.userData.driver.visible=!unit.onFoot&&unit.health>0&&!car.exploded;officer.visible=unit.onFoot;unit.gun.visible=state.heat>=3||unit.forcedExit;officer.userData.armR.rotation.x=state.heat>=3?-1.4:0;
   if(unit.onFoot){
    car.speed=0;
    const pos={x:officer.position.x,z:officer.position.z};nearest=Math.min(nearest,distance(pos,outside));
    unit.footRepath-=dt;unit.shot=Math.max(0,unit.shot-dt);
    if(distance(pos,outside)>45){unit.returning=true;unit.walker=null;this.returnToCar(unit,dt,state);continue;}
    const armed=state.heat>=3||unit.forcedExit,goal=this.lastKnown||outside;
    const walker=unit.walker||{...pos};walker.x=pos.x;walker.z=pos.z;unit.walker=walker;const pace=stepWalker(walker,goal,this.navigator.foot,dt,state.elapsed,{speed:3.6,radius:.55,stop:armed?16:1.5,visible:sees});officer.position.set(walker.x,.3,walker.z);pos.x=walker.x;pos.z=walker.z;officer.rotation.y=pace>.1&&walker.facing!=null?walker.facing:Math.atan2(goal.x-pos.x,goal.z-pos.z);officer.userData.left.rotation.x=pace>.1?Math.sin(state.elapsed*11)*.5:0;officer.userData.right.rotation.x=-officer.userData.left.rotation.x;
    if(!sees||!armed){unit.aim=null;continue;}
    if(!unit.aim&&unit.shot<=0&&distance(pos,state)<30){unit.aim={x:state.x,z:state.z};unit.aimTime=.65;}
    if(unit.aim){
     unit.aimTime-=dt;
     if(unit.aimTime<=0){
      if(aimedShotHits(pos,unit.aim,state,this.navigator.collision)){if(state.driving)state.driving.health=Math.max(0,state.driving.health-5);onPlayerDamage(state.driving?3:8);}
      react(officer,'shoot',state.elapsed);this.onGunshot?.();this.onOfficerShot?.(pos,unit.aim);unit.aim=null;unit.shot=1.2+unit.index*.25;
     }
    }
   }
  }
  const air=state.heat>=3;this.helicopter.visible=air;
  if(air){
   const goal=this.lastKnown||outside;const p=this.helicopter.position;const tx=goal.x+Math.sin(state.elapsed*.3)*23,tz=goal.z+Math.cos(state.elapsed*.3)*23;
   p.x=approach(p.x,tx,dt*27);p.z=approach(p.z,tz,dt*27);p.y=38+Math.sin(state.elapsed)*1.2;this.helicopter.rotation.y=Math.atan2(tx-p.x,tz-p.z);this.helicopter.userData.rotor.rotation.y+=dt*40;
   if(!state.interior&&Math.hypot(p.x-state.x,p.z-state.z)<45&&this.navigator.collision.lineClear({x:p.x,z:p.z},state,.1,32)){detected=true;this.lastKnown={x:state.x,z:state.z};}
  }
  if(state.heat>0){
   this.escape=detected?0:this.escape+dt;
   if(this.escape>22){state.heat=0;this.escape=0;this.toast('Search called off. Your wanted level is clear.');}
   this.contact=detected&&!state.interior&&!state.driving&&nearest<2.5&&Math.abs(state.speed)<3&&!state.walking&&state.dodge<=0?this.contact+dt:0;
   if(this.contact>3){state.heat=0;this.contact=0;onArrest();}
  }
  for(const block of this.roadblocks){
   if(this.restoreService(block,state,'police'))continue;
   const {car}=block;
   if(state.heat>=4&&block.stage==='idle'&&this.lastKnown){
    const heading=state.heading||0,offset=this.roadblocks.indexOf(block)?-60:60;
    block.goal=this.navigator.project({x:this.lastKnown.x+Math.sin(heading)*offset,z:this.lastKnown.z+Math.cos(heading)*offset});
    if(block.goal){block.stage='deploying';car.repath=0;}
   }
   if(state.heat<4&&['deploying','blocking'].includes(block.stage)){block.stage='returning';car.repath=0;}
   if(block.stage==='deploying'&&this.navigate(car,block.goal,dt,19)){
    block.stage='blocking';car.speed=0;car.angle=block.goal.segment.x1===block.goal.segment.x2?Math.PI/2:0;car.mesh.rotation.y=car.angle;
   }else if(block.stage==='returning'&&this.navigate(car,block.home,dt,12)){block.stage='idle';car.speed=0;}
   car.mesh.userData.siren.forEach((m,i)=>m.visible=['deploying','blocking'].includes(block.stage)&&(Math.sin(state.elapsed*14)>0?i===0:i===1));
  }
  for(const ambulance of this.ambulances){
   if(this.restoreService(ambulance,state,'ambulance'))continue;
   if(this.updateServiceCall(ambulance,dt,state))continue;
   const {car}=ambulance;
   if(ambulance.stage==='idle'){
    const incident=this.incidents.find(i=>!i.closed&&!i.assigned&&state.elapsed-i.created>1);
    if(incident){incident.assigned=true;ambulance.incident=incident;ambulance.stage='responding';car.repath=0;}
   }
   const flashing=ambulance.stage==='responding';car.mesh.userData.siren.forEach((m,i)=>m.visible=flashing&&(Math.sin(state.elapsed*12)>0?i===0:i===1));
   if(ambulance.stage==='responding'){
    const incident=ambulance.incident;
    if(!incident.person.inside&&!incident.person.removed)incident.position={x:incident.person.x,z:incident.person.z};
    if(this.navigate(car,incident.position,dt,18)||(car.stalled>2&&distance(car,incident.position)<45)){
     ambulance.stage='approaching';ambulance.timer=0;car.speed=0;incident.person.medicalHold=true;
     for(const [index,offset] of [-1.8,1.8].entries()){
      const mesh=createPerson('#bc9679','#c8ddd0');const start={x:car.x+Math.cos(car.angle)*offset,z:car.z-Math.sin(car.angle)*offset};
      const candidates=Array.from({length:12},(_,i)=>({x:incident.position.x+Math.sin((i+index*6)*Math.PI/6)*1.6,z:incident.position.z+Math.cos((i+index*6)*Math.PI/6)*1.6}));
      const goal=candidates.find(p=>!this.navigator.collision.blocked(p.x,p.z,.5))||incident.position;
      mesh.position.set(start.x,.3,start.z);mesh.userData.route=this.navigator.foot.route(start,goal,.5);mesh.userData.goal=goal;this.scene.add(mesh);ambulance.medics.push(mesh);
     }
    }
   }else if(ambulance.stage==='approaching'){
    let arrived=0;
    for(const mesh of ambulance.medics){
     const next=mesh.userData.route[0];const pos={x:mesh.position.x,z:mesh.position.z};
     if(next){const d=distance(pos,next);if(d<.45)mesh.userData.route.shift();else{const dx=(next.x-pos.x)/d,dz=(next.z-pos.z)/d;this.navigator.collision.move(pos,dx*Math.min(d,3.3*dt),dz*Math.min(d,3.3*dt),.5);mesh.position.set(pos.x,.3,pos.z);mesh.rotation.y=Math.atan2(dx,dz);mesh.userData.left.rotation.x=Math.sin(state.elapsed*11)*.5;mesh.userData.right.rotation.x=-mesh.userData.left.rotation.x;}}
     if(distance(pos,mesh.userData.goal)<1)arrived++;
    }
    if(arrived===ambulance.medics.length){ambulance.stage='treating';ambulance.timer=0;}
   }else if(ambulance.stage==='treating'){
    ambulance.timer+=dt;
    if(ambulance.timer>=7){
     const p=ambulance.incident.person;p.mesh.visible=false;p.removed=true;p.injured=false;p.inside=null;
     if(!p.dead)p.hospitalUntil=state.elapsed+45;
     ambulance.incident.closed=true;ambulance.stage='returning';car.repath=0;
     for(const mesh of ambulance.medics){this.scene.remove(mesh);mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}ambulance.medics=[];
     this.toast(p.dead?'Emergency crew has recovered the victim.':'Patient stabilized and transported to Maya General Hospital.');
    }
   }else if(ambulance.stage==='returning'&&this.navigate(car,ambulance.home,dt,12)){
    ambulance.stage='parking';car.path=this.navigator.foot.route(car,ambulance.home,2.5);car.speed=0;
   }else if(ambulance.stage==='parking'){
    const next=car.path[0];
    if(next){const d=distance(car,next);if(d<.4)car.path.shift();else{car.angle=Math.atan2(next.x-car.x,next.z-car.z);car.speed=3;moveVehicle(car,(next.x-car.x)/d*Math.min(d,3*dt),(next.z-car.z)/d*Math.min(d,3*dt),this.navigator.collision);car.mesh.position.set(car.x,.26,car.z);car.mesh.rotation.y=car.angle;}}
    if(distance(car,ambulance.home)<.7){ambulance.stage='idle';ambulance.incident=null;car.speed=0;car.angle=Math.PI/2;car.mesh.rotation.y=car.angle;}
   }
  }
  for(const p of this.medicalPeople?.()||this.population.people)if(!p.dead&&p.removed&&p.hospitalUntil&&state.elapsed>=p.hospitalUntil){p.health=100;p.removed=false;p.injured=false;p.hospitalUntil=0;p.medicalHold=false;p.x=-144;p.z=8;p.mesh.rotation.z=0;p.mesh.userData.action=null;p.mesh.visible=true;p.routine='';p.route=[];}
  this.incidents=this.incidents.filter(i=>!i.closed||state.elapsed-i.created<90);
 }
 get responding(){return this.ambulances.filter(a=>a.stage==='responding'||a.stage==='approaching'||a.stage==='treating').length;}
}
