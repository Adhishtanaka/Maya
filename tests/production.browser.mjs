import {seedProfile} from './profile-fixture.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),errors=[];
const base=process.env.MAYA_URL||'http://localhost:4173';
async function open(mobile=false,seed={}){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},hasTouch:mobile,isMobile:mobile});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(seed=>localStorage.setItem('maya-city-v1',JSON.stringify({version:2,x:0,z:-300,hour:13,money:2500,inventory:{pistol:true,pistolAmmo:36},weapon:'pistol',cameraMode:'first',...seed})),seed);
 await seedProfile(page);await page.goto(base+'/?test');await page.waitForFunction(()=>window.__MAYA__?.ready);
 assert.equal(await page.evaluate(()=>typeof window.__MAYA_TEST__),'undefined');await page.click('#start-button');await page.evaluate(()=>window.__MAYA__.assetsReady);return page;
}
try{
 const desktop=await open();const ammo=await desktop.evaluate(()=>window.__MAYA__.snapshot().inventory.pistolAmmo);
 await desktop.locator('#game canvas').click({position:{x:640,y:425}});assert.equal(await desktop.evaluate(()=>window.__MAYA__.snapshot().inventory.pistolAmmo),ammo-1);
 await desktop.screenshot({path:'/tmp/maya-production-first.png'});await desktop.close();
 console.log('PASS production-only build, excluded debug harness and real first-person firearm input');
 const page=await open(true);assert.equal(await page.evaluate(()=>window.__MAYA__.snapshot().graphics),'low');
 const client=await page.context().newCDPSession(page),box=await page.locator('[data-action="fire"]').boundingBox(),fire={x:box.x+box.width/2,y:box.y+box.height/2,id:1};
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[fire]});
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[fire,{x:220,y:370,id:2}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[fire,{x:120,y:350,id:2}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:120,y:350,id:2}]});
 const afterLook=await page.evaluate(()=>window.__MAYA__.snapshot().inventory.pistolAmmo);
 await page.waitForFunction(a=>window.__MAYA__.snapshot().inventory.pistolAmmo<a,afterLook,{timeout:15000});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.screenshot({path:'/tmp/maya-production-mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.click('#phone-button');await page.click('[data-app="games"]');await page.click('[data-game="memory"]');await page.click('[data-memory="0"]');assert.notEqual(await page.locator('[data-memory="0"]').innerText(),'?');await page.screenshot({path:'/tmp/maya-production-phone-012.png'});await page.close();
 const shop=await open(false,{x:33,z:-17.4});await shop.keyboard.press('e');await shop.click('[data-outfit="harbor"]');assert.equal(await shop.evaluate(()=>window.__MAYA__.snapshot().wardrobe.equipped),'harbor');await shop.screenshot({path:'/tmp/maya-production-shop-012.png'});await shop.close();
 assert.deepEqual(errors,[]);console.log('PASS production animated shop, phone game and native two-finger touch look, uninterrupted held fire, mobile layout and no runtime errors');
}finally{await browser.close();}
