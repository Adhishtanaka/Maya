import {seedProfile} from './profile-fixture.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {LOCATIONS} from '../src/systems.js';
import {raceTarget} from '../src/city-activities.js';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('maya-preferences',JSON.stringify({quality:'low',sensitivity:1})));
const base=process.env.MAYA_URL||'http://localhost:5173',snap=()=>page.evaluate(()=>window.__MAYA__.snapshot());
const at=id=>page.evaluate(p=>window.__MAYA_TEST__.teleport(p.x,p.z),LOCATIONS.find(l=>l.id===id));
try{
 await seedProfile(page);await page.goto(base+'/?test');await page.waitForFunction(()=>window.__MAYA_TEST__);await page.click('#start-button');await page.evaluate(()=>window.__MAYA__.assetsReady);
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.teleport(0,-300);t.residentAt('resident-3',1.5,-300);});
 await page.keyboard.press('e');await page.click('#ledger-talk');assert.ok((await page.locator('#modal-body').textContent()).includes('second ledger'));await page.click('#ledger-accept');assert.equal((await snap()).activities.encounter.stage,'evidence');
 const door=await page.evaluate(()=>window.__MAYA_TEST__.buildings().find(b=>b.id==='harbor').door);await page.evaluate(p=>window.__MAYA_TEST__.teleport(p.x,p.z),door);await page.keyboard.press('e');assert.equal((await snap()).interior,'harbor');
 await page.evaluate(()=>window.__MAYA_TEST__.positionIndoor(-3,-4));await page.keyboard.press('e');assert.equal((await snap()).activities.encounter.stage,'witness');await page.keyboard.press('p');await page.reload();await page.waitForFunction(()=>window.__MAYA_TEST__);await page.click('#start-button');assert.equal((await snap()).activities.encounter.stage,'witness');
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.teleport(0,-300);t.residentAt('resident-20',1.5,-300);});await page.keyboard.press('e');await page.click('#ledger-talk');assert.ok((await page.locator('#modal-body').textContent()).includes('DEEPA'));await page.click('[data-ledger-choice="crew"]');assert.equal((await snap()).activities.encounter.choice,'crew');
 const before=(await snap()).money;await at('garage');await page.keyboard.press('e');assert.equal((await snap()).activities.encounter.stage,'resolved');assert.equal((await snap()).money,before+1500);assert.ok((await snap()).activities.influence.harbor.dockside>(await snap()).activities.influence.harbor.harbor);await page.click('#ledger-done');await page.keyboard.press('e');assert.equal((await snap()).money,before+1500);await page.click('#close-modal');
 const people=await page.evaluate(()=>window.__MAYA_TEST__.people());assert.equal(people.find(p=>p.id==='resident-3').relationship,-30);assert.equal(people.find(p=>p.id==='resident-20').relationship,-25);
 console.log('PASS named harbor encounter, separate interior evidence, saved progress, testimony, choice, district consequence and single payout');
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.teleport(96,45);t.vehicleAt(96,45);});await page.keyboard.press('f');await page.waitForFunction(()=>!window.__MAYA__.snapshot().transition);await page.keyboard.press('e');await page.click('[data-race="street"]');assert.equal((await snap()).rivals.length,2);assert.ok((await snap()).race.countdown>0);
 const initial=await snap();await page.evaluate(()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'w'}));window.__MAYA_TEST__.advance(.25);window.dispatchEvent(new KeyboardEvent('keyup',{key:'w'}));});assert.ok(Math.hypot((await snap()).x-initial.x,(await snap()).z-initial.z)<.2);
 await page.evaluate(()=>window.__MAYA_TEST__.advance(24));const moving=await snap();assert.ok(moving.rivals.some(r=>r.checkpoint>0||r.lap>1));assert.ok(moving.rivals.every(r=>r.health>0));await page.screenshot({path:'/tmp/maya-rivals.png'});
 const raceMoney=moving.money;
 for(let i=0;i<8;i++){const target=raceTarget((await snap()).race);await page.evaluate(p=>{window.__MAYA_TEST__.vehicleAt(p.x,p.z);window.__MAYA_TEST__.advance(.04);},target);}
 assert.equal((await snap()).race,null);assert.equal((await snap()).money,raceMoney+2500);assert.ok((await snap()).activities.raceBest.street>0);
 await page.keyboard.press('p');const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('maya-city-v1')));assert.equal(stored.activities.encounter.stage,'resolved');assert.equal(stored.residents['resident-3'].relationship,-30);assert.ok(stored.activities.raceBest.street>0);
 console.log('PASS opponent race countdown, AI route progression, finishing placement, purse and persistent personal best');
 assert.deepEqual(errors,[]);console.log('PASS no rival or encounter browser errors');
}finally{await browser.close();}
