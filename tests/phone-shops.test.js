import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CollisionWorld,Navigator,RoadNavigator,distance} from '../src/physics.js';
import {stepWalker,reachableRoute} from '../src/navigation-recovery.js';
import {CityPhone,normalizePhone,PocketSnake,MemoryPairs} from '../src/phone.js';
import {normalizeWardrobe,buyOutfit,wear} from '../src/wardrobe.js';
import {radioSignal} from '../src/vehicle-radio.js';
import {Vehicles} from '../src/vehicles.js';
import {EmergencyServices} from '../src/emergency.js';
import {createPerson} from '../src/actor-models.js';
import {readSave} from '../src/systems.js';
test('officer close behind a wall walks around it instead of stopping at shooting distance',()=>{
 const c=new CollisionWorld([{x:0,z:0,w:.5,d:12,height:4}]),n=new Navigator(c,1),p={x:-2,z:0},goal={x:2,z:0};for(let i=0;i<500;i++){stepWalker(p,goal,n,.05,i*.05,{speed:4,stop:7,visible:c.lineClear(p,goal,.1,1.4)});assert.equal(c.blocked(p.x,p.z,.6),false);}assert.ok(c.lineClear(p,goal,.1,1.4));assert.ok(p.z>5||p.z<-5||p.x>0);
});
test('blocked goals use reachable edges and trapped actors have a bounded overlap recovery',()=>{
 const c=new CollisionWorld([{x:0,z:0,w:2,d:2,height:4}]),n=new Navigator(c,1),p={x:0,z:0};stepWalker(p,{x:8,z:0},n,.1,1);assert.equal(c.blocked(p.x,p.z,.6),false);assert.ok(Math.hypot(p.x,p.z)<2.3);const path=reachableRoute(n,{x:-8,z:0},{x:0,z:0},.6);assert.ok(path.length);assert.equal(c.blocked(path.at(-1).x,path.at(-1).z,.6),false);
});
test('phone number exchange, ringing, hangup and cooldown do not duplicate service requests',()=>{
 const p=new CityPhone(),s={elapsed:1},contact={id:'resident-4',age:32,relationship:5};assert.equal(p.add(contact),true);p.add(contact);assert.equal(p.data.contacts.length,1);assert.equal(p.add({...contact,id:'child-1',age:12}),false);let requests=0;p.onConnect=()=>{requests++;return 'En route';};p.dial('police',{x:10,z:20},s);p.update(1,s);assert.equal(requests,0);p.hangup();p.update(5,s);assert.equal(requests,0);p.dial('police',{x:10,z:20},s);p.update(2,s);p.update(2,s);assert.equal(requests,1);assert.match(p.dial('police',{x:0,z:0},s),/shortly/);assert.deepEqual(p.call.point,{x:10,z:20});
});
test('wardrobe purchases pay once and update the actual character material',()=>{
 const s={money:500,wardrobe:normalizeWardrobe()},m=createPerson();assert.equal(buyOutfit(s,'harbor'),true);assert.equal(s.money,260);assert.equal(buyOutfit(s,'harbor'),true);assert.equal(s.money,260);assert.equal(buyOutfit(s,'ivory'),false);wear(m,s.wardrobe);assert.equal(m.userData.cloth.color.getHexString(),'467582');assert.equal(m.userData.jacket.visible,true);
});
test('snake prevents reversing, grows on food, detects boundaries and resets without rewards',()=>{
 const g=new PocketSnake(()=>0);g.turn(-1,0);g.food={x:6,y:6};g.step();assert.equal(g.score,1);assert.equal(g.body.length,4);assert.equal(g.body[0].x,6);for(let i=0;i<10;i++)g.step();assert.equal(g.over,true);g.reset();assert.equal(g.over,false);assert.equal(g.score,0);
});
test('memory pairs lock mismatches, score moves and finish only with all pairs',()=>{
 const g=new MemoryPairs(()=>.5);const a=0,b=g.cards.findIndex(v=>v!==g.cards[a]);g.flip(a);g.flip(b);assert.equal(g.flip(2),false);g.update(1);assert.equal(g.open.length,0);for(let v=0;v<6;v++){const ids=g.cards.map((n,i)=>n===v?i:-1).filter(i=>i>=0);g.flip(ids[0]);g.flip(ids[1]);}assert.equal(g.won,true);assert.equal(g.moves,7);
});
test('radio follows vehicle selection and sound trucks fade with distance or walls between scenes',()=>{
 const truck={id:'truck',x:0,z:0,model:'truck',health:100},s={x:0,z:1,radio:'coast'};const near=radioSignal(s,[truck]);s.z=40;assert.ok(radioSignal(s,[truck]).gain<near.gain);s.z=46;assert.equal(radioSignal(s,[truck]),null);s.driving={id:'car',spec:{}};assert.equal(radioSignal(s,[]).station,'coast');s.radio='off';assert.equal(radioSignal(s,[truck]),null);s.radio='mist';s.interior='home';assert.equal(radioSignal(s,[truck]),null);
});
test('phone and wardrobe saves migrate safely with bounded scores, identities and truck model',()=>{
 assert.equal(normalizePhone(null).snakeBest,0);assert.deepEqual(normalizeWardrobe(null).owned,['arrival']);const save=readSave({getItem:()=>JSON.stringify({version:2,x:0,z:0,money:500,hour:12,phone:{contacts:['resident-2','bad','resident-99'],snakeBest:1e9},wardrobe:{owned:['harbor'],equipped:'harbor'},radio:'mist',vehicles:[{id:'car-250',x:0,z:0,angle:0,health:100,model:'truck'}]})});assert.deepEqual(save.phone.contacts,['resident-2']);assert.equal(save.phone.snakeBest,144);assert.equal(save.wardrobe.equipped,'harbor');assert.equal(save.vehicles[0].model,'truck');
});
test('service calls send physical units to shared points without adding wanted level',()=>{
 const scene=new THREE.Scene(),collision=new CollisionWorld([]),nav=new RoadNavigator(new Navigator(collision),[{x1:-200,z1:0,x2:100,z2:0}]),v=new Vehicles(scene,collision),e=new EmergencyServices(scene,v,nav,{people:[]},()=>{}),s={x:-165,z:0,elapsed:1,heat:0,health:30};const a=e.ambulances[0];a.car.x=-174;a.car.z=-6;let aid=0;e.onAid=()=>aid++;assert.match(e.requestService('ambulance',s,s),/coming/);for(let i=0;i<500;i++){s.elapsed+=.05;e.updateServiceCall(a,.05,s);}assert.equal(s.heat,0);assert.equal(aid,1);assert.equal(a.assist,null);
});
test('a stalled patrol reverses and changes its route attempt instead of pushing forever',()=>{
 const scene=new THREE.Scene(),c=new CollisionWorld([{x:0,z:3,w:6,d:.5,height:5}]),foot=new Navigator(c),nav={collision:c,foot,project:p=>p,laneRoute:()=>[{x:0,z:12}],route:()=>[{x:0,z:12}]},v=new Vehicles(scene,c),e=new EmergencyServices(scene,v,nav,{people:[]},()=>{}),car=e.patrols[0].car;car.x=0;car.z=0;car.angle=0;let lowest=0;for(let i=0;i<80;i++){e.navigate(car,{x:0,z:12},.1);lowest=Math.min(lowest,car.z);}assert.ok(car.navRecoveries>0);assert.ok(lowest<-.5);assert.ok(Number.isFinite(car.x)&&Number.isFinite(car.z));
});
test('unreachable police destinations are retried on a timer, not every frame',()=>{
 let plans=0;const n={collision:new CollisionWorld([]),route:()=>{plans++;return [];}},p={x:0,z:0};for(let i=0;i<30;i++)stepWalker(p,{x:20,z:0},n,1/30,i/30);assert.equal(plans,6);
});

test('taking a dispatched service vehicle cancels its call and removes the visiting medic',()=>{
 const scene=new THREE.Scene(),collision=new CollisionWorld([]),nav=new RoadNavigator(new Navigator(collision),[{x1:-200,z1:0,x2:100,z2:0}]),v=new Vehicles(scene,collision),e=new EmergencyServices(scene,v,nav,{people:[]},()=>{}),s={x:-174,z:-6,elapsed:1,heat:0};const unit=e.ambulances[0];e.requestService('ambulance',s,s);e.updateServiceCall(unit,.05,s);const medic=unit.assist.medic;assert.ok(medic);assert.equal(unit.car.mesh.userData.driver.visible,false);e.releaseVehicle(unit.car,s);assert.equal(unit.assist,null);assert.equal(medic.parent,null);assert.equal(unit.car.kind,'parked');assert.equal(e.updateServiceCall(unit,.05,s),false);
});
