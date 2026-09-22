import {seedProfile} from './profile-fixture.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('maya-preferences',JSON.stringify({quality:'low',sensitivity:1})));
const snap=()=>page.evaluate(()=>window.__MAYA__.snapshot()),advance=s=>page.evaluate(s=>window.__MAYA_TEST__.advance(s),s);
try{
 await seedProfile(page);await page.goto((process.env.MAYA_URL||'http://localhost:5173')+'/?test');await page.waitForFunction(()=>window.__MAYA_TEST__);await page.click('#start-button');
 const setup=await page.evaluate(()=>{const t=window.__MAYA_TEST__,c=t.cars().find(c=>c.driver);t.teleport(3.6,-300);t.setCar(c.id,{x:0,z:-300,angle:0,speed:0,cruise:0,path:[{x:0,z:-290}],waypoint:0});return {id:c.id,driver:c.driver};});
 const entry=await page.evaluate(id=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'}));window.dispatchEvent(new KeyboardEvent('keyup',{key:'f'}));const start=window.__MAYA__.snapshot();window.__MAYA_TEST__.advance(.4);return {start,after:window.__MAYA__.snapshot(),car:window.__MAYA_TEST__.cars().find(c=>c.id===id),doors:window.__MAYA_TEST__.cars().find(c=>c.id===id).doors};},setup.id);
 assert.equal(entry.start.transition.stolen,true);assert.equal(entry.start.driving,false);assert.ok(entry.doors.some(angle=>Math.abs(angle)>.2),JSON.stringify({transition:entry.after.transition,knocked:entry.after.knocked,health:entry.after.health,car:entry.car}));
 await advance(1.6);assert.equal((await snap()).driving,true);const former=await page.evaluate(id=>window.__MAYA_TEST__.people().find(p=>p.id===id),setup.driver);assert.equal(former.vehicle,undefined);assert.equal(former.dead,false);
 console.log('PASS named driver exits during visible theft and player enters after animation');
 await page.keyboard.press('v');await page.mouse.move(500,400);const angle=(await snap()).cameraAngle;await page.mouse.move(700,450);await page.waitForFunction(a=>Math.abs(window.__MAYA__.snapshot().cameraAngle-a)>.1,angle);await page.screenshot({path:'/tmp/maya-driving-09.png'});
 assert.equal(await page.locator('.equipment').isVisible(),false);assert.equal(await page.locator('#mission-copy').isVisible(),false);
 console.log('PASS mouse freely rotates chase view; driving HUD hides weapon details');
 await page.evaluate(()=>window.__MAYA_TEST__.policeCrash());await advance(3);const officers=await page.evaluate(()=>window.__MAYA_TEST__.patrols());assert.ok(officers.some(u=>u.onFoot&&u.armed&&u.forcedExit));assert.ok((await snap()).health<100);
 console.log('PASS police leave their vehicle and fire at an occupied player vehicle after a crash');
 await page.evaluate(id=>{const t=window.__MAYA_TEST__;t.teleport(7,-270);t.heat(0);t.setCar(id,{x:0,z:-270,speed:0,impulseX:0,impulseZ:0,health:4,burnTime:0,exploded:false});},setup.id);await advance(1);assert.equal(await page.evaluate(id=>window.__MAYA_TEST__.cars().find(c=>c.id===id).exploded,setup.id),false);await advance(5);
 assert.equal(await page.evaluate(id=>window.__MAYA_TEST__.cars().find(c=>c.id===id).exploded,setup.id),true);
 console.log('PASS damaged vehicle burns and explodes after its warning period');
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.teleport(0,-300);t.heat(0);t.residentAt('resident-40',0,-298);t.injure('resident-40',100);t.advance(.2);});
 assert.ok((await snap()).drops.some(d=>d.weapon==='pistol'));await page.keyboard.press('e');assert.equal((await snap()).inventory.pistol,true);assert.ok((await snap()).inventory.pistolAmmo>0);
 console.log('PASS fallen armed gang member drops a usable firearm');
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.teleport(61,54);t.wallet(20000);});await page.keyboard.press('e');await page.click('[data-car="sport"]');assert.equal((await snap()).money,13800);
 const purchased=await page.evaluate(()=>window.__MAYA_TEST__.cars().find(c=>Number(c.id.slice(4))>=1000&&c.model==='sport'));assert.ok(purchased);await page.reload();await page.waitForFunction(()=>window.__MAYA_TEST__);await page.click('#start-button');assert.equal((await snap()).drops.filter(d=>d.source==='resident-40').length,0,'this dead resident must not regenerate loot after a reload');assert.equal(await page.evaluate(id=>window.__MAYA_TEST__.cars().find(c=>c.id===id)?.model,purchased.id),'sport');
 await page.evaluate(()=>window.__MAYA_TEST__.teleport(-10,24));await page.keyboard.press('e');await page.click('#food-shop');const cash=(await snap()).money;await page.click('[data-food="rice"]');assert.equal((await snap()).money,cash-90);
 console.log('PASS ten-model dealership, persistent purchased cars and food transactions');
 await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.teleport(0,-300);t.heat(0);t.residentAt('resident-6',-1.3,-295);t.residentAt('resident-7',1.3,-295);t.view('shoulder',Math.PI,.08);});await page.waitForTimeout(250);await page.screenshot({path:'/tmp/maya-characters-09.png'});
 for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){await page.evaluate(a=>window.__MAYA_TEST__.view('shoulder',a,.08),angle);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok((await snap()).cameraUpY>.5,'camera must stay upright at every compass heading');}
 console.log('PASS shoulder camera stays upright in all four directions');
 assert.deepEqual(errors,[]);console.log('PASS no runtime errors in driving and combat extension');
}finally{await browser.close();}
