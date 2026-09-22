import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionWorld, Navigator, segmentDistance, stoppingDistance, impactDamage } from '../src/physics.js';
import { routineAt, RESIDENTS } from '../src/residents.js';
import { unitsForHeat } from '../src/emergency.js';
import { expiredEffect } from '../src/combat.js';
test('fast motion cannot tunnel through tree trunks, hills, or thin walls',()=>{
 for(const shape of [{x:0,z:0,r:.3,height:7,kind:'tree'},{x:0,z:0,r:8,height:20,kind:'hill'},{x:0,z:0,w:.1,d:20,height:4}]){
  const world=new CollisionWorld([shape]);const actor={x:-15,z:0};assert.equal(world.move(actor,30,0,.6,false),true);assert.ok(actor.x<0);
 }
});
test('circular scenery does not incorrectly block distant AABB corners',()=>{
 const world=new CollisionWorld([{x:0,z:0,r:3,height:9}]);assert.equal(world.blocked(3,3,.5),false);assert.equal(world.blocked(3.2,0,.5),true);
});
test('navigation routes around buildings and respects complete segments',()=>{
 const collision=new CollisionWorld([{x:0,z:0,w:9,d:12,height:8}],{minX:-30,maxX:30,minZ:-30,maxZ:30});
 const nav=new Navigator(collision,2),start={x:-12,z:0},end={x:12,z:0},path=nav.route(start,end,.6);assert.ok(path.length>1);let prev=start;for(const point of path){assert.ok(collision.lineClear(prev,point,.6,0));prev=point;}
});
test('a wall stops shots but a low curb does not',()=>{
 const collision=new CollisionWorld([{x:0,z:0,w:1,d:8,height:4},{x:5,z:0,w:1,d:8,height:.2}]);assert.equal(collision.lineClear({x:-3,z:0},{x:3,z:0},.05,1.4),false);assert.equal(collision.lineClear({x:3,z:0},{x:8,z:0},.05,1.4),true);
});
test('traffic braking is not instantaneous and swept hits detect a crossing',()=>{
 assert.ok(stoppingDistance(18)>25);assert.ok(stoppingDistance(18,.55,5.5)>stoppingDistance(18));assert.equal(segmentDistance({x:0,z:0},{x:-8,z:0},{x:8,z:0}),0);assert.ok(impactDamage(18)>=80);assert.equal(impactDamage(1),0);
});
test('blood expires at 60 seconds, including the exact boundary',()=>{assert.equal(expiredEffect(10,69.999),false);assert.equal(expiredEffect(10,70),true);});
test('police escalate to multiple responding units',()=>{assert.equal(unitsForHeat(0),0);assert.equal(unitsForHeat(1),2);assert.equal(unitsForHeat(3),4);assert.equal(unitsForHeat(5),4);});
test('all residents have unique identities, biographies and dialogue, with day and night shifts',()=>{
 for(const field of ['id','name','story','dialogue'])assert.equal(new Set(RESIDENTS.map(p=>p[field])).size,RESIDENTS.length);
 assert.ok(RESIDENTS.every(p=>p.age>=18));const day=RESIDENTS.find(p=>!p.nightShift),night=RESIDENTS.find(p=>p.nightShift);assert.equal(routineAt(day,13),'work');assert.equal(routineAt(day,23),'sleep');assert.equal(routineAt(night,23),'work');
});
test('service vehicles follow road intersections instead of cutting across sidewalks',async()=>{
 const {RoadNavigator}=await import('../src/physics.js');
 const collision=new CollisionWorld([],{minX:-10,maxX:60,minZ:-10,maxZ:60});
 const roads=[{x1:0,z1:0,x2:0,z2:48},{x1:0,z1:48,x2:48,z2:48},{x1:48,z1:48,x2:48,z2:0}];
 const nav=new RoadNavigator(new Navigator(collision),roads),route=nav.route({x:0,z:4},{x:45,z:6});
 assert.ok(route.some(p=>p.z===48));assert.equal(route.at(-1).x,48);
 let previous={x:0,z:4};for(const point of route){assert.ok(previous.x===point.x||previous.z===point.z);previous=point;}
});
test('service markers are off the travel lanes rather than in road intersections',async()=>{
 const {LOCATIONS}=await import('../src/systems.js');
 for(const id of ['temple','clinic','weapons','home','bank','village','harbor','farm']){
  const p=LOCATIONS.find(l=>l.id===id);
  const xDistance=Math.min(...Array.from({length:9},(_,i)=>Math.abs(p.x-(-288+i*48))));
  const zDistance=Math.min(...Array.from({length:12},(_,i)=>Math.abs(p.z-(-288+i*48))));
  assert.ok(xDistance>7&&zDistance>7,`${id} should be outside the road corridor`);
 }
});
