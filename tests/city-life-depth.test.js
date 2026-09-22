import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {normalizeProfile,canEnterClub,readProfile} from '../src/player-profile.js';
import {react,reactionPose} from '../src/reactions.js';
import {createPerson} from '../src/actor-models.js';
import {CashDrops} from '../src/cash-drops.js';
import {CityJobs,CITY_JOBS,validJobVehicle,finishCityJob} from '../src/city-jobs.js';
import {CollisionWorld,Navigator} from '../src/physics.js';
import {StreetLife,canRecruit} from '../src/street-life.js';
import {FootPatrols} from '../src/foot-patrols.js';
import {Wildlife} from '../src/wildlife.js';
import {Tornado,windStrength} from '../src/tornado.js';
import {EmergencyServices} from '../src/emergency.js';
import {Vehicles} from '../src/vehicles.js';
import {readSave} from '../src/systems.js';
const scene=()=>new THREE.Scene(),nav=()=>new Navigator(new CollisionWorld([]));
const state=()=>({elapsed:1,x:0,z:0,altitude:0,health:100,money:0,reputation:0,jobRecords:{},speed:0,heat:0,dodge:0,weapon:'fists',crew:[],knocked:0});
const audio={play(){},chirp(){},noiseHit(){}};
test('onboarding validates local profile and enforces the adult club boundary',()=>{
 assert.equal(normalizeProfile({name:' ',age:20}),null);assert.equal(normalizeProfile({name:'Maya',age:17.9}),null);assert.equal(normalizeProfile({name:'Maya',age:121}),null);
 assert.deepEqual(normalizeProfile({name:' <Maya> ',age:18}),{name:'Maya',age:18});assert.equal(canEnterClub({age:17}),false);assert.equal(canEnterClub(null),false);assert.equal(canEnterClub({age:18}),true);assert.equal(readProfile({getItem(){throw Error();}}),null);
});
test('hit, jump, recoil and death poses interpolate and settle without floating',()=>{
 const m=createPerson('#a98765','#a62646');react(m,'hit',0,-1);reactionPose(m,.2);assert.ok(m.rotation.z<0);reactionPose(m,.5);assert.equal(m.rotation.z,0);
 react(m,'jump',1);reactionPose(m,1.3);assert.ok(m.position.y>.9);reactionPose(m,2);assert.equal(m.position.y,.3);
 react(m,'shoot',3);reactionPose(m,3.1);assert.ok(m.userData.armR.rotation.x<-1.2);
 react(m,'death',4);reactionPose(m,4.2);const early=m.rotation.z;reactionPose(m,4.8);assert.ok(m.rotation.z>early);reactionPose(m,6);assert.equal(m.rotation.z,1.47);assert.equal(m.position.y,.3);
});
test('cash is physical, floor scoped, paid once and expires within bounded storage',()=>{
 const drops=new CashDrops(),s=state(),p={id:'resident-2',x:0,z:0},world=scene();s.interior='home';s.floor=1;const item=drops.drop(p,s,world);assert.equal(drops.drop(p,s,world),null);s.floor=0;assert.equal(drops.nearest(s),undefined);s.floor=1;assert.equal(drops.nearest(s),item);assert.equal(drops.collect(item,s),39);assert.equal(drops.collect(item,s),0);assert.equal(s.money,39);
 drops.drop({id:'resident-3',x:0,z:0},s,world);s.elapsed=123;drops.update(s);assert.equal(drops.items.length,0);assert.equal(world.children.length,0);
});
test('city jobs enforce vehicle class, full route, damage failure and one-time payment',()=>{
 const car={health:100,spec:{},mesh:new THREE.Group(),officialType:'ambulance'},s=state(),j=new CityJobs(scene(),nav());
 assert.equal(validJobVehicle(CITY_JOBS.rescue,{...car,officialType:null}),false);assert.equal(validJobVehicle(CITY_JOBS.taxi,{...car,spec:{twoWheel:true}}),false);assert.equal(validJobVehicle(CITY_JOBS.escort,car),false);
 assert.equal(j.start('rescue',s),true);assert.equal(j.start('taxi',s),false);Object.assign(s,j.target());assert.match(j.interact(s),/ambulance/);s.driving=car;
 for(let i=0;i<3;i++){Object.assign(s,j.target());j.update(.1,s);const message=j.interact(s);assert.match(message,i===2?/JOB COMPLETE/:/Checkpoint/);}
 assert.equal(s.jobRecords.rescue,1);assert.ok(s.money>=1400);assert.equal(j.interact(s),null);
 const done={id:'courier',stage:3,condition:100,time:1};finishCityJob(s,done);const paid=s.money;assert.equal(finishCityJob(s,done),0);assert.equal(s.money,paid);
 j.start('courier',s);s.driving.health=0;assert.match(j.update(1,s),/too much damage/); // player damage joins cargo damage
});
test('escort waits for its passenger; expired jobs can be retried',()=>{
 const s=state(),j=new CityJobs(scene(),nav());j.start('escort',s);Object.assign(s,j.target());j.interact(s);Object.assign(s,j.target());assert.match(j.interact(s),/catch up/);assert.match(j.update(151,s),/Time ran out/);assert.equal(j.start('escort',s),true);
});
test('favors unlock at three helps, defensive punches have windup and threats cause flight',()=>{
 const p={id:'resident-0',x:1.8,z:0,mesh:createPerson(),health:100,relationship:40,helpCount:2,route:[],stun:0},s=state(),n=nav(),life=new StreetLife({people:[p],scene:scene()},n,{});assert.equal(canRecruit(p,[]),false);p.helpCount=3;assert.equal(canRecruit(p,[]),true);assert.equal(canRecruit(p,['a','b','c']),false);
 life.provoke(p,s,true);let damage=0;life.update(.01,s,d=>damage+=d);assert.equal(damage,0);s.elapsed+=.24;life.update(.24,s,d=>damage+=d);assert.equal(damage,9);
 s.weapon='pistol';life.provoke(p,s,true);assert.equal(p.fighting,false);assert.ok(p.fleeUntil>s.elapsed);assert.ok(p.destination.x>p.x);
});
test('foot officers walk, aim before firing, respect walls and stop after death',()=>{
 const n=nav(),s=state(),traces=[],p=new FootPatrols(scene(),n,{audio,tracer:(...v)=>traces.push(v),blood(){}},()=>{}),off=p.people[0];s.x=off.x+4;s.z=off.z;p.hurt(off,10,s);let damage=0;
 p.update(.1,s,d=>damage+=d);assert.equal(damage,0);s.elapsed+=.6;p.update(.6,s,d=>damage+=d);assert.equal(damage,14);assert.equal(traces.length,1);
 n.collision.add({x:off.x+2,z:off.z,w:.3,d:20,height:5});s.elapsed+=2;p.update(2,s,d=>damage+=d);assert.equal(damage,14);
 p.hurt(off,100,s);assert.equal(off.dead,true);s.elapsed+=1;p.update(1,s,d=>damage+=d);assert.equal(damage,14);assert.ok(off.mesh.rotation.z>1);
});
test('wildlife distinguishes pets, fleeing deer and hostile boars; walls block attacks',()=>{
 const c=new CollisionWorld([]),w=new Wildlife(scene(),c,audio),s=state(),dog=w.animals[0],boar=w.animals.find(a=>a.type==='boar');Object.assign(s,{x:dog.x,z:dog.z});assert.equal(w.nearest(s),dog);w.pet(dog,s);assert.equal(dog.friend,true);assert.equal(w.birds.length,12);
 s.x=boar.x+1;s.z=boar.z;let damage=0;w.update(.1,s,d=>damage+=d);assert.equal(damage,12);c.add({x:boar.x+.5,z:boar.z,w:.3,d:8,height:5});s.elapsed+=3;w.update(.1,s,d=>damage+=d);assert.equal(damage,12);
});
test('tornado warns before impulses, shelters interiors, rate limits damage and clears',()=>{
 const t=new Tornado(scene()),s=state(),cars={cars:[]},pop={people:[]};s.weatherMode='tornado';let damage=0;const hit=d=>damage+=d;t.update(.1,s,cars,pop,hit);assert.equal(s.tornado.warning,true);t.active.age=6;s.x=t.active.x;s.z=t.active.z;t.update(.01,s,cars,pop,hit);assert.equal(damage,8);t.update(.01,s,cars,pop,hit);assert.equal(damage,8);assert.ok(s.knocked>0);
 s.interior='home';s.elapsed+=2;t.update(.1,s,cars,pop,hit);assert.equal(damage,8);t.update(66,s,cars,pop,hit);assert.equal(s.tornado,null);assert.equal(s.weatherMode,'rain');assert.equal(windStrength(31),0);
});
test('official vehicle takeover releases service AI and replenishes the station remotely',()=>{
 const world=scene(),n=nav(),v=new Vehicles(world,n.collision),e=new EmergencyServices(world,v,n,{people:[]},()=>{}),unit=e.ambulances[0],stolen=unit.car,s=state();e.releaseVehicle(stolen,s);assert.equal(stolen.kind,'parked');assert.equal(stolen.officialType,'ambulance');assert.equal(unit.stolen,true);s.elapsed=35;s.x=100;s.z=200;e.restoreService(unit,s,'ambulance');assert.notEqual(unit.car,stolen);assert.equal(stolen.kind,'parked');assert.equal(unit.car.kind,'ambulance');
});
test('new save fields are bounded and preserve crew, help, loot, equipment and official vehicles',()=>{
 const saved=readSave({getItem:()=>JSON.stringify({version:2,x:0,z:0,money:0,hour:12,crew:['resident-1','resident-1','bad','resident-2','resident-3','resident-4'],jobRecords:{taxi:1,rescue:99999},residents:{'resident-1':{helpCount:3,cashDropped:true}},equipment:{bazooka:true},weapon:'bazooka',vehicles:[{id:'car-1',x:0,z:0,angle:0,health:100,officialType:'ambulance'}]})});assert.equal(saved.crew.length,3);assert.equal(saved.jobRecords.rescue,999);assert.equal(saved.residents['resident-1'].cashDropped,true);assert.equal(saved.residents['resident-1'].helpCount,3);assert.equal(saved.weapon,'bazooka');assert.equal(saved.equipment.bazooka,true);assert.equal(saved.vehicles[0].officialType,'ambulance');
});
test('public asset audit matches shipped files and retains the used Kenney license',()=>{
 const audit=JSON.parse(readFileSync('docs/asset-audit.json'));for(const f of audit.retained)assert.ok(existsSync('public'+f),f);for(const f of audit.removed)assert.equal(existsSync(f.path),false,f.path);
 const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);assert.deepEqual(walk('public').map(p=>p.slice(6)).sort(),audit.retained.slice().sort());assert.ok(audit.retained.includes('/assets/nature/LICENSE.txt'));
});
test('saved companions rejoin at clear nearby positions instead of staying inside their schedule',()=>{
 const n=nav(),p={id:'resident-8',x:100,z:100,inside:'home',relationship:60,mesh:createPerson()},s=state();s.crew=[p.id,'resident-999'];const life=new StreetLife({people:[p],scene:scene()},n,{});life.rejoin(s,{cars:[]});assert.deepEqual(s.crew,[p.id]);assert.equal(p.inside,null);assert.equal(p.following,true);assert.ok(Math.hypot(p.x-s.x,p.z-s.z)<6);
});
test('critical walking-officer injuries request medical aid and recovered officers can resume patrol',()=>{
 const n=nav(),s=state(),foot=new FootPatrols(scene(),n,{audio,tracer(){},blood(){}},()=>{});let calls=0;foot.onInjury=()=>calls++;const p=foot.people[0];foot.hurt(p,85,s,false);assert.equal(calls,1);assert.equal(p.injured,true);const before={x:p.x,z:p.z};foot.update(.5,s,()=>assert.fail('injured officer cannot fire'));assert.equal(p.x,before.x);assert.equal(p.z,before.z);p.removed=true;foot.update(.1,s,()=>{});assert.equal(p.mesh.visible,false);
 const world=scene(),vehicles=new Vehicles(world,n.collision),e=new EmergencyServices(world,vehicles,n,{people:[]},()=>{});e.medicalPeople=()=>[p];e.patrols=[];e.roadblocks=[];e.ambulances=[];p.hospitalUntil=2;s.elapsed=3;s.factions={police:0};e.update(.1,s,()=>{},()=>{});assert.equal(p.health,100);assert.equal(p.removed,false);assert.equal(p.injured,false);assert.equal(p.mesh.userData.action,null);
});
test('restored replacement ambulances retain their body markings and rescue eligibility',()=>{
 const v=new Vehicles(scene(),new CollisionWorld([])),c=v.add(0,0,'#eeeeee',0,'parked',{model:'van',officialType:'ambulance'});assert.equal(c.owned,true);assert.equal(validJobVehicle(CITY_JOBS.rescue,c),true);assert.ok(c.mesh.userData.siren.length>0);
});
test('recruited armed residents do not target their own crew after nearby violence',async()=>{
 const {StreetCombat}=await import('../src/street-combat.js'),p={id:'resident-40',gang:true,relationship:60,mesh:createPerson(),x:1,z:0},s=state();s.crew=[p.id];const combat={audio,tracer(){}},street=new StreetCombat(scene(),{people:[p]},combat,new CollisionWorld([]));street.alert(s,s);assert.equal(p.hostileUntil,0);p.hostileUntil=30;street.update(1,s,()=>assert.fail('crew cannot shoot player'));assert.equal(p.aim,null);assert.equal(p.hostileUntil,0);
 s.crew=[];street.alert(s,s);assert.ok(p.hostileUntil>s.elapsed);street.update(1,s,()=>{});assert.equal(p.mesh.userData.action.kind,'shoot');
});
