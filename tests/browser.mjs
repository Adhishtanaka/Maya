import {seedProfile} from './profile-fixture.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const errors=[];const base=process.env.MAYA_URL||'http://localhost:5173';
async function open(seed,viewport={width:1280,height:800}){
 const page=await browser.newPage({viewport,hasTouch:viewport.width<700,isMobile:viewport.width<700});page.on('pageerror',e=>errors.push(e.message));
 if(seed)await page.addInitScript(s=>localStorage.setItem('maya-city-v1',JSON.stringify({version:1,x:0,z:33,hour:17.3,money:2500,mission:'available',...s})),seed);
 await seedProfile(page);await page.goto(base);await page.waitForFunction(()=>window.__MAYA__?.ready);await page.click('#start-button');return page;
}
try{
 const page=await open();const assets=await page.evaluate(()=>window.__MAYA__.assetsReady);assert.equal(assets.filter(Boolean).length,6);
 await page.keyboard.press('f');await page.waitForFunction(()=>window.__MAYA__.snapshot().driving);const before=await page.evaluate(()=>window.__MAYA__.snapshot());await page.keyboard.down('w');await page.waitForFunction(z=>window.__MAYA__.snapshot().z<z-3,before.z,{timeout:20000});await page.keyboard.up('w');
 await page.keyboard.down(' ');await page.waitForTimeout(1500);await page.keyboard.up(' ');await page.keyboard.press('f');await page.waitForFunction(()=>!window.__MAYA__.snapshot().driving,{timeout:15000});
 console.log('PASS vehicle entry, acceleration, braking, exit, and existing asset loading');
 await page.click('#settings-button');await page.selectOption('#time-select','23');await page.selectOption('#weather-select','rain');await page.click('#resume-button');await page.waitForFunction(()=>window.__MAYA__.snapshot().weather==='rain');assert.equal(await page.locator('#phase').textContent(),'Night');await page.screenshot({path:'/tmp/maya-night-rain.png'});
 await page.keyboard.press('m');await page.locator('#big-map').click({position:{x:240,y:180}});await page.click('#map-close');await page.keyboard.press('p');assert.ok(await page.evaluate(()=>localStorage.getItem('maya-city-v1')));console.log('PASS night, rain, map waypoint, and saving');await page.close();
 const tea=await open({x:-10,z:24});await tea.keyboard.press('e');await tea.click('#accept-job');await tea.waitForFunction(()=>window.__MAYA__.snapshot().mission==='delivery');const progress=await tea.evaluate(()=>JSON.parse(localStorage.getItem('maya-city-v1')));assert.equal(progress.mission,'delivery');await tea.close();
 const temple=await open({...progress,x:-59,z:-58});await temple.keyboard.press('e');await temple.waitForFunction(()=>window.__MAYA__.snapshot().mission==='done');assert.equal((await temple.evaluate(()=>window.__MAYA__.snapshot())).money,3250);await temple.close();console.log('PASS accept delivery, persistence, temple completion, and reward');
 const highlands=await open({x:0,z:-130});await highlands.click('#settings-button');await highlands.selectOption('#weather-select','snow');await highlands.click('#resume-button');await highlands.waitForFunction(()=>window.__MAYA__.snapshot().weather==='snow');await highlands.screenshot({path:'/tmp/maya-highlands.png'});await highlands.close();
 const city=await open({x:0,z:33},{width:390,height:844});await city.click('#settings-button');await city.selectOption('#weather-select','snow');await city.click('#resume-button');await city.waitForFunction(()=>window.__MAYA__.snapshot().weather==='cloudy');assert.equal(await city.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await city.locator('#touch-controls').isVisible(),true);const touchStart=await city.evaluate(()=>window.__MAYA__.snapshot());const pad=await city.locator('[data-key="w"]').boundingBox();await city.mouse.move(pad.x+20,pad.y+20);await city.mouse.down();await city.waitForFunction(z=>window.__MAYA__.snapshot().z<z-.4,touchStart.z,{timeout:15000});await city.mouse.up();await city.screenshot({path:'/tmp/maya-mobile.png'});await city.close();console.log('PASS highland-only snow and mobile layout');
 assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
}finally{await browser.close();}
