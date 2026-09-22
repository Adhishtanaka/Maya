import {normalizePhone} from './phone.js';
import {normalizeWardrobe} from './wardrobe.js';
import { normalizeBuildingJobs } from './interior-activities.js';
import { normalizeActivities } from './city-activities.js';
import { intersectsCircle, clamp, distance } from './physics.js';
export { clamp, distance } from './physics.js';
export const ROADS = [-96, -48, 0, 48, 96];
export const BOUNDS = {minX:-322,maxX:110,minZ:-326,maxZ:278};
export const SAVE_KEY = 'maya-city-v1'; // Retain the key and migrate existing saves in place.
export function district(x, z) {
  if (z < -100) return x < -130 ? 'Cloud Forest' : 'Mistwood Highlands';
  if (z > 145) return x < -110 ? 'Diyara Farmlands' : 'South Harbor';
  if (x < -215) return 'Diyara Village';
  if (x < -110) return z < 25 ? 'Cinnamon Estates' : 'Railway Works';
  if (x > 73) return 'Lotus Waterfront';
  if (z < -35) return x < 0 ? 'Temple Quarter' : 'Cinnamon Gardens';
  if (z > 40) return x < 0 ? 'Old Town' : 'Portside Works';
  return x < -30 ? 'Pettah Market' : x > 30 ? 'Neon Quarter' : 'Lotus Avenue';
}
export function phase(hour) {
  if (hour >= 5 && hour < 11) return 'Morning';
  if (hour >= 11 && hour < 16) return 'Afternoon';
  if (hour >= 16 && hour < 19.5) return 'Evening';
  return 'Night';
}
export function clockLabel(hour) {
  const mins = Math.floor(((hour % 24) + 24) % 24 * 60 + 1e-7);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
export function weatherAt(mode, z, roll = .5) {
  if (mode !== 'auto') return mode === 'snow' && z >= -100 ? 'cloudy' : mode;
  if (z < -100 && roll < .14) return 'snow';
  return roll < .22 ? 'rain' : roll < .38 ? 'cloudy' : 'clear';
}
export function collides(x, z, radius, solids) { return solids.some(s => intersectsCircle(x,z,radius,s)); }
const number = (v, fallback, min, max) => Number.isFinite(v) ? clamp(v,min,max) : fallback;
export function readSave(storage,key=SAVE_KEY) {
  try {
    const s = JSON.parse(storage.getItem(key));
    if (!s || ![1,2].includes(s.version) || ![s.x,s.z,s.money,s.hour].every(Number.isFinite)) return null;
    const residents = {};
    for (const [id, r] of Object.entries(s.residents || {}).slice(0,80)) {
      if (!/^resident-\d+$/.test(id) || !r || typeof r!=='object') continue;
      residents[id] = { health:number(r.health,100,0,100), dead:r.dead===true, relationship:number(r.relationship,0,-100,100), met:r.met===true, helped:r.helped===true, dropped:r.dropped===true, helpCount:Math.floor(number(r.helpCount,r.helped?1:0,0,99)),cashDropped:r.cashDropped===true };
    }
    return {
      version:2,phone:normalizePhone(s.phone),wardrobe:normalizeWardrobe(s.wardrobe),radio:['off','coast','lotus','mist'].includes(s.radio)?s.radio:'coast',crew:Array.isArray(s.crew)?[...new Set(s.crew.filter(id=>/^resident-\d+$/.test(id)))].slice(0,3):[],jobRecords:Object.fromEntries(['taxi','rescue','courier','escort'].map(id=>[id,Math.floor(number(s.jobRecords?.[id],0,0,999))])),buildingJobs:normalizeBuildingJobs(s.buildingJobs),equipment:{grenade:number(s.equipment?.grenade,0,0,12),c4:number(s.equipment?.c4,0,0,6),missile:number(s.equipment?.missile,0,0,12),bazooka:s.equipment?.bazooka===true,jetpack:s.equipment?.jetpack===true,parachute:s.equipment?.parachute===true},aircraft:Array.isArray(s.aircraft)?s.aircraft.filter(k=>['plane','helicopter'].includes(k)):[],activities:normalizeActivities(s.activities),savedAt:typeof s.savedAt==='string'&&!Number.isNaN(Date.parse(s.savedAt))?s.savedAt:null, x:clamp(s.x,BOUNDS.minX+2,BOUNDS.maxX-2),z:clamp(s.z,BOUNDS.minZ+2,BOUNDS.maxZ-2),
      money:clamp(s.money,0,9999999),hour:((s.hour%24)+24)%24,health:number(s.health,100,1,100),
      reputation:number(s.reputation,0,0,100),deliveries:Math.floor(number(s.deliveries,0,0,99999)),
      mission:['available','delivery','done'].includes(s.mission)?s.mission:'available',
      inventory:{pistol:s.inventory?.pistol===true,rifle:s.inventory?.rifle===true,pistolAmmo:number(s.inventory?.pistolAmmo,0,0,300),rifleAmmo:number(s.inventory?.rifleAmmo,0,0,600)},
      weapon:['fists','pistol','rifle','bazooka'].includes(s.weapon)?s.weapon:'fists',
      campaign:Math.floor(number(s.campaign,0,0,6)),choice:s.choice==='harbor'?'harbor':'community',
      factions:{community:number(s.factions?.community,0,-100,100),harbor:number(s.factions?.harbor,0,-100,100),police:number(s.factions?.police,0,-100,100),dockside:number(s.factions?.dockside,0,-100,100)},
      properties:Array.isArray(s.properties)?s.properties.filter(x=>['tea-business','warehouse-business','hill-home'].includes(x)):[],
      residents,errand:s.errand&&/^resident-\d+$/.test(s.errand.id)&&typeof s.errand.target==='string'?{id:s.errand.id,target:s.errand.target}:null,
      cameraMode:['top','shoulder','first'].includes(s.cameraMode)?s.cameraMode:'top',
      heat:number(s.heat,0,0,5),
      vehicles:Array.isArray(s.vehicles)?s.vehicles.filter(c=>c&&/^car-\d+$/.test(c.id)&&[c.x,c.z,c.angle,c.health].every(Number.isFinite)).slice(0,30).map(c=>({id:c.id,x:clamp(c.x,BOUNDS.minX+3,BOUNDS.maxX-3),z:clamp(c.z,BOUNDS.minZ+3,BOUNDS.maxZ-3),angle:c.angle,health:clamp(c.health,0,100),officialType:['police','ambulance'].includes(c.officialType)?c.officialType:null,model:['classic','hatch','sport','suv','van','tuk','bicycle','motorcycle','bus','truck'].includes(c.model)?c.model:'classic',color:/^#[0-9a-f]{6}$/i.test(c.color)?c.color:'#ddbd7f'})):[],
      drivingCar:typeof s.drivingCar==='string'&&/^car-\d+$/.test(s.drivingCar)?s.drivingCar:null,
      heist:{stage:['idle','planned','cased','opening','escape','complete'].includes(s.heist?.stage)?s.heist.stage:'idle',kit:s.heist?.kit===true,timer:number(s.heist?.timer,0,0,10)},
      discoveries:Array.isArray(s.discoveries)?s.discoveries.filter(x=>typeof x==='string').slice(0,20):[],
    };
  } catch { return null; }
}
export const LOCATIONS = [
  {id:'tailor',name:'Lotus Threads',short:'LOTUS THREADS',x:33,z:-17.4,color:'#a62646',type:'clothing'},
  {id:'depot',name:'Maya Air & Cycle Depot',short:'AIR & CYCLE DEPOT',x:7,z:-282,color:'#a62646',type:'transport'},
  {id:'club',name:'Ceylon Social Club',short:'CEYLON SOCIAL',x:81,z:-65.4,color:'#a62646',type:'club'},
  { id:'tea',name:'Amma’s tea stop',short:'TEA & SHORT EATS',x:-10,z:24,color:'#e9cc80',type:'job' },
  { id:'temple',name:'Lotus temple',short:'LOTUS TEMPLE',x:-59,z:-58,color:'#e9cc80',type:'delivery' },
  { id:'garage',name:'De Silva Motors',short:'DE SILVA MOTORS',x:61,z:54,color:'#a2d6c4',type:'repair' },
  { id:'race',name:'Coastal time trial',short:'COASTAL RUN',x:96,z:45,color:'#e8a1b4',type:'race' },
  { id:'home',name:'Your apartment',short:'LOTUS RESIDENCES',x:12,z:88.6,color:'#c1d696',type:'home' },
  { id:'weapons',name:'Fernando Sporting Goods',short:'SPORTING GOODS',x:-74,z:88.6,color:'#edc08e',type:'weapons' },
  { id:'clinic',name:'Maya General Hospital',short:'HOSPITAL',x:-163,z:-8,color:'#cae7dc',type:'clinic' },
  { id:'bank',name:'Maya City Bank',short:'CITY BANK',x:22,z:-7.4,color:'#e2bc91',type:'bank' },
  { id:'station',name:'Central Police Station',short:'POLICE',x:-74,z:-7.4,color:'#a4bde0',type:'police' },
  { id:'harbor',name:'South Harbor Union',short:'HARBOR UNION',x:29,z:184.6,color:'#dc9c81',type:'faction' },
  { id:'village',name:'Diyara Community Hall',short:'COMMUNITY HALL',x:-259,z:38.1,color:'#bcdca0',type:'faction' },
  { id:'outlook',name:'Mistwood lookout',short:'MISTWOOD LOOKOUT',x:9,z:-250,color:'#c4e4e4',type:'explore' },
  { id:'farm',name:'Diyara farm cooperative',short:'FARM COOPERATIVE',x:-211,z:180.6,color:'#d8d296',type:'job' },
];
export const RACE_ROUTE = [{x:96,z:0},{x:96,z:-96},{x:48,z:-96},{x:48,z:0},{x:48,z:48},{x:96,z:48}];
export const PROPERTY_DATA = [
  {id:'tea-business',name:'Tea-stop partnership',price:3500,income:120,location:'tea'},
  {id:'warehouse-business',name:'Harbor warehouse',price:6500,income:240,location:'harbor'},
  {id:'hill-home',name:'Mistwood cabin',price:4200,income:0,location:'outlook'},
];
export const CAMPAIGN = [
  {title:'A place to begin',description:'Amma needs a temple delivery. Complete it and become known in the neighborhood.',target:'tea'},
  {title:'A city takes care of its own',description:'Bring Amma’s contribution to Maya General Hospital.',target:'clinic'},
  {title:'Two sides of the island',description:'Meet the community organizer in Diyara. Choose who you want to work with.',target:'village'},
  {title:'The missing manifest',description:'Find the harbor manifest inside the South Harbor Union warehouse.',target:'harbor'},
  {title:'Where your loyalties lie',description:'Deliver the recovered manifest to your chosen ally.',target:'village'},
  {title:'After the monsoon',description:'Meet your neighbors at Mistwood lookout and decide what comes next.',target:'outlook'},
];
export function campaignTarget(state) { return state.campaign===4&&state.choice==='harbor'?'harbor':CAMPAIGN[state.campaign]?.target; }
export function escapeHTML(text) { return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
