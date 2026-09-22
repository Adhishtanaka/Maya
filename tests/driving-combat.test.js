import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { resolveImpact, velocity } from '../src/vehicle-dynamics.js';
import { VEHICLE_SPECS } from '../src/actor-models.js';
import { Vehicles } from '../src/vehicles.js';
import { CollisionWorld } from '../src/physics.js';
import { readSave } from '../src/systems.js';
test('head-on impacts transfer momentum, lose energy and deflect off-center contacts',()=>{
 const a={x:0,z:0,angle:0,speed:24,spec:VEHICLE_SPECS.van},b={x:1.5,z:4,angle:Math.PI,speed:12,spec:VEHICLE_SPECS.hatch};
 const momentum=c=>{const v=velocity(c);return {x:v.x*c.spec.mass,z:v.z*c.spec.mass,energy:(v.x*v.x+v.z*v.z)*c.spec.mass/2};};
 const av=momentum(a),bv=momentum(b);assert.ok(resolveImpact(a,b)>30);const aa=momentum(a),bb=momentum(b);
 assert.ok(Math.abs(av.x+bv.x-aa.x-bb.x)<1e-7);assert.ok(Math.abs(av.z+bv.z-aa.z-bb.z)<1e-7);assert.ok(aa.energy+bb.energy<av.energy+bv.energy);assert.ok(Math.abs(a.impulseX)>1);assert.ok(Math.abs(b.spin)>0);assert.ok(velocity(b).z>0);
});
test('separating cars receive no extra impulse or repeated collision damage',()=>{
 const a={x:0,z:0,angle:0,speed:-8},b={x:0,z:4,angle:0,speed:10};assert.equal(resolveImpact(a,b),0);assert.equal(a.speed,-8);assert.equal(b.speed,10);
});
test('critical vehicle damage warns before one explosion; repairs extinguish the fuse',()=>{
 const vehicles=new Vehicles(new THREE.Scene(),new CollisionWorld([])),car=vehicles.add(0,0);let blasts=0;vehicles.onExplosion=()=>blasts++;const state={elapsed:0};car.health=10;
 for(let i=0;i<4;i++){state.elapsed++;vehicles.updateFire(car,1,state);}assert.equal(blasts,0);assert.equal(car.fire.visible,true);
 vehicles.repair(car);assert.equal(car.fire,null);assert.equal(car.burnTime,0);vehicles.updateFire(car,10,state);assert.equal(blasts,0);
 car.health=4;vehicles.updateFire(car,5,state);assert.equal(blasts,1);assert.equal(car.health,0);vehicles.updateFire(car,20,state);assert.equal(blasts,1);assert.equal(car.fire.visible,false);
});
test('purchased vehicle model and paint survive validated saves without accepting arbitrary values',()=>{
 const saved={version:2,x:0,z:33,money:200,hour:12,vehicles:[{id:'car-1001',x:103,z:55,angle:0,health:80,model:'sport',color:'#aabbcc'},{id:'car-1002',x:103,z:63,angle:0,health:80,model:'invalid',color:'url(evil)'}]};
 const read=readSave({getItem:()=>JSON.stringify(saved)});assert.equal(read.vehicles[0].model,'sport');assert.equal(read.vehicles[0].color,'#aabbcc');assert.equal(read.vehicles[1].model,'classic');assert.equal(read.vehicles[1].color,'#ddbd7f');
});
test('a recent vehicle collision never makes pedestrians immune to a subsequent impact',()=>{
 const vehicles=new Vehicles(new THREE.Scene(),new CollisionWorld([])),car=vehicles.add(0,0,'#ffffff',0,'traffic',{path:[{x:0,z:40}]});car.speed=18;car.hitCooldown=1.5;
 const state={x:0,z:3,previous:{x:0,z:3},hour:12,elapsed:0,weather:'clear',driving:null};let hits=0;
 vehicles.update(.1,state,[],()=>{},()=>hits++,()=>{});assert.equal(hits,1);
 car.x=car.z=0;car.prev={x:0,z:0};car.speed=18;vehicles.update(.1,state,[],()=>{},()=>hits++,()=>{});assert.equal(hits,1,'the same pedestrian still has an impact cooldown');
});
test('a driver parks at a fixed clear kerb and resumes life on foot',async()=>{
 const {Occupants}=await import('../src/occupants.js'),{createPerson}=await import('../src/actor-models.js');
 const scene=new THREE.Scene(),collision=new CollisionWorld([]),vehicles=new Vehicles(scene,collision),car=vehicles.add(3,0,'#ffffff',0,'traffic',{path:[{x:3,z:100}]}),resident={id:'resident-6',skin:'#bf9478',casual:'#905d7a',mesh:createPerson(),dead:false};scene.add(resident.mesh);
 const population={people:[resident],world:{roadSegments:[{x1:0,z1:-100,x2:0,z2:100,width:13}]},frighten(){}};const occupants=new Occupants(vehicles,population,collision,scene),state={elapsed:0};car.tripRemaining=0;
 for(let t=0;t<5;t+=1/30){state.elapsed=t;occupants.update(1/30,state);}assert.equal(car.kind,'parked');assert.equal(car.driver,null);assert.equal(resident.vehicle,null);assert.ok(car.x>7.9);assert.ok(resident.routePending);
});
