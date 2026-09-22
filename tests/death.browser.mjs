import {seedProfile} from './profile-fixture.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),errors=[],base=process.env.MAYA_URL||'http://localhost:5173';
try{
 for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});page.on('pageerror',e=>errors.push(e.message));await seedProfile(page);await page.goto(base+'/?test');await page.waitForFunction(()=>window.__MAYA_TEST__);await page.click('#start-button');
 // Pause animation frames; the harness advances simulation explicitly.
 const client=await page.context().newCDPSession(page);await client.send('Emulation.setVirtualTimePolicy',{policy:'pause'});
 await page.evaluate(()=>window.__MAYA_TEST__.teleport(0,-300));
 for(const scenario of ['foot','interior','vehicle']){
 const result=await page.evaluate(scenario=>{
  const t=window.__MAYA_TEST__;t.teleport(0,-300);t.heat(0);t.wallet(1000);
  if(scenario==='interior')t.enter('home');
  if(scenario==='vehicle'){t.setCar(t.cars()[0].id,{x:0,z:-300,angle:Math.PI,speed:0});t.teleport(2.5,-300);window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'}));t.advance(2);}
  const before=t.snapshot();t.hurtPlayer(200);t.advance(.1);
  const dead=t.snapshot(),position={x:dead.x,z:dead.z};
  for(const key of ['w','f','e','m','j','Escape','p'])window.dispatchEvent(new KeyboardEvent('keydown',{key}));
  t.advance(.2);t.save();return {before,dead,after:t.snapshot(),position,saved:JSON.parse(localStorage.getItem('maya-city-v1'))};
 },scenario);
 if(scenario==='vehicle')assert.equal(result.before.driving,true,JSON.stringify(result.before));
 if(scenario==='interior')assert.equal(result.before.interior,'home');
 assert.equal(result.dead.dead,true,scenario);assert.equal(result.dead.health,0);assert.equal(result.dead.money,1000);assert.equal(result.after.paused,false);assert.equal(result.after.x,result.position.x);assert.equal(result.after.z,result.position.z);assert.ok(!result.saved||result.saved.health>0);
 assert.equal(await page.locator('#wasted-screen').isVisible(),true);assert.equal(await page.locator('#modal').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(scenario==='foot')await page.screenshot({path:`/tmp/maya-wasted-${mobile?'mobile':'desktop'}.png`});
 const recovered=await page.evaluate(()=>{const t=window.__MAYA_TEST__;t.advance(3.1);return t.snapshot();});assert.equal(recovered.dead,false);assert.equal(recovered.health,100);assert.equal(recovered.money,850);assert.equal(recovered.driving,false);assert.equal(recovered.interior,null);assert.equal(recovered.heat,0);assert.ok(Math.hypot(recovered.x+144,recovered.z-8)<.1);assert.equal(await page.locator('#wasted-screen').isVisible(),false);
 }
 const theft=await page.evaluate(()=>{
  const t=window.__MAYA_TEST__;t.teleport(0,-300);t.heat(0);
  t.setCar(t.cars()[0].id,{x:0,z:-260,speed:0});
  const car=t.cars().find(c=>c.kind==='police');t.setCar(car.id,{x:0,z:-300,angle:0,speed:0,health:100});t.teleport(3.3,-300);
  const before=t.snapshot().footPolice;window.dispatchEvent(new KeyboardEvent('keydown',{key:'f'}));return {before,after:t.snapshot().footPolice,transition:t.snapshot().transition};
 });assert.ok(theft.transition);assert.deepEqual(theft.after.map(p=>[p.x,p.z]),theft.before.map(p=>[p.x,p.z]));
 console.log(`PASS ${mobile?'mobile':'desktop'} WASTED, input lock, recovery, and single fee on foot, indoors, and in vehicles`);await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
