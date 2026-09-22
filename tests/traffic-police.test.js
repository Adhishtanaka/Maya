import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CollisionWorld,Navigator,RoadNavigator,distance} from '../src/physics.js';
import {Vehicles,vehicleBlocked,vehicleGap} from '../src/vehicles.js';
import {EmergencyServices} from '../src/emergency.js';
const state=()=>({x:200,z:200,elapsed:0,hour:12,weather:'clear',heat:0,altitude:0,dodge:0,factions:{police:0}});
function setup(solids=[]){const scene=new THREE.Scene(),collision=new CollisionWorld(solids),vehicles=new Vehicles(scene,collision);return {scene,collision,vehicles};}
function services(){const r=setup(),nav=new RoadNavigator(new Navigator(r.collision),[{x1:0,z1:-200,x2:0,z2:200}]);return {...r,emergency:new EmergencyServices(r.scene,r.vehicles,nav,{people:[]},()=>{})};}
test('traffic starts with distinct, separated spawns on directional lanes',()=>{
 const {vehicles}=setup();vehicles.populate();const cars=vehicles.cars.filter(c=>c.kind==='traffic');assert.equal(cars.length,24);
 for(const [i,a] of cars.entries())for(const b of cars.slice(i+1))assert.ok(distance(a,b)>6,`${a.id} overlaps ${b.id}`);
 const north=cars.filter(c=>Math.cos(c.angle)<-.9),south=cars.filter(c=>Math.cos(c.angle)>.9);
 for(const a of north)for(const b of south)assert.ok(Math.abs(a.x-b.x)>5,'opposite traffic needs separate lanes');
});
test('traffic brakes behind the full length of a stationary bus without a collision',()=>{
 const {vehicles}=setup(),s=state(),car=vehicles.add(0,0,'#fff',0,'traffic',{model:'classic',path:[{x:0,z:100}],cruise:14}),bus=vehicles.add(0,25,'#fff',0,'parked',{model:'bus'});car.speed=14;let hits=0;
 for(let i=0;i<300;i++){s.elapsed+=.05;vehicles.update(.05,s,[],()=>{},()=>{},()=>hits++);}
 assert.equal(hits,0);assert.equal(bus.health,100);assert.ok(vehicleGap(car,bus)>=.5);assert.ok(car.speed<.1);
});
test('traffic completes corners without circling indefinitely or losing its route',()=>{
 const {vehicles}=setup(),s=state(),car=vehicles.add(0,0,'#fff',0,'traffic',{path:[{x:0,z:30},{x:30,z:30},{x:30,z:0},{x:0,z:0}],cruise:10});const visited=new Set();
 for(let i=0;i<1600;i++){s.elapsed+=.05;vehicles.update(.05,s,[],()=>{},()=>{},()=>{});visited.add(car.waypoint);assert.ok(car.x>-3&&car.x<33&&car.z>-3&&car.z<33);}
 assert.equal(visited.size,4);
});
test('patrol turns are bounded, wait for traffic, then recover from a persistent blockage',()=>{
 const {vehicles,emergency,collision}=services(),car=emergency.patrols[0].car;Object.assign(car,{x:0,z:0,angle:Math.PI/2,speed:0,path:[],repath:0});
 emergency.navigate(car,{x:0,z:70},.05);assert.ok(Math.abs(car.angle-Math.PI/2)<=.125001);assert.equal(vehicleBlocked(collision,car.x,car.z,car.angle,car.spec),false);
 const bus=vehicles.add(2.8,22,'#fff',0,'parked',{model:'bus'});Object.assign(car,{x:2.8,z:0,angle:0,speed:10,path:[],repath:0});
 for(let i=0;i<80;i++)emergency.navigate(car,{x:0,z:70},.05);
 assert.ok(vehicleGap(car,bus)>=.5);assert.ok(car.speed<.1);assert.equal(car.recoverTime||0,0);
 for(let i=0;i<180;i++)emergency.navigate(car,{x:0,z:70},.05);assert.ok(car.navRecoveries>0);
 for(let i=0;i<600&&car.z<bus.z+10;i++)emergency.navigate(car,{x:0,z:70},.05);
 assert.ok(car.z>bus.z+10,'patrol must pass the stationary blockage');
});
test('officers walk back to their patrol before reappearing in the driver seat',()=>{
 const {emergency}=services(),s=state(),u=emergency.patrols[0];Object.assign(u.car,{x:0,z:0,speed:0});u.officer.position.set(14,.3,0);u.onFoot=true;u.officer.visible=true;
 emergency.update(.05,s,()=>{},()=>{});assert.equal(u.onFoot,true);assert.equal(u.officer.visible,true);assert.equal(u.car.mesh.userData.driver.visible,false);assert.ok(u.officer.position.x>13);
 for(let i=0;i<150&&u.onFoot;i++){s.elapsed+=.05;emergency.update(.05,s,()=>{},()=>{});}
 assert.equal(u.onFoot,false);assert.equal(u.officer.visible,false);assert.equal(u.car.mesh.userData.driver.visible,true);
});
