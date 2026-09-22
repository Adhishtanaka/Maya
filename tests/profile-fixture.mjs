export async function seedProfile(page){await page.addInitScript(()=>localStorage.setItem('maya-player-profile',JSON.stringify({name:'Test Player',age:24})));}
