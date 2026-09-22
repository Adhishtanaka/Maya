import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const emblem=await readFile(new URL('../public/assets/maya-emblem.svg',import.meta.url),'utf8');
const src='data:image/svg+xml;base64,'+Buffer.from(emblem).toString('base64');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#383536;color:#faf7ee;font-family:Arial,sans-serif}.card{width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:78px;border-bottom:14px solid #919947}img{width:330px;height:330px;border-radius:36px}h1{font-size:104px;letter-spacing:-6px;margin:0 0 12px}h2{font:40px Georgia,serif;margin:0 0 32px}p{font-size:18px;letter-spacing:3px;color:#c3c98b}small{display:block;margin-top:25px;font-size:18px;line-height:1.6;max-width:540px}</style><div class="card"><img src="${src}"/><div><p>A LIFE IN THE CITY</p><h1>MAYA</h1><h2>After the monsoon.</h2><small>On foot. On wheels. Above the coast.<br>A 3D world to explore in your browser.</small></div></div>`);
 await page.locator('img').evaluate(i=>i.decode());
 await page.screenshot({path:'public/assets/maya-social.png'});
 await mkdir('public/icons',{recursive:true});
 for(const size of [32,180,192,512]){await page.setViewportSize({width:size,height:size});await page.setContent(`<style>body{margin:0;background:#faf7ee}img{display:block;width:100vw;height:100vh}</style><img src="${src}"/>`);await page.locator('img').evaluate(i=>i.decode());await page.screenshot({path:`public/icons/maya-${size}.png`});}
}finally{await browser.close();}
