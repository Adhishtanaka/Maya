import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CollisionWorld} from '../src/physics.js';
import {Flight} from '../src/flight.js';
import {Ordnance,blastDamage,bulletDamage} from '../src/ordnance.js';
import {completeBuildingStep,normalizeBuildingJobs} from '../src/interior-activities.js';
import {Vehicles,vehicleBlocked} from '../src/vehicles.js';
import {VEHICLE_SPECS} from '../src/actor-models.js';
import {readSave,SAVE_KEY} from '../src/systems.js';
const empty=()=>new CollisionWorld([]);
const state=()=>({x:0,z:-280,altitude:0,hour:12,elapsed:1,heading:0,angle:0,fuel:100,cheats:{},inventory:{jetpack:true,parachute:true,grenade:3,c4:3,missile:3},health:100});
function tick(f,s,seconds,input={}){for(let i=0;i<seconds*30;i++){s.elapsed+=1/30;f.update(1/30,s,{up:false,down:false,left:false,right:false,ascend:false,descend:false,...input},d=>s.health-=d);}}
test('jetpack fuel, controlled descent and parachute landing are distinct from freefall',()=>{
 const f=new Flight(new THREE.Scene(),empty(),new THREE.Group()),s=state();assert.equal(f.jetpack(s),true);tick(f,s,2,{ascend:true});assert.ok(s.altitude>20&&s.fuel<100);assert.equal(f.exit(s),false);assert.equal(f.parachute(s),true);tick(f,s,8);assert.equal(s.altitude,0);assert.equal(s.flightMode,null);assert.equal(s.health,100);
 assert.equal(f.jetpack(s),true);tick(f,s,2,{ascend:true});f.jetpack(s);tick(f,s,2);assert.equal(s.health,45);
});
test('plane cannot lift without speed; helicopter climbs vertically; walls stop low flight',()=>{
 const f=new Flight(new THREE.Scene(),empty(),new THREE.Group()),s=state();f.board(f.craft[1],s);tick(f,s,1,{ascend:true});assert.equal(s.altitude,0);tick(f,s,3,{ascend:true,up:true});assert.ok(s.altitude>12&&s.airSpeed>20);
 const c=new CollisionWorld([{x:0,z:-270,w:20,d:1,height:20}]),g=new Flight(new THREE.Scene(),c,new THREE.Group()),t=state();t.z=-275;t.angle=Math.PI;g.jetpack(t);tick(g,t,2,{up:true});assert.ok(t.z<-271);assert.ok(t.health<100);
 const u=state();g.board(g.craft[0],u);tick(g,u,1,{ascend:true});assert.ok(u.altitude>=11);
});
test('grenades expire, missiles impact walls, C4 respects interior floor and finite inventory',()=>{
 const scene=new THREE.Scene(),collision=new CollisionWorld([{x:0,z:5,w:20,d:1,height:10}]),explosions=[],o=new Ordnance(scene,collision,(k,p)=>explosions.push({k,p})),s=state();s.x=0;s.z=0;
 assert.equal(o.launch('missile',s,{x:0,z:20}),true);for(let i=0;i<30;i++)o.update(1/30,s);assert.equal(explosions[0].k,'missile');assert.ok(explosions[0].p.z<5);assert.equal(s.inventory.missile,2);
 o.launch('grenade',s,{x:0,z:20});for(let i=0;i<60;i++)o.update(1/30,s);assert.equal(explosions.length,1);for(let i=0;i<20;i++)o.update(1/30,s);assert.equal(explosions[1].k,'grenade');
 s.interior='home';s.floor=1;o.launch('c4',s,{x:0,z:0});s.floor=0;assert.equal(o.detonate(s),0);s.floor=1;assert.equal(o.detonate(s),1);assert.equal(o.detonate(s),0);o.cooldown=0;s.altitude=10;assert.equal(o.launch('c4',s,{x:0,z:0}),false);s.inventory.grenade=0;assert.equal(o.launch('grenade',s,{x:0,z:0}),false);assert.equal(o.launch('unknown',s,{x:0,z:0}),false);
});
test('firearm and explosive damage fall off and do not kill a healthy target in one hit',()=>{
 for(const k of ['pistol','rifle']){assert.ok(bulletDamage(k,5)<30);assert.ok(bulletDamage(k,90)<bulletDamage(k,5));assert.ok(bulletDamage(k,10000)>0);}
 for(const k of ['grenade','c4','missile']){assert.ok(blastDamage(k,0)<100);assert.ok(blastDamage(k,3)<blastDamage(k,0));assert.equal(blastDamage(k,100),0);}
});
test('work orders enforce order, pay once and survive bounded save migration',()=>{
 const s={buildingJobs:{home:1},money:0,reputation:0};assert.equal(completeBuildingStep(s,'home',2),false);assert.equal(completeBuildingStep(s,'home',1),true);assert.equal(s.money,0);assert.equal(completeBuildingStep(s,'home',2),true);assert.equal(s.money,220);assert.equal(completeBuildingStep(s,'home',2),false);assert.equal(s.money,220);
 assert.deepEqual(normalizeBuildingJobs({'bad id':2,home:300,shop:1.2}),{home:3});
 const raw={version:2,x:0,z:33,money:220,hour:12,buildingJobs:s.buildingJobs,equipment:{jetpack:true,parachute:true,grenade:999,c4:-1,missile:6},aircraft:['plane','fake'],vehicles:[{id:'car-200',x:0,z:33,angle:0,model:'bicycle',health:100}]};const restored=readSave({getItem:key=>key===SAVE_KEY?JSON.stringify(raw):null});assert.deepEqual(restored.buildingJobs,{home:3});assert.equal(restored.equipment.grenade,12);assert.equal(restored.equipment.c4,0);assert.deepEqual(restored.aircraft,['plane']);assert.equal(restored.vehicles[0].model,'bicycle');
});
test('narrow two-wheelers fit gaps buses cannot; destroyed bicycles never explode',()=>{
 const wall=new CollisionWorld([{x:1.2,z:0,w:.3,d:10,height:3}]);assert.equal(vehicleBlocked(wall,0,0,0,VEHICLE_SPECS.bicycle),false);assert.equal(vehicleBlocked(wall,0,0,0,VEHICLE_SPECS.bus),true);
 const vehicles=new Vehicles(new THREE.Scene(),empty()),bike=vehicles.add(0,0,'#919947',0,'parked',{model:'bicycle'});let boom=false;vehicles.onExplosion=()=>boom=true;bike.health=0;vehicles.updateFire(bike,10,{elapsed:10});assert.equal(boom,false);assert.equal(bike.fire,undefined);
});
test('all interior templates have reachable stairs, orders and furnished upper work rooms',async()=>{
 const {Interiors}=await import('../src/interiors.js'),{Navigator}=await import('../src/physics.js');
 const interiors=new Interiors(new THREE.Scene(),{people:[]});
 for(const kind of ['apartment','house','cabin','club','armory','bank','hospital','warehouse','garage','temple','cafe','shop','office'])for(const floor of [0,1]){
  const room=interiors.build({id:kind,kind,name:kind},floor),nav=new Navigator(room.collision,.5),start=floor?{x:9.8,z:7.9}:{x:0,z:7.4};
  for(const item of room.items.filter(i=>['stairs','work-order','work-a','work-b'].includes(i.id))){assert.equal(room.collision.blocked(item.x,item.z,.6),false,`${kind} ${floor} ${item.id} is blocked`);assert.ok(nav.route(start,item,.6).length,`${kind} ${floor} ${item.id} is unreachable`);}
 }
});
test('pedaling stops at rest and motorcycles use a fixed riding pose',()=>{
 const vehicles=new Vehicles(new THREE.Scene(),empty()),bike=vehicles.add(0,0,'#ffffff',0,'parked',{model:'bicycle'}),motor=vehicles.add(10,0,'#ffffff',0,'parked',{model:'motorcycle'}),s={x:100,z:100,hour:12,elapsed:1,weather:'clear'};
 const update=()=>vehicles.update(.01,s,[],()=>{},()=>{},()=>{});update();let limbs=bike.mesh.userData.driver.userData;assert.equal(limbs.left.rotation.x,limbs.right.rotation.x);bike.speed=3;motor.speed=3;update();assert.notEqual(limbs.left.rotation.x,limbs.right.rotation.x);limbs=motor.mesh.userData.driver.userData;assert.equal(limbs.left.rotation.x,limbs.right.rotation.x);
});
test('disarmed residents stay disarmed after reload and ground-floor loot cannot be taken upstairs',async()=>{
 const {StreetCombat}=await import('../src/street-combat.js'),{createPerson}=await import('../src/actor-models.js');
 const raw={version:2,x:0,z:33,money:0,hour:12,residents:{'resident-40':{health:15,dropped:true}}},save=readSave({getItem:()=>JSON.stringify(raw)});assert.equal(save.residents['resident-40'].dropped,true);
 const p={id:'resident-40',gang:true,mesh:createPerson(),x:0,z:0,injured:true,...save.residents['resident-40']},street=new StreetCombat(new THREE.Scene(),{people:[p]}, {},empty());street.update(.1,{elapsed:1},()=>{});assert.equal(street.drops.length,0);assert.equal(p.gun.visible,false);
 street.drop({x:0,z:0,id:'resident-41'},'pistol',{elapsed:1},street.scene,'home');assert.equal(street.nearest({x:0,z:0,interior:'home',floor:1}),undefined);assert.equal(street.nearest({x:0,z:0,interior:'home',floor:0}).source,'resident-41');
});
test('jetpack and parachute strafe toward camera-right at every compass heading',()=>{
 for(const mode of ['jetpack','parachute'])for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){const f=new Flight(new THREE.Scene(),empty(),new THREE.Group()),s=state();f.jetpack(s);s.altitude=20;s.angle=angle;if(mode==='parachute')f.parachute(s);const start={x:s.x,z:s.z};tick(f,s,.25,{right:true});assert.ok((s.x-start.x)*Math.cos(angle)-(s.z-start.z)*Math.sin(angle)>1.9,`${mode} heading ${angle} must strafe right`);}
});
