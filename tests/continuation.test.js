import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CollisionWorld, distance } from '../src/physics.js';
import { PlayerTactics, findCover, aimedShotHits, visibilityRange } from '../src/tactics.js';
import { Vehicles } from '../src/vehicles.js';
import { normalizeActivities, startRace, tickRace, raceTarget, completeContract, territoryOwner } from '../src/city-activities.js';
import { writeSlot, listSlots, restoreSlot } from '../src/saves.js';
import { readSave, SAVE_KEY } from '../src/systems.js';

test('cover stays on the accessible side and dodge cannot cross a wall',()=>{
 const collision=new CollisionWorld([{x:0,z:0,w:1,d:20,height:2}]),state={x:-2,z:0,driving:null,knocked:0};const tactics=new PlayerTactics(state);
 assert.ok(findCover(state,collision).x<0);assert.ok(tactics.cover(state,collision));assert.equal(state.crouching,true);
 assert.equal(tactics.dodge(state,{x:1,z:0}),true);for(let i=0;i<15;i++)tactics.moveDodge(1/30,state,collision);
 assert.ok(state.x<=-1.1);assert.equal(state.stamina,70);assert.equal(tactics.dodge(state,{x:1,z:0}),false);
});
test('crouching reduces detection and low cover blocks shots until exposed; moving after aim evades',()=>{
 const collision=new CollisionWorld([{x:0,z:0,w:.5,d:8,height:1.1}]);
 const target={x:3,z:0,crouching:true,exposed:0,hour:23,weather:'rain'},origin={x:-3,z:0};
 assert.ok(visibilityRange(target)<20);assert.equal(aimedShotHits(origin,target,target,collision),false);
 target.exposed=.9;assert.equal(aimedShotHits(origin,target,target,collision),true);
 assert.equal(aimedShotHits(origin,{x:3,z:3},target,collision),false);
});
test('two circuit laps must be driven in order and timeouts do not pay',()=>{
 const race=startRace('circuit');assert.equal(tickRace(race,.1,raceTarget(race),false),null);assert.equal(race.checkpoint,0);
 for(let i=0;i<7;i++)assert.equal(tickRace(race,1,raceTarget(race),true),'checkpoint');
 assert.equal(race.lap,2);assert.equal(tickRace(race,1,raceTarget(race),true),'won');
 assert.equal(tickRace(startRace('highland'),200,{x:0,z:0},true),'failed');
});
test('faction jobs change influence, pay district bonuses, and persist valid progress',()=>{
 const state={activities:normalizeActivities(),money:0,reputation:5,factions:{community:0,harbor:0,police:0,dockside:0}};
 state.activities.contract={id:'relief',step:2};const result=completeContract(state);assert.equal(result.reward,715);assert.equal(state.money,715);assert.equal(state.activities.contract,null);assert.equal(territoryOwner(state.activities,'village'),'community');
 state.activities.contract={id:'watch',step:1};assert.deepEqual(normalizeActivities(state.activities).contract,{id:'watch',step:1});assert.equal(normalizeActivities({contract:{id:'watch',step:99}}).contract,null);
});
test('manual snapshots remain independent of autosave and restore with a recovery backup',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const original={version:2,x:0,z:33,hour:13,money:1500,activities:normalizeActivities()};
 writeSlot(storage,1,original);storage.setItem(SAVE_KEY,JSON.stringify({...original,money:300}));
 assert.equal(listSlots(storage)[0].save.money,1500);assert.equal(restoreSlot(storage,2),false);assert.equal(restoreSlot(storage,1),true);assert.equal(readSave(storage).money,1500);assert.equal(JSON.parse(storage.getItem('maya-before-load')).money,300);
 storage.setItem('maya-manual-3','corrupt');assert.equal(restoreSlot(storage,3),false);
});
test('fast cars cannot ghost through parked cars, even during damage cooldown',()=>{
 const collision=new CollisionWorld([]),vehicles=new Vehicles(new THREE.Scene(),collision),a=vehicles.add(0,0),b=vehicles.add(0,8);
 const state={x:0,z:0,hour:12,driving:a,weather:'clear',speed:0};let impacts=0;
 a.speed=35;a.hitCooldown=2;
 vehicles.drive(a,.3,{up:true,down:false,left:false,right:false,brake:false},'clear',()=>{});vehicles.update(.3,state,[],()=>{},()=>{},()=>impacts++);
 assert.ok(distance(a,b)>=2.5);assert.ok(a.z<b.z);assert.ok(a.speed<30);assert.ok(b.speed>0);assert.equal(impacts,0);
});
test('overlapping vehicle ends separate instead of staying locked together',()=>{
 const vehicles=new Vehicles(new THREE.Scene(),new CollisionWorld([])),a=vehicles.add(0,0),b=vehicles.add(0,3);
 const state={x:100,z:100,hour:12,driving:null,weather:'clear'};
 for(let i=0;i<8;i++)vehicles.update(1/30,state,[],()=>{},()=>{},()=>{});
 assert.ok(distance(a,b)>4.5);
});
test('exhaustion needs recovery before sprinting can resume',()=>{
 const state={};const tactics=new PlayerTactics(state);Object.assign(state,{stamina:1,sprinting:true,walking:true});tactics.update(.1,state);assert.equal(state.exhausted,true);state.sprinting=false;tactics.update(1,state);assert.equal(state.exhausted,true);tactics.update(1,state);assert.equal(state.exhausted,false);
});
test('emergency vehicles use opposite road lanes with collision-clear turns',async()=>{
 const {Navigator,RoadNavigator}=await import('../src/physics.js');
 const collision=new CollisionWorld([]),nav=new RoadNavigator(new Navigator(collision),[{x1:-50,z1:0,x2:50,z2:0},{x1:50,z1:0,x2:50,z2:50}]);
 const east=nav.laneRoute({x:-40,z:0},{x:40,z:0}),west=nav.laneRoute({x:40,z:0},{x:-40,z:0});
 assert.ok(east.at(-1).z<0);assert.ok(west.at(-1).z>0);assert.ok(west.at(-1).z-east.at(-1).z>5);
 const turn=nav.laneRoute({x:-40,z:0},{x:50,z:40});assert.ok(turn.length>=3);let previous={x:-40,z:0};for(const p of turn){assert.ok(collision.lineClear(previous,p,2.5,0));previous=p;}
});
