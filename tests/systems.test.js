import test from 'node:test';
import assert from 'node:assert/strict';
import {phase,clockLabel,weatherAt,readSave,collides,district} from '../src/systems.js';
test('the day cycles through morning, afternoon, evening, and dark night',()=>{
 assert.equal(phase(7),'Morning');assert.equal(phase(13),'Afternoon');assert.equal(phase(18),'Evening');assert.equal(phase(23),'Night');assert.equal(phase(3),'Night');assert.equal(clockLabel(24),'00:00');assert.equal(clockLabel(17.5),'17:30');
});
test('natural snow is rare and restricted to the highlands, including forced preview',()=>{
 assert.equal(weatherAt('auto',-130,.1),'snow');assert.equal(weatherAt('auto',-130,.2),'rain');assert.equal(weatherAt('auto',0,.1),'rain');assert.equal(weatherAt('snow',0),'cloudy');assert.equal(weatherAt('snow',-130),'snow');assert.equal(weatherAt('auto',-130,.5),'clear');assert.equal(district(0,-130),'Mistwood Highlands');
});
test('collision includes player radius and permits open roads',()=>{
 const solids=[{x:24,z:24,w:20,d:20}];assert.equal(collides(13.5,24,1,solids),true);assert.equal(collides(0,24,1,solids),false);
});
test('corrupt and incompatible saves fail safely; valid saves are bounded',()=>{
 assert.equal(readSave({getItem:()=>'{broken'}),null);assert.equal(readSave({getItem:()=>JSON.stringify({version:9})}),null);
 assert.equal(readSave({getItem:()=>{throw new Error('Storage denied')}}),null);
 const save=readSave({getItem:()=>JSON.stringify({version:1,x:9999,z:-9999,money:-3,hour:25,mission:'injected'})});assert.equal(save.x,108);assert.equal(save.z,-324);assert.equal(save.money,0);assert.equal(save.hour,1);assert.equal(save.mission,'available');
});
test('all service and objective markers have distinct coordinates',async()=>{
 const {LOCATIONS}=await import('../src/systems.js');assert.equal(new Set(LOCATIONS.map(p=>`${p.x},${p.z}`)).size,LOCATIONS.length);
});
