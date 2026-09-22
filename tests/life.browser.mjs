import {seedProfile} from './profile-fixture.mjs';
import {LOCATIONS} from '../src/systems.js';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const errors=[];const page=await browser.newPage({viewport:{width:1280,height:850}});page.on('pageerror',e=>errors.push(e.message));const url=(process.env.MAYA_URL||'http://localhost:5173')+'/?test';
const snap=()=>page.evaluate(()=>window.__MAYA__.snapshot());
const teleport=(x,z)=>page.evaluate(([x,z])=>window.__MAYA_TEST__.teleport(x,z),[x,z]);
const at=id=>{const p=LOCATIONS.find(p=>p.id===id);return teleport(p.x,p.z);};
try{
 await seedProfile(page);await page.goto(url);await page.waitForFunction(()=>window.__MAYA_TEST__);await page.click('#start-button');
 await page.keyboard.press('f');await page.waitForFunction(()=>!window.__MAYA__.snapshot().transition);assert.equal((await snap()).driving,true);await page.keyboard.press('p');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('maya-city-v1')));assert.ok(saved.drivingCar);assert.ok(saved.vehicles.length>=6);await page.reload();await page.waitForFunction(()=>window.__MAYA__?.ready);await page.click('#start-button');assert.equal((await snap()).driving,true);await page.keyboard.press('f');await page.waitForFunction(()=>!window.__MAYA__.snapshot().transition);assert.equal((await snap()).driving,false);
 console.log('PASS owned vehicles persist and driving resumes safely without trapping the player');
 await page.click('#settings-button');await page.selectOption('#time-select','13');await page.click('#resume-button');await page.evaluate(()=>window.__MAYA_TEST__.advance(.2));const daytime=await page.evaluate(()=>window.__MAYA_TEST__.people());assert.equal(daytime.find(p=>p.id==='resident-0').outfit,'work');
 await page.click('#settings-button');await page.selectOption('#time-select','23');await page.click('#resume-button');await page.evaluate(()=>window.__MAYA_TEST__.advance(.2));const nighttime=await page.evaluate(()=>window.__MAYA_TEST__.people());assert.equal(nighttime.find(p=>p.id==='resident-0').outfit,'casual');assert.equal(nighttime.find(p=>p.id==='resident-2').outfit,'work');
 console.log('PASS morning/day/night routines change individual outfits, including night workers');
 await teleport(0,-300);await page.evaluate(()=>window.__MAYA_TEST__.residentAt('resident-1',1.5,-300));await page.keyboard.press('e');assert.ok((await page.locator('#modal-body').textContent()).includes('Arun Fernando'));await page.click('#ask-favor');await page.click('#accept-favor');await at('garage');const beforeFavor=(await snap()).money;await page.keyboard.press('e');assert.equal((await snap()).money,beforeFavor+350);assert.equal((await snap()).errand,null);
 console.log('PASS unique resident dialogue, personal favor, relationship and payment');

 await at('weapons');await page.keyboard.press('e');await page.click('#buy-kit');await page.click('#shop-close');assert.equal((await snap()).heist.kit,true);
 await at('bank');await page.keyboard.press('e');await page.click('#plan-heist');assert.equal((await snap()).heist.stage,'planned');
 const bank=await page.evaluate(()=>window.__MAYA_TEST__.buildings().find(b=>b.id==='bank'));await teleport(bank.door.x,bank.door.z);await page.keyboard.press('e');assert.equal((await snap()).interior,'bank');await page.evaluate(()=>window.__MAYA_TEST__.positionIndoor(-7,3));await page.keyboard.press('e');assert.equal((await snap()).heist.stage,'cased');
 await page.evaluate(()=>window.__MAYA_TEST__.vehicleAt(0,-15));await page.evaluate(()=>window.__MAYA_TEST__.positionIndoor(0,-6));await page.keyboard.press('e');assert.equal((await snap()).heist.stage,'opening');assert.ok((await snap()).heat>=3);
 await page.evaluate(()=>window.__MAYA_TEST__.advance(10.1));assert.equal((await snap()).heist.stage,'escape');
 await teleport(0,-300);await page.evaluate(()=>window.__MAYA_TEST__.advance(30));assert.equal((await snap()).heat,0);
 const money=(await snap()).money;await at('harbor');await page.keyboard.press('e');assert.equal((await snap()).heist.stage,'complete');assert.equal((await snap()).money,money+4000);
 console.log('PASS bank job: toolkit, casing, escape vehicle, timed vault, alarm, evasion, and payment');
 await at('tea');await page.keyboard.press('e');await page.click('#tea-invest');await page.click('#buy-property');assert.ok((await snap()).properties.includes('tea-business'));
 await page.keyboard.press('p');const store=await page.evaluate(()=>JSON.parse(localStorage.getItem('maya-city-v1')));assert.ok(store.properties.includes('tea-business'));assert.equal(store.heist.stage,'complete');
 const beforeIncome=(await snap()).money;await page.evaluate(()=>window.__MAYA_TEST__.advance(125));assert.ok((await snap()).money>=beforeIncome+120);
 console.log('PASS property investment, passive income and heist/property persistence');
 assert.deepEqual(errors,[]);console.log('PASS no life-system browser errors');
}finally{await browser.close();}
