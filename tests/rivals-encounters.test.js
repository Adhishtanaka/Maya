import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CollisionWorld, Navigator, RoadNavigator } from '../src/physics.js';
import { Vehicles } from '../src/vehicles.js';
import { RivalRacing } from '../src/racing.js';
import { startRace, tickRace, normalizeActivities } from '../src/city-activities.js';
import { resolveLedger, updateLedgerWitness } from '../src/encounters.js';
test('rivals wait for the countdown, drive both laps and affect finishing place',()=>{
 const collision=new CollisionWorld([]),vehicles=new Vehicles(new THREE.Scene(),collision),nav=new RoadNavigator(new Navigator(collision),[{x1:96,z1:0,x2:96,z2:144},{x1:-48,z1:96,x2:96,z2:96},{x1:-48,z1:48,x2:-48,z2:96},{x1:-48,z1:48,x2:96,z2:48}]);
 const rivals=new RivalRacing(vehicles,nav),state={race:startRace('street'),x:96,z:45,hour:13,weather:'clear',driving:null};rivals.start('street');
 const before=rivals.snapshot();rivals.update(1,state);assert.deepEqual(rivals.snapshot(),before);
 for(let t=0;t<150;t+=1/30){vehicles.update(1/30,state,[],()=>{},()=>{},()=>{});rivals.update(1/30,state);tickRace(state.race,1/30,state,false);}
 assert.ok(rivals.snapshot().every(r=>r.finished));assert.equal(rivals.finish(state),3);
 assert.ok(vehicles.cars.every(c=>c.health>0));
});
test('a vehicle disabled in a crash stays stopped instead of returning to traffic',()=>{
 const vehicles=new Vehicles(new THREE.Scene(),new CollisionWorld([])),car=vehicles.add(0,0,'#ffffff',0,'traffic',{path:[{x:0,z:40}]});car.health=0;car.speed=20;
 vehicles.update(1,{x:100,z:100,hour:12,weather:'clear'},[],()=>{},()=>{},()=>{});assert.equal(car.z,0);assert.equal(car.speed,0);assert.equal(car.kind,'parked');
});
test('ledger outcomes change named relationships and cannot pay twice',()=>{
 for(const choice of ['union','police','crew']){
  const state={activities:normalizeActivities({encounter:{stage:'deliver',choice,tracking:true}}),factions:{community:0,harbor:0,police:0,dockside:0},money:0,reputation:10,heat:0},people=[{id:'resident-3',relationship:0},{id:'resident-20',relationship:0}];
  assert.equal(resolveLedger(state,people,'temple'),null);
  const location={union:'harbor',police:'station',crew:'garage'}[choice],outcome=resolveLedger(state,people,location);assert.ok(outcome);assert.equal(state.money,outcome.reward);assert.equal(state.activities.encounter.stage,'resolved');assert.equal(resolveLedger(state,people,location),null);
  assert.equal(people[0].relationship,outcome.ravi);assert.equal(people[1].relationship,outcome.deepa);
  if(choice==='crew')assert.ok(state.activities.influence.harbor.dockside>state.activities.influence.harbor.harbor);
 }
});
test('losing the witness changes the objective and preserves the evidence in saves',()=>{
 const state={activities:normalizeActivities({encounter:{stage:'witness',tracking:true}})};
 assert.equal(updateLedgerWitness(state,[{id:'resident-20',dead:false}]),false);assert.equal(updateLedgerWitness(state,[{id:'resident-20',dead:true}]),true);
 assert.equal(state.activities.encounter.choice,'police');assert.equal(normalizeActivities(state.activities).encounter.missingWitness,true);
});
