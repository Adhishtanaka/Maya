import {seedProfile} from './profile-fixture.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {LOCATIONS} from '../src/systems.js';
import {raceTarget} from '../src/city-activities.js';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base=process.env.MAYA_URL||'http://localhost:5173',snap=()=>page.evaluate(()=>window.__MAYA__.snapshot());
const at=id=>page.evaluate(p=>window.__MAYA_TEST__.teleport(p.x,p.z),LOCATIONS.find(l=>l.id===id));
try{
 await seedProfile(page);await page.goto(base+'/?test');await page.waitForFunction(()=>window.__MAYA_TEST__);await page.click('#start-button');await page.evaluate(()=>window.__MAYA__.assetsReady);
 await page.evaluate(()=>window.__MAYA_TEST__.teleport(0,-300));await page.keyboard.press('c');assert.equal((await snap()).crouching,true);await page.keyboard.press('c');
 const dodge=await page.evaluate(()=>{const t=window.__MAYA_TEST__,before=t.snapshot();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Alt'}));t.advance(.2);window.dispatchEvent(new KeyboardEvent('keyup',{key:'Alt'}));return {before,after:t.snapshot()};});
 assert.ok(dodge.after.dodge>0);assert.ok(dodge.after.stamina<80);assert.ok(Math.hypot(dodge.after.x-dodge.before.x,dodge.after.z-dodge.before.z)>1);
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.advance(.5);t.enter('harbor');t.positionIndoor(4.4,2);});await page.keyboard.press('b');assert.ok((await snap()).cover);assert.equal((await snap()).crouching,true);await page.keyboard.press('b');assert.equal((await snap()).cover,null);
 console.log('PASS crouch, physical dodge with stamina, indoor cover and release');
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.teleport(-87,-18);t.heat(3);t.advance(.5);});assert.ok((await page.evaluate(()=>window.__MAYA_TEST__.patrols())).some(p=>p.onFoot));
 await page.evaluate(()=>{window.__MAYA_TEST__.heat(4);window.__MAYA_TEST__.advance(.1);});assert.equal((await snap()).roadblocks,2);await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.heat(0);t.teleport(0,-300);});
 console.log('PASS officers deploy on foot and severe wanted levels dispatch roadblocks');
 await page.keyboard.press('Tab');await page.click('#activity-board');await page.click('[data-contract="relief"]');assert.equal((await snap()).activities.contract.id,'relief');const money=(await snap()).money;
 for(const id of ['farm','village','clinic']){await at(id);await page.keyboard.press('e');}
 assert.equal((await snap()).activities.contract,null);assert.equal((await snap()).activities.completed,1);assert.equal((await snap()).money,money+715);assert.equal((await snap()).activities.influence.village.community,68);
 console.log('PASS faction job stages, district bonus, influence change and persistence');
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.teleport(96,45);t.vehicleAt(96,45);});await page.keyboard.press('f');await page.waitForFunction(()=>!window.__MAYA__.snapshot().transition);assert.equal((await snap()).driving,true);await page.keyboard.press('e');await page.click('[data-race="circuit"]');assert.equal((await snap()).race.course,'circuit');
 // Drive the ordered checkpoints through the real simulation; only positioning is controlled.
 for(let i=0;i<8;i++){
  const target=raceTarget((await snap()).race);
  await page.evaluate(p=>{window.__MAYA_TEST__.vehicleAt(p.x,p.z);window.__MAYA_TEST__.advance(.04);},target);
 }
 assert.equal((await snap()).race,null);assert.ok((await snap()).activities.raceBest.circuit>0);
 console.log('PASS selectable two-lap race, ordered checkpoints, reward and personal best');
 await page.evaluate(()=>window.__MAYA_TEST__.teleport(0,-300));await page.click('#settings-button');await page.selectOption('#quality-select','low');await page.click('#slots-button');await page.click('[data-save-slot="1"]');const before=(await snap()).money;
 await page.click('#slots-back');await page.click('#resume-button');await page.keyboard.press('p');await at('clinic');await page.keyboard.press('e');assert.equal((await snap()).money,before-100);
 await page.click('#settings-button');await page.click('#slots-button');await page.click('[data-load-slot="1"]');await page.waitForFunction(()=>window.__MAYA_TEST__?.snapshot().started===false);await page.click('#start-button');
 assert.equal((await snap()).money,before);assert.equal((await snap()).graphics,'low');assert.equal((await snap()).activities.completed,1);assert.ok(await page.evaluate(()=>localStorage.getItem('maya-before-load')));
 await page.keyboard.press('m');await page.screenshot({path:'/tmp/maya-faction-map.png'});await page.click('#map-close');
 console.log('PASS manual snapshot save/load, autosave backup, graphics preference and faction state restore');
 assert.deepEqual(errors,[]);console.log('PASS no continuation browser errors');
}finally{await browser.close();}
