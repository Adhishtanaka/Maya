import {CityPhone,phoneNumber} from './phone.js';
import {PhoneUI} from './phone-ui.js';
import {OUTFITS,normalizeWardrobe,buyOutfit,wear} from './wardrobe.js';
import {InteractionStage} from './interaction-stage.js';
import {radioSignal,STATIONS} from './vehicle-radio.js';
import * as THREE from 'three';
import './style.css';
import { createWorld, createPerson } from './world.js';
import { animatePerson, VEHICLE_SPECS } from './actor-models.js';
import { Occupants } from './occupants.js';
import { StreetCombat } from './street-combat.js';
import { Flight, AIRCRAFT } from './flight.js';
import { Ordnance, ORDNANCE, blastDamage } from './ordnance.js';
import { Families } from './families.js';
import { buildingTask, completeBuildingStep } from './interior-activities.js';
import {PROFILE_KEY,readProfile,normalizeProfile,canEnterClub} from './player-profile.js';
import {react,reactionPose} from './reactions.js';
import {CashDrops} from './cash-drops.js';
import {StreetLife,canRecruit} from './street-life.js';
import {FootPatrols} from './foot-patrols.js';
import {CityJobs,CITY_JOBS} from './city-jobs.js';
import {Wildlife} from './wildlife.js';
import {Tornado} from './tornado.js';
import { CityAudio } from './audio.js';
import { createUI } from './ui.js';
import { BOUNDS, clamp, distance, district, phase, clockLabel, readSave, SAVE_KEY, LOCATIONS, PROPERTY_DATA, CAMPAIGN, campaignTarget, escapeHTML as esc } from './systems.js';
import { CollisionWorld, Navigator, RoadNavigator, intersectsCircle } from './physics.js';
import { Vehicles, vehicleBlocked } from './vehicles.js';
import { Population } from './residents.js';
import { Interiors } from './interiors.js';
import { Combat, WEAPONS } from './combat.js';
import { EmergencyServices } from './emergency.js';
import { Atmosphere } from './atmosphere.js';
import { drawMap, mapProjection } from './map.js';
import { LEDGER_OUTCOMES, encounterSpeaker, resolveLedger, updateLedgerWitness } from './encounters.js';
import { RivalRacing, RIVALS } from './racing.js';
import { PlayerTactics } from './tactics.js';
import { RACE_COURSES, raceCourse, raceTarget, startRace, tickRace, FACTIONS, TERRITORIES, CONTRACTS, normalizeActivities, territoryOwner, completeContract } from './city-activities.js';
import { QUALITY, readPreferences } from './preferences.js';
import { listSlots, writeSlot, restoreSlot } from './saves.js';

const ui=createUI(),$=ui.el,audio=new CityAudio();
let preferences={quality:'balanced',sensitivity:1};try{preferences=readPreferences(localStorage,matchMedia('(pointer:coarse)').matches);}catch{}
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch { document.querySelector('#game').innerHTML='<div class="loading-error"><h1>Maya needs WebGL</h1><p>Enable browser hardware acceleration and reload.</p></div>';throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,QUALITY[preferences.quality].pixelRatio));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=QUALITY[preferences.quality].shadows;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
document.querySelector('#game').appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Game world. Use the equipment and settings buttons for controls.');
const scene=new THREE.Scene();scene.background=new THREE.Color('#a5b8b3');scene.fog=new THREE.FogExp2('#a5b8b3',.002);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.12,1000);
const world=createWorld(scene),collision=new CollisionWorld(world.solids,BOUNDS),navigator=new Navigator(collision);
let saved=null;try{saved=readSave(localStorage);}catch{}
let profile=null;try{profile=readProfile(localStorage);}catch{}
const state={
 profile,wardrobe:normalizeWardrobe(saved?.wardrobe),radio:saved?.radio||'coast',crew:saved?.crew||[],jobRecords:saved?.jobRecords||{},intoxication:0,mapZoom:1,mapFilters:{services:true,people:true,vehicles:true},
 started:false,paused:false,x:saved?.x??0,z:saved?.z??33,previous:{x:0,z:33},hour:saved?.hour??17.3,
 money:saved?.money??2500,health:saved?.health??100,reputation:saved?.reputation??0,deliveries:saved?.deliveries??0,mission:saved?.mission??'available',
 inventory:{...(saved?.inventory??{pistol:false,rifle:false,pistolAmmo:0,rifleAmmo:0}),grenade:0,c4:0,missile:0,bazooka:false,jetpack:false,parachute:false,...saved?.equipment},buildingJobs:saved?.buildingJobs||{},ownedAir:saved?.aircraft||[],floor:0,altitude:0,flightMode:null,fuel:100,cheats:{},runBoost:1,weapon:saved?.weapon??'fists',
 campaign:saved?.campaign??0,choice:saved?.choice??'community',factions:saved?.factions??{community:0,harbor:0,police:0,dockside:0},properties:saved?.properties??[],errand:saved?.errand??null,
 activities:normalizeActivities(saved?.activities),heist:saved?.heist??{stage:'idle',kit:false,timer:0},discoveries:saved?.discoveries??[],weatherMode:'auto',weather:'clear',weatherRoll:.6,heat:saved?.heat??0,speed:0,driving:null,interior:null,
 elapsed:0,knocked:0,knockX:0,knockZ:0,walking:false,sprinting:false,angle:Math.PI/4,pitch:.12,zoom:78,cameraMode:saved?.cameraMode??'top',waypoint:null,race:null,heading:Math.PI,jump:0,jumpVelocity:0,
};
const tactics=new PlayerTactics(state);
if(collision.blocked(state.x,state.z,.7)){state.x=0;state.z=33;}state.previous={x:state.x,z:state.z};
const player=createPerson('#c99b75','#eed5a4');player.position.set(state.x,.3,state.z);scene.add(player);
const halo=new THREE.Mesh(new THREE.RingGeometry(.85,1,32),new THREE.MeshBasicMaterial({color:'#d7eaa6',transparent:true,opacity:.7,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.renderOrder=5;scene.add(halo);
const vehicles=new Vehicles(scene,collision);vehicles.populate();
for(const stored of saved?.vehicles||[]){
 const car=vehicles.cars.find(c=>c.id===stored.id);
 if(car&&!vehicleBlocked(collision,stored.x,stored.z,stored.angle,car.spec)){Object.assign(car,stored,{kind:'parked',owned:true,speed:0,exploded:stored.health<=0});car.mesh.position.set(car.x,.26,car.z);car.mesh.rotation.y=car.angle;}
}
const restoredVehicle=vehicles.cars.find(c=>c.id===saved?.drivingCar&&c.owned&&c.health>0);
if(restoredVehicle){state.driving=restoredVehicle;state.x=restoredVehicle.x;state.z=restoredVehicle.z;state.previous={x:state.x,z:state.z};}
else if(vehicles.cars.some(c=>distance(c,state)<2.6)){
 for(let i=0;i<12;i++){const p={x:state.x+Math.sin(i*Math.PI/6)*4,z:state.z+Math.cos(i*Math.PI/6)*4};if(!collision.blocked(p.x,p.z,.65)&&vehicles.cars.every(c=>distance(c,p)>3)){state.x=p.x;state.z=p.z;break;}}
}
const population=new Population(scene,world,navigator,saved?.residents),interiors=new Interiors(scene,population);
const atmosphere=new Atmosphere(scene,world),combat=new Combat(scene,population,audio,toast),emergency=new EmergencyServices(scene,vehicles,new RoadNavigator(navigator,world.roadSegments),population,toast);
vehicles.counter=200;for(const [i,model] of ['bicycle','motorcycle','van','bus'].entries()){const c=vehicles.add(3,-157-i*13,'#a62646',0,'parked',{model});const stored=saved?.vehicles?.find(v=>v.id===c.id);if(stored&&!vehicleBlocked(collision,stored.x,stored.z,stored.angle,c.spec))Object.assign(c,stored);if(saved?.drivingCar===c.id&&c.health>0)state.driving=c;}
for(const stored of saved?.vehicles||[]){const c=vehicles.cars.find(c=>c.id===stored.id);if(c&&stored.officialType){emergency.releaseVehicle(c,state);Object.assign(c,stored,{owned:true,kind:'parked',speed:0});if(saved.drivingCar===c.id){state.driving=c;state.x=c.x;state.z=c.z;}}}
for(const stored of saved?.vehicles||[]){if(!vehicles.cars.some(c=>c.id===stored.id)&&Number(stored.id.slice(4))>=1000&&!vehicleBlocked(collision,stored.x,stored.z,stored.angle,VEHICLE_SPECS[stored.model])){vehicles.counter=Math.max(1000,Number(stored.id.slice(4)));const c=vehicles.add(stored.x,stored.z,stored.color,stored.angle,'parked',{model:stored.model,officialType:stored.officialType,health:stored.health,exploded:stored.health<=0});if(saved.drivingCar===c.id&&c.health>0){state.driving=c;state.x=c.x;state.z=c.z;}}}
vehicles.counter=Math.max(1000,...vehicles.cars.map(c=>Number(c.id.slice(4))+1));
const soundTruck=vehicles.add(51,114,'#a62646',0,'traffic',{model:'truck',cruise:7,path:[{x:51,z:147},{x:93,z:147},{x:93,z:237},{x:51,z:237}]});soundTruck.id='car-250';const storedTruck=saved?.vehicles?.find(c=>c.id===soundTruck.id);if(storedTruck)Object.assign(soundTruck,storedTruck,{kind:'parked',owned:true,speed:0});if(saved?.drivingCar===soundTruck.id)state.driving=soundTruck;
const occupants=new Occupants(vehicles,population,collision,scene,state.crew);
if(state.driving){occupants.playerBoard(state.driving);wear(state.driving.mesh.userData.driver,state.wardrobe);}
const street=new StreetCombat(scene,population,combat,collision);street.interior=()=>interiors.active;
const flight=new Flight(scene,collision,player),families=new Families(scene,navigator);
const ordnance=new Ordnance(scene,collision,(kind,position,s,projectile)=>{
 audio.play('explosion');const local=projectile.interior,targets=local?interiors.active?.building.id===local&&interiors.active.floor===projectile.floor?interiors.active.people.map(v=>({p:v.resident,position:v})):[]:population.people.filter(p=>!p.inside&&!p.vehicle).map(p=>({p,position:p}));
 for(const t of targets){const d=Math.hypot(t.position.x-position.x,t.position.z-position.z,1-position.y),damage=blastDamage(kind,d);if(damage>0&&projectile.collision.lineClear(position,t.position,.1,1))combat.hurtResident(t.p,damage,state,{crime:true,scene:projectile.scene,position:t.position});}
 if((state.interior||null)===local&&(state.floor||0)===projectile.floor&&projectile.collision.lineClear(position,state,.1,1))hurtPlayer(blastDamage(kind,Math.hypot(state.x-position.x,state.z-position.z,(state.altitude||0)+1-position.y)),true);
 if(!local){for(const c of vehicles.cars){const damage=blastDamage(kind,Math.hypot(c.x-position.x,c.z-position.z,1-position.y));if(damage>0&&collision.lineClear(position,c,.1,1))c.health=Math.max(0,c.health-damage*1.3);}for(const t of combat.externalTargets()){const damage=blastDamage(kind,Math.hypot(t.x-position.x,t.z-position.z,1-position.y));if(damage>0&&collision.lineClear(position,t,.1,1))combat.onExternalHit(t,damage);}}
 emergency.report(2,outside(),state);
});
const cashDrops=new CashDrops(),streetLife=new StreetLife(population,navigator,combat),jobs=new CityJobs(scene,navigator),wildlife=new Wildlife(scene,collision,audio),tornado=new Tornado(scene);
const footPolice=new FootPatrols(scene,navigator,combat,(p,s)=>{s.heat=Math.max(2,s.heat);emergency.lastKnown={x:p.x,z:p.z};emergency.report(2,p,s);});
streetLife.rejoin(state,vehicles);emergency.medicalPeople=()=>[...population.people,...footPolice.people];footPolice.onInjury=(p,s)=>emergency.dispatch(p,s);
footPolice.onDeath=(p,s)=>street.drop(p,'pistol',s);tornado.onWarning=()=>toast('TORNADO WARNING · Move away from the red map zone or shelter indoors.');
interiors.canEnter=building=>{if(building.id==='club'&&!canEnterClub(state.profile)){toast('Ceylon Social is for guests aged 18 and over.');return false;}return true;};
streetLife.threats=()=>[...population.people.filter(p=>!p.dead&&p.gang&&!state.crew.includes(p.id)&&p.hostileUntil>state.elapsed),...footPolice.targets().filter(t=>t.footOfficer.aggressiveUntil>state.elapsed)];
streetLife.onDefend=(target,damage,s)=>target.footOfficer?footPolice.hurt(target.footOfficer,damage,s):combat.hurtResident(target,damage,s,{source:state});
combat.onReaction=(p,s,crime,ownerScene,position)=>{streetLife.provoke(p,s,crime);if(crime)cashDrops.drop(p,s,ownerScene,position);};
combat.onLaunch=(s,target)=>ordnance.launch('missile',s,target,activeScene(),activeCollision());
const windowTarget=new THREE.WebGLRenderTarget(1024,81),windowCamera=new THREE.PerspectiveCamera(58,21.5/1.7,.1,500);let windowClock=0;
const racing=new RivalRacing(vehicles,emergency.navigator);
applyGraphics();
const targetRing=new THREE.Mesh(new THREE.RingGeometry(3.3,3.55,48),new THREE.MeshBasicMaterial({color:'#d6eaa2',side:THREE.DoubleSide,transparent:true,opacity:.8}));targetRing.rotation.x=-Math.PI/2;scene.add(targetRing);
const keys=new Set(),pointer=new THREE.Vector2(0,0),raycaster=new THREE.Raycaster(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),-1.3);
let activeModal=null,toastTimeout,saveTimer=0,incomeTimer=0,interiorTimer=0,hudTimer=0,damageCooldown=0,walkTime=0,lastFrame=performance.now(),rightMouse=false,firing=false,cutscene=0;
const phone=new CityPhone(saved?.phone),stage=new InteractionStage();let conversationPerson=null,purchaseBefore=0,purchaseButton='',nextMessageAt=45;
const phoneUI=new PhoneUI(phone,state,population.people,{show:showModal,close:closeModal,save:saveGame,toast,audio,position:outside,job:id=>{const ok=jobs.start(id,state);if(ok){state.waypoint=null;state.jobActive=true;}return ok;}});
phone.onConnect=(call,s)=>{if(['police','ambulance'].includes(call.id))return emergency.requestService(call.id,call.point,s);const p=population.people.find(p=>p.id===call.id);if(!p||p.dead||p.injured||p.removed)return 'This contact is unavailable.';if(p.relationship<10&&!s.crew.includes(p.id))return 'Let’s get to know each other better first. Help me with a favor.';if(p.vehicle&&!occupants.eject(p.vehicle,s))return 'I am driving. Please call back when I stop.';if(p.inside){const b=world.buildings.find(b=>b.id===p.inside);if(b){p.x=b.door.x;p.z=b.door.z;}p.inside=null;}p.mesh.visible=true;p.meeting={...call.point,until:s.elapsed+180};p.following=true;return 'I’m on my way to your shared location.';};
streetLife.onMeet=p=>toast(p.name+' arrived at your shared location.');
emergency.onAid=s=>{s.health=Math.min(100,s.health+60);toast('The medic treated your injuries.');saveGame();};
let loadingSave=false;
let aim={x:state.x,z:state.z-10};
function outside(){return state.interior?interiors.returnPoint:state;}
function activeScene(){return interiors.active?.scene||scene;}
function activeCollision(){return interiors.active?.collision||collision;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),5000);}
combat.initialize(state,player);wear(player,state.wardrobe);
combat.outsidePosition=outside;emergency.outsidePosition=outside;
if(state.heat>0)emergency.lastKnown={x:state.x,z:state.z};
combat.onCrime=(severity,position)=>{street.alert(position,state);emergency.report(severity,position,state);};
combat.onInjury=(person,s,source)=>{
 const location=person.inside?world.buildings.find(b=>b.id===person.inside)?.door:person;
 emergency.dispatch(person,s,location||source||person);
};
emergency.onGunshot=()=>audio.play('gunshot');emergency.onOfficerShot=(start,end)=>combat.tracer(start,end,state.elapsed);
vehicles.onExplosion=(car)=>{
 audio.play('explosion');occupants.eject(car,state,true);street.alert(car,state);for(const t of combat.externalTargets()){const d=distance(t,car);if(d<10&&collision.lineClear(car,t,.1,1.4))combat.onExternalHit(t,Math.max(0,110-d*10),car===state.driving);}
 for(const p of population.people)if(!p.inside&&!p.vehicle&&!p.dead&&distance(p,car)<10&&collision.lineClear(car,p,.1,1.4)){combat.hurtResident(p,Math.max(0,110-distance(p,car)*10),state,{crime:car===state.driving,source:car});const d=distance(p,car)||1;p.impulse={x:(p.x-car.x)/d*12,z:(p.z-car.z)/d*12};}
 if(!state.interior&&Math.hypot(state.x-car.x,state.z-car.z,state.altitude||0)<11&&collision.lineClear(car,state,.1,1.4)){hurtPlayer(car===state.driving?95:Math.max(0,100-distance(state,car)*10),true);if(state.driving===car){state.driving=null;const spot=occupants.freeDoor(car);if(spot){state.x=spot.x;state.z=spot.z;}car.mesh.userData.driver.visible=false;}state.knocked=1;const d=distance(state,car)||1;state.knockX=(state.x-car.x)/d*10;state.knockZ=(state.z-car.z)/d*10;}
 for(const other of vehicles.cars)if(other!==car&&!other.exploded&&distance(other,car)<9&&collision.lineClear(car,other,.1,1)){other.health=Math.max(0,other.health-(9-distance(other,car))*9);const d=distance(other,car)||1;other.impulseX+=(other.x-car.x)/d*6;other.impulseZ+=(other.z-car.z)/d*6;}
};
combat.vehicleTargets=()=>vehicles.cars.filter(c=>c!==state.driving&&c.kind!=='removed'&&c.health>0);
combat.onVehicleHit=(car,damage,s)=>{
 car.health=Math.max(0,car.health-damage*.6);emergency.report(car.kind==='police'?2:1,s,state);
 if(car.health===0){car.speed=0;if(car.kind==='traffic')car.kind='parked';}
};

combat.externalTargets=()=>state.interior?[]:[...footPolice.targets(),...wildlife.targets(),...emergency.patrols.filter(u=>u.onFoot&&u.health>0).map(u=>({x:u.officer.position.x,z:u.officer.position.z,unit:u}))];
combat.onExternalHit=(target,damage,crime=true)=>{if(target.footOfficer){footPolice.hurt(target.footOfficer,damage,state,crime);return;}if(target.animal){wildlife.hurt(target.animal,damage,state);return;}const u=target.unit;if(u.health<=0)return;u.health=Math.max(0,u.health-damage);react(u.officer,u.health?'hit':'death',state.elapsed);combat.blood(scene,target,state.elapsed,.5);if(crime)emergency.report(2,target,state);if(!u.health){street.drop(target,'pistol',state);u.onFoot=false;toast('Officer down. Dispatch has been alerted.');}};

function serialize(){
 const pos=state.flightMode?{x:7,z:-282}:outside();return {version:2,phone:phone.data,wardrobe:state.wardrobe,radio:state.radio,crew:[...state.crew],jobRecords:{...state.jobRecords},buildingJobs:{...state.buildingJobs},equipment:Object.fromEntries(['grenade','c4','missile','bazooka','jetpack','parachute'].map(k=>[k,state.inventory[k]])),aircraft:[...state.ownedAir],savedAt:new Date().toISOString(),activities:state.activities,x:pos.x,z:pos.z,money:state.money,hour:state.hour,health:state.health,reputation:state.reputation,deliveries:state.deliveries,mission:state.mission,inventory:{...state.inventory},weapon:state.weapon,campaign:state.campaign,choice:state.choice,factions:{...state.factions},properties:[...state.properties],residents:population.serialize(),errand:state.errand,cameraMode:state.cameraMode,discoveries:[...state.discoveries],heat:state.heat,heist:{...state.heist},vehicles:vehicles.cars.filter(c=>c.owned&&c.kind==='parked').map(({id,x,z,angle,health,model,color,officialType})=>({id,x,z,angle,health,model,color,officialType})),drivingCar:state.driving?.id||null};
}
function saveGame(announce=false){
 if(loadingSave||state.death||state.health<=0)return;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(serialize()));$('save-status').textContent='SAVED';if(announce)toast('Your city progress has been saved.');}
 catch{$('save-status').textContent='SAVE UNAVAILABLE';if(announce)toast('Browser storage is unavailable. This session will not be saved.');}
}
function showModal(content,type='menu'){
 if(state.death)return;
 keys.clear();firing=false;rightMouse=false;state.paused=true;activeModal=type;purchaseBefore=state.money;purchaseButton='';
 if(document.pointerLockElement)document.exitPointerLock();
 stage.close();$('modal').dataset.kind=type;$('modal-body').innerHTML=content;$('modal').classList.remove('hidden');$(type==='phone'?'phone-back':'close-modal').focus();if(['dialogue','story','shop','food','vehicles','depot','wardrobe','club-lounge','encounter','heist','city-jobs'].includes(type))stage.mount($('modal-body'),type,type==='dialogue'?conversationPerson:null,state.wardrobe);
}
function closeModal(){stage.close(stage.active&&(state.money!==purchaseBefore||/accept|choose|recruit|story|finish/.test(purchaseButton)));purchaseButton='';renderer.domElement.focus({preventScroll:true});lastMouseLook=null;state.paused=false;activeModal=null;$('modal').classList.add('hidden');keys.clear();}
$('close-modal').onclick=closeModal;
$('modal-body').addEventListener('click',e=>{const b=e.target.closest('button');purchaseBefore=state.money;purchaseButton=b?.id||(b?.dataset.cityJob?'accept-job':'');queueMicrotask(()=>{if(stage.active&&state.money!==purchaseBefore)stage.exchange(state.money<purchaseBefore?'Thank you · handed over':'Agreement complete');});},true);
function previewChoice(e){const b=e.target.closest('button');if(!b||!stage.active)return;const id=b.dataset.outfit?'outfit:'+b.dataset.outfit:b.dataset.car?'car:'+b.dataset.car:b.dataset.food?'food:'+b.dataset.food:b.dataset.gear==='bazooka'?'bazooka':b.id.replace('buy-','');if(id)stage.preview(id);}
$('modal-body').addEventListener('pointerover',previewChoice);$('modal-body').addEventListener('focusin',previewChoice);

$('modal').setAttribute('role','dialog');$('modal').setAttribute('aria-modal','true');$('modal').setAttribute('aria-label','Maya city menu');
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
$('modal').addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;const list=[...$('modal').querySelectorAll('button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length),first=list[0],last=list.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
if(state.profile){$('player-name').value=state.profile.name;$('player-age').value=state.profile.age;$('profile-fields').classList.add('hidden');}
for(const id of ['player-name','player-age'])$(id).addEventListener('input',()=>{$('profile-error').textContent='';});
$('start-button').onclick=async()=>{
 if(!state.profile){const profile=normalizeProfile({name:$('player-name').value,age:Number($('player-age').value)});if(!profile){$('profile-error').textContent='Enter a name and a whole-number age from 1 to 120.';return;}state.profile=profile;try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}$('profile-error').textContent='';}

 state.started=true;document.body.classList.add('playing');$('welcome').classList.add('hidden');keys.clear();
 try{await audio.start();}catch{toast('Audio could not start. The city is still playable.');}
 toast(saved?'Welcome back. Your city remembers you.':`Welcome, ${state.profile.name}. Your apartment has an equipment locker. The sporting-goods shop is marked on the map.`);
};
$('sound-button').onclick=async()=>{try{await audio.start();$('sound-button').classList.toggle('muted',audio.toggle());}catch{toast('Audio is unavailable.');}};
function help(){
 showModal(`<h2>Find your way.</h2><div class="controls-grid">${[['J / N','Phone / vehicle radio'],['O','City jobs'],['I / `','Equipment / sandbox codes'],['X / K','Jetpack / parachute'],['G / T / Y / L','Grenade / charge / detonate / missile'],['WASD / arrows','Walk / drive / fly'],['SHIFT','Sprint'],['C / CTRL','Crouch / slow walk'],['B','Take / leave nearby cover'],['ALT','Dodge in movement direction'],['E','Talk / use / enter door'],['F','Enter / exit vehicle'],['1 / 2 / 3 / 4','Fists / pistol / carbine / bazooka'],['CLICK','Attack toward cursor / crosshair'],['R','Reload'],['V','Elevated / shoulder / first person'],['MOUSE','Look around in shoulder / first person'],['Q','Rotate view'],['SPACE / CTRL','Jump / brake · ascend / descend in flight'],['H','Horn'],['M','Map & waypoint'],['TAB','Journal & contacts'],['P','Save'],['ESC','Pause / release mouse']].map(([k,v])=>`<div><kbd>${k}</kbd>${v}</div>`).join('')}</div><p>Every building door opens a separate interior. Equip your pistol from your apartment locker, or buy firearms and ammunition at Fernando Sporting Goods. Traffic needs time to brake. Trees, rock faces, furniture and parked vehicles are solid.</p><p>Residents have names, routines and memories. Injuries call ambulances; witnessed crimes bring patrols. Higher wanted levels bring armed police and air support. Blood fades after 60 seconds of active play.</p><button id="help-close" class="primary">RETURN TO CITY</button>`,'help');$('help-close').onclick=closeModal;
}
function applyGraphics(){
 const q=QUALITY[preferences.quality];renderer.setPixelRatio(Math.min(devicePixelRatio,q.pixelRatio));renderer.shadowMap.enabled=q.shadows;atmosphere.quality=q;
 atmosphere.geometry.setDrawRange(0,q.particles);atmosphere.rainGeometry.setDrawRange(0,q.particles*2);
 try{localStorage.setItem('maya-preferences',JSON.stringify(preferences));}catch{}
}
function settings(){
 showModal(`<h2>Your kind of city.</h2><label class="settings-row"><span>Time of day</span><select id="time-select"><option value="auto">Continue cycle</option><option value="7">Morning · 07:00</option><option value="13">Afternoon · 13:00</option><option value="17.5">Evening · 17:30</option><option value="23">Dark night · 23:00</option></select></label><label class="settings-row"><span>Weather<small>Snow is limited to the northern highlands.</small></span><select id="weather-select"><option value="auto">Natural weather</option><option value="clear">Clear skies</option><option value="cloudy">Cloudy</option><option value="rain">Monsoon rain</option><option value="snow">Highland snowfall</option><option value="tornado">Tornado event</option></select></label><label class="settings-row"><span>Camera mode<small>V cycles views. Move the mouse to look around.</small></span><select id="camera-select"><option value="top">Elevated</option><option value="shoulder">Over the shoulder</option><option value="first">First person</option></select></label><label class="settings-row"><span>Graphics<small>Low reduces shadows, lights and weather particles.</small></span><select id="quality-select"><option value="low">Low · mobile</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><label class="settings-row"><span>Look sensitivity</span><input id="sensitivity" type="range" min=".4" max="2" step=".1" value="${preferences.sensitivity}"></label><label class="settings-row"><span>Sound volume</span><input id="volume" type="range" min="0" max="1" step=".05" value="${audio.volume}"></label><label class="settings-row"><span>Elevated camera distance</span><input id="zoom" type="range" min="40" max="115" value="${state.zoom}"></label><div class="settings-footer"><button id="save-button" class="secondary">SAVE</button><button id="slots-button" class="secondary">SAVE SLOTS</button><button id="help-button" class="secondary">CONTROLS</button><button id="resume-button" class="primary">RESUME</button></div>`,'settings');
 $('quality-select').value=preferences.quality;$('quality-select').onchange=e=>{preferences.quality=e.target.value;applyGraphics();};$('sensitivity').oninput=e=>{preferences.sensitivity=Number(e.target.value);applyGraphics();};
 $('weather-select').value=state.weatherMode;$('weather-select').onchange=e=>state.weatherMode=e.target.value;
 $('time-select').onchange=e=>{if(e.target.value!=='auto')state.hour=Number(e.target.value);};
 $('camera-select').value=state.cameraMode;$('camera-select').onchange=e=>{state.cameraMode=e.target.value;cutscene=1;};
 $('volume').oninput=e=>audio.setVolume(Number(e.target.value));$('zoom').oninput=e=>state.zoom=Number(e.target.value);
 $('slots-button').onclick=saveSlots;$('save-button').onclick=()=>saveGame(true);$('help-button').onclick=help;$('resume-button').onclick=closeModal;
}
$('settings-button').onclick=settings;
function saveSlots(){
 let slots;try{slots=listSlots(localStorage);}catch{toast('Browser storage is unavailable.');return;}
 showModal(`<h2>Keep a place in the city.</h2><p>Automatic saving continues in your current game. These three snapshots stay unchanged until you replace them. Loading keeps a backup of the current autosave.</p><div class="save-slots">${slots.map(({slot,save})=>`<article><strong>Slot ${slot}</strong><p>${save?`Rs. ${Math.round(save.money)} · ${save.campaign===6?'Story complete':`Chapter ${save.campaign+1}`}<br>${save.savedAt?esc(new Date(save.savedAt).toLocaleString()):'Earlier save'}`:'Empty slot'}</p><button class="secondary" data-save-slot="${slot}">${save?'REPLACE':'SAVE HERE'}</button> <button class="primary" data-load-slot="${slot}" ${save?'':'disabled'}>LOAD</button></article>`).join('')}</div><button id="slots-back" class="secondary">BACK</button>`,'saves');
 document.querySelectorAll('[data-save-slot]').forEach(b=>b.onclick=()=>{try{writeSlot(localStorage,Number(b.dataset.saveSlot),serialize());saveSlots();toast('Snapshot saved.');}catch{toast('Storage is full or unavailable. Snapshot was not saved.');}});
 document.querySelectorAll('[data-load-slot]').forEach(b=>b.onclick=()=>{try{if(restoreSlot(localStorage,Number(b.dataset.loadSlot))){loadingSave=true;location.reload();}else toast('This snapshot could not be read.');}catch{toast('Could not load this snapshot.');}});
 $('slots-back').onclick=settings;
}
function raceMenu(){
 showModal(`<h2>Choose your run.</h2><p>Races use your current vehicle. Traffic and weather stay active.</p><p>${RIVALS.map(r=>`<strong>${r.name}</strong> · ${r.story}`).join('<br>')}</p><div class="activity-grid">${RACE_COURSES.map(c=>`<article><h3>${c.name}</h3><p>${c.description}</p><p>${c.laps} lap${c.laps>1?'s':''} · ${c.seconds}s · Rs. ${c.prize}${state.activities.raceBest[c.id]?` · Best ${state.activities.raceBest[c.id].toFixed(1)}s`:''}</p><button class="primary" data-race="${c.id}">START RUN</button></article>`).join('')}</div>`,'races');
 document.querySelectorAll('[data-race]').forEach(b=>b.onclick=()=>{state.race=startRace(b.dataset.race);racing.start(b.dataset.race);state.waypoint=null;closeModal();audio.play('success');toast(`${raceCourse(state.race).name} started. Follow the map checkpoints.`);});
}
function activityBoard(){
 showModal(`<h2>Who shapes the city?</h2><article class="encounter-card"><h3>The wages ledger</h3><p>A personal dispute involving Ravi and Deepa. Evidence, testimony and three possible loyalties.</p><p>Status: ${{available:'Speak with Ravi',evidence:'Collect the ledger',witness:'Hear Deepa’s account',deliver:'Hand over the evidence',resolved:'Resolved'}[state.activities.encounter.stage]}${state.activities.encounter.choice?` · ${LEDGER_OUTCOMES[state.activities.encounter.choice].name}`:''}</p>${state.activities.encounter.stage!=='resolved'?'<button id="track-ledger" class="secondary">TRACK THIS STORY</button>':''}</article><p>Complete a job to build trust and shift local influence. A job pays 10% extra when its faction already leads the district.</p><div class="territory-list">${TERRITORIES.map(t=>`<p><strong>${t.name}</strong> · ${FACTIONS[territoryOwner(state.activities,t.id)].name}<br><small>${Object.entries(state.activities.influence[t.id]).map(([f,n])=>`${FACTIONS[f].name} ${n}`).join(' · ')}</small></p>`).join('')}</div><div class="activity-grid">${CONTRACTS.map(c=>`<article><span class="eyebrow">${FACTIONS[c.faction].name}</span><h3>${c.name}</h3><p>${c.description}</p><p>Rs. ${c.reward} + district bonus</p><button class="primary" data-contract="${c.id}" ${state.activities.contract?'disabled':''}>ACCEPT JOB</button></article>`).join('')}</div>${state.activities.contract?'<button id="cancel-contract" class="secondary">ABANDON CURRENT FACTION JOB</button>':''}`,'activities');
 if($('track-ledger'))$('track-ledger').onclick=()=>{if(state.activities.encounter.stage==='available'&&population.people.find(p=>p.id==='resident-3').dead){toast('Ravi has died. His personal request is no longer available.');return;}state.activities.encounter.tracking=true;state.waypoint=null;closeModal();saveGame();toast('The next person or place is marked. Contacts keep their own daily schedules.');};
 document.querySelectorAll('[data-contract]').forEach(b=>b.onclick=()=>{state.activities.contract={id:b.dataset.contract,step:0};state.waypoint=null;closeModal();saveGame();toast('Job accepted. The next stop is marked on your map.');});
 if($('cancel-contract'))$('cancel-contract').onclick=()=>{state.activities.contract=null;saveGame();activityBoard();};
}
function progressContract(locationId){
 const active=state.activities.contract;if(!active)return false;
 const c=CONTRACTS.find(c=>c.id===active.id);if(c.stops[active.step]!==locationId)return false;
 if(active.step===c.stops.length-1&&state.heat>0){toast('Lose the police search before completing this job.');return true;}
 if(c.faction==='dockside'&&active.step===0)emergency.report(2,outside(),state);
 active.step++;
 if(active.step===c.stops.length){const result=completeContract(state);audio.play('success');toast(`${c.name} complete · Rs. ${result.reward} · ${FACTIONS[c.faction].name} influence increased.`);}
 else{audio.play('ui');toast(`${c.verbs[active.step-1]} · complete. Next: ${c.verbs[active.step].toLowerCase()}.`);}
 state.waypoint=null;saveGame();return true;
}
function cycleCamera(){state.cameraMode=['top','shoulder','first'][(['top','shoulder','first'].indexOf(state.cameraMode)+1)%3];cutscene=1;toast(`${state.cameraMode==='top'?'Elevated':state.cameraMode==='shoulder'?'Shoulder':'First-person'} view. ${state.cameraMode==='top'?'Q rotates the view.':'Move the mouse to look around. V changes view.'}`);}
$('phone-button').onclick=()=>openPhone();$('camera-button').onclick=cycleCamera;
function encounterTarget(){
 const q=state.activities.encounter;if(q.stage==='evidence')return {...world.buildings.find(b=>b.id==='harbor').door,name:'Harbor wages ledger'};
 if(q.stage==='deliver')return LOCATIONS.find(l=>l.id===LEDGER_OUTCOMES[q.choice]?.location);
 const p=population.people.find(p=>p.id===(q.stage==='witness'?'resident-20':'resident-3'));
 if(!p||p.dead)return null;if(p.removed)return LOCATIONS.find(l=>l.id==='clinic');
 return {...(p.inside?world.buildings.find(b=>b.id===p.inside)?.door:p),name:p.name};
}
function trackedTarget(){
 if(jobs.active)return jobs.target();
 if(state.race)return raceTarget(state.race);if(state.waypoint)return state.waypoint;
 if(state.activities.encounter.tracking&&state.activities.encounter.stage!=='resolved')return encounterTarget();
 if(state.heist.stage==='escape')return LOCATIONS.find(l=>l.id==='harbor');
 if(['planned','cased','opening'].includes(state.heist.stage))return LOCATIONS.find(l=>l.id==='bank');
 if(state.activities.contract){const a=state.activities.contract,c=CONTRACTS.find(c=>c.id===a.id);return LOCATIONS.find(l=>l.id===c.stops[a.step]);}
 if(state.errand)return LOCATIONS.find(l=>l.id===state.errand.target);
 const id=state.mission==='delivery'?'temple':campaignTarget(state)||'tea';return LOCATIONS.find(l=>l.id===id);
}
$('track-button').onclick=()=>{state.waypoint=null;toast('Following your current objective on the map.');};
function mapState(){return {...state,...outside(),heading:state.heading,mapPeople:[...footPolice.people.filter(p=>!p.dead).map(p=>({x:p.x,z:p.z,police:true})),...population.people.filter(p=>state.crew.includes(p.id)).map(p=>({x:p.x,z:p.z,crew:true})),...wildlife.animals.filter(p=>!p.dead&&p.type==='boar').map(p=>({x:p.x,z:p.z,animal:true}))],roomMap:interiors.active?{solids:interiors.active.solids,items:interiors.active.items,x:state.x,z:state.z}:null};}
function refreshMapRoute(force=false){const t=trackedTarget();if(!t){state.mapRoute=[];return;}if(force||state.elapsed>(state.mapRouteAt||0)){state.mapRoute=state.interior?[]:state.driving?emergency.navigator.laneRoute(state,t,2.5):navigator.route(state,t,.6);state.mapRouteAt=state.elapsed+4;}}
function openMap(){
 refreshMapRoute(true);
 showModal(`<h2>Your city, at a glance.</h2><div class="map-tools"><input id="map-search" placeholder="Find a place…" aria-label="Find a place"><button id="map-minus" class="secondary" aria-label="Zoom out">−</button><button id="map-plus" class="secondary" aria-label="Zoom in">+</button><button id="map-center" class="secondary">CENTER</button></div><div id="map-results" class="map-results"></div><div class="map-filters">${['services','people','vehicles'].map(k=>`<label><input type="checkbox" data-map-filter="${k}" ${state.mapFilters[k]?'checked':''}>${k}</label>`).join('')}</div><canvas id="big-map" class="big-map" width="720" height="820" aria-label="City map. Drag to pan, scroll or use buttons to zoom. Search for a destination."></canvas><div class="map-legend"><span>G guns · + hospital · H home</span><span>A aircraft · C club · V vehicles</span><span>P walking police · ● companions</span><span>★ objective · burgundy route</span></div><div class="settings-footer"><button id="clear-waypoint" class="secondary">CLEAR PIN</button><button id="map-close" class="primary">BACK TO CITY</button></div>`,'map');
 const map=$('big-map'),draw=()=>drawMap(map,mapState(),world,vehicles.cars,trackedTarget(),true),zoom=n=>{state.mapZoom=clamp(state.mapZoom*n,.8,4);draw();};draw();$('map-plus').onclick=()=>zoom(1.3);$('map-minus').onclick=()=>zoom(1/1.3);$('map-center').onclick=()=>{state.mapCenter={x:outside().x,z:outside().z};draw();};
 document.querySelectorAll('[data-map-filter]').forEach(b=>b.onchange=()=>{state.mapFilters[b.dataset.mapFilter]=b.checked;draw();});
 $('map-search').oninput=()=>{const query=$('map-search').value.trim().toLowerCase(),found=query?[...LOCATIONS,...world.buildings.map(b=>({...b.door,name:b.name}))].filter((p,i,all)=>p.name.toLowerCase().includes(query)&&all.findIndex(a=>a.name===p.name)===i).slice(0,6):[];$('map-results').innerHTML=found.map((p,i)=>`<button data-place="${i}">${esc(p.name)}</button>`).join('');document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{const p=found[Number(b.dataset.place)];state.waypoint={x:p.x,z:p.z,name:p.name};state.mapCenter={x:p.x,z:p.z};state.mapRouteAt=0;refreshMapRoute(true);draw();});};
 let drag=null,moved=false;map.onpointerdown=e=>{map.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};moved=false;};map.onpointermove=e=>{if(!drag)return;const r=map.getBoundingClientRect(),p=mapProjection(map,mapState(),true),dx=e.clientX-drag.x,dz=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dz)>2)moved=true;state.mapCenter={x:clamp(p.cx-dx*map.width/r.width/p.scale,BOUNDS.minX,BOUNDS.maxX),z:clamp(p.cz-dz*map.height/r.height/p.scale,BOUNDS.minZ,BOUNDS.maxZ)};drag={x:e.clientX,y:e.clientY};draw();};map.onpointerup=()=>drag=null;map.onpointercancel=()=>drag=null;
 map.onclick=e=>{if(moved)return;const r=map.getBoundingClientRect(),p=mapProjection(map,mapState(),true);let point={x:clamp(((e.clientX-r.left)*map.width/r.width-p.w/2)/p.scale+p.cx,BOUNDS.minX+3,BOUNDS.maxX-3),z:clamp(((e.clientY-r.top)*map.height/r.height-p.h/2)/p.scale+p.cz,BOUNDS.minZ+3,BOUNDS.maxZ-3)};if(collision.blocked(point.x,point.z,.7)){const door=world.buildings.map(b=>({...b.door,name:b.name})).sort((a,b)=>distance(a,point)-distance(b,point))[0];if(distance(door,point)<28)point=door;else{toast('Choose a reachable road, path or building entrance.');return;}}state.waypoint=point;state.mapRouteAt=0;refreshMapRoute(true);draw();toast('Destination pinned.');};map.onwheel=e=>{e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15);};
 $('clear-waypoint').onclick=()=>{state.waypoint=null;state.mapRouteAt=0;refreshMapRoute(true);draw();};$('map-close').onclick=closeModal;
}
$('map-button').onclick=openMap;$('expand-map').onclick=openMap;
function journal(){
 const contacts=population.people.filter(p=>p.met),story=CAMPAIGN[state.campaign];
 showModal(`<h2>Your life in Maya.</h2><div class="journal-summary"><span>PUBLIC REP <b>${state.reputation}</b></span><span>DELIVERIES <b>${state.deliveries}</b></span><span>PLACES <b>${state.discoveries.length}</b></span></div><h3>${story?esc(story.title):'After the monsoon · complete'}</h3><p>${story?esc(story.description):`You chose ${state.choice==='harbor'?'the harbor union':'the community'}. The story is complete; the city and its jobs remain open.`}</p><button id="city-jobs" class="primary">CITY JOBS & CONTACTS</button><button id="crew-manage" class="secondary">YOUR CREW · ${state.crew.length}/3</button><button id="activity-board" class="secondary">FACTION JOBS & DISTRICTS</button><h3>Relationships</h3><p>Community ${state.factions.community} · Harbor union ${state.factions.harbor} · Police ${state.factions.police} · Dockside Crew ${state.factions.dockside}</p><h3>Properties & businesses</h3><p>${state.properties.length?state.properties.map(id=>PROPERTY_DATA.find(p=>p.id===id)?.name).join(' · '):'Meet Amma, the harbor union, or visit Mistwood to invest.'}</p><h3>People you know · ${contacts.length}/${population.people.length}</h3><div class="contact-list">${contacts.map(p=>`<article><strong>${esc(p.name)}</strong><span>${esc(p.job)} · ${p.dead?'Deceased':p.injured?'Awaiting medical care':p.removed?'Recovering at hospital':esc(p.routine.replace('-',' '))}</span><p>${esc(p.story)}</p><small>Relationship ${p.relationship}${p.helped?' · Favor completed':''}</small></article>`).join('')||'<p>Talk to a neighbor to start your contact book.</p>'}</div><div class="settings-footer"><button id="journal-close" class="primary">BACK TO CITY</button></div>`,'journal');$('journal-close').onclick=closeModal;$('activity-board').onclick=activityBoard;$('city-jobs').onclick=cityJobBoard;$('crew-manage').onclick=crewMenu;
}
$('journal-button').onclick=journal;$('equipment-button').onclick=equipmentMenu;
function finishLedger(locationId){
 const q=state.activities.encounter;if(q.stage!=='deliver'||LEDGER_OUTCOMES[q.choice]?.location!==locationId)return false;
 if(state.heat>0){toast('Lose the police search before handing over the ledger.');return true;}
 const outcome=resolveLedger(state,population.people,locationId);if(!outcome)return false;
 showModal(`<h2>The wages ledger.</h2><p class="dialogue-quote">${outcome.text}</p><p>Rs. ${outcome.reward} paid. Relationships and harbor influence have changed.</p><button id="ledger-done" class="primary">RETURN TO CITY</button>`,'encounter');$('ledger-done').onclick=closeModal;state.waypoint=null;saveGame();audio.play('success');return true;
}
function ledgerConversation(person){
 const q=state.activities.encounter;
 if(person.id==='resident-3'&&q.stage==='deliver'){finishLedger('harbor');return;}
 if(person.id==='resident-3'&&q.stage==='available'){
  showModal(`<div class="dialogue-name">RAVI JAYAWARDENA · HARBOR UNION</div><h2>Someone kept a second ledger.</h2><p class="dialogue-quote">“The manifest told us what was shipped. It never told us why the workers were paid less. Deepa kept a second ledger, sealed in the warehouse. Bring it to her before anyone decides it was a mistake.”</p><p>${esc(person.story)}</p><div class="settings-footer"><button id="ledger-accept" class="primary">I WILL FIND IT</button><button id="ledger-leave" class="secondary">NOT NOW</button></div>`,'encounter');
  $('ledger-accept').onclick=()=>{q.stage='evidence';q.tracking=true;state.waypoint=null;closeModal();saveGame();};$('ledger-leave').onclick=closeModal;return;
 }
 if(person.id==='resident-20'&&q.stage==='witness'){
  showModal(`<div class="dialogue-name">DEEPA GUNARATNE · HARBOR ACCOUNTANT</div><h2>Whose name goes on the record?</h2><p class="dialogue-quote">“These are the payments I was asked to erase. Ravi wants them posted in the yard. Chamara can open a case. The crew will pay to keep them quiet. I have a family here. Tell me where this is going.”</p><p>${esc(person.story)}</p><div class="activity-grid">${Object.entries(LEDGER_OUTCOMES).map(([id,o])=>`<article><h3>${o.name}</h3><p>${id==='union'?'Support the workers publicly. The union and community gain trust.':id==='police'?'Create a formal complaint. City Watch gains influence; Ravi is wary of the delay.':'Take the larger payment. Deepa and Ravi lose trust, and the crew gains influence.'}</p><button class="primary" data-ledger-choice="${id}">${o.name.toUpperCase()}</button></article>`).join('')}</div>`,'encounter');
  document.querySelectorAll('[data-ledger-choice]').forEach(b=>b.onclick=()=>{q.choice=b.dataset.ledgerChoice;q.stage='deliver';q.tracking=true;state.waypoint=null;closeModal();saveGame();toast('Decision made. Deliver the original ledger to the marked contact.');});
 }
}
function talk(person){
 conversationPerson=person; person.met=true;person.stun=1;
 const hostile=person.relationship<0,quote=hostile?'I remember what happened. I do not feel safe talking to you.':person.dialogue;
 showModal(`<div class="dialogue-name">${esc(person.job.toUpperCase())} · AGE ${person.age}</div><h2>${esc(person.name)}</h2><p class="dialogue-quote">“${esc(quote)}”</p><p>${esc(person.story)}</p><p>Today: ${esc(person.routine.replace('-',' '))} · ${person.outfit==='work'?'Work clothes':'Everyday clothes'} · Relationship ${person.relationship}</p><div class="settings-footer">${!hostile&&encounterSpeaker(person,state)?'<button id="ledger-talk" class="primary">THE WAGES LEDGER</button>':''}${!hostile&&!person.police&&population.people.includes(person)&&!state.errand?'<button id="ask-favor" class="primary">CAN I HELP?</button>':''}${canRecruit(person,state.crew)?'<button id="recruit-person" class="primary">COME WITH ME</button>':''}${!hostile&&population.people.includes(person)&&!phone.data.contacts.includes(person.id)?'<button id="exchange-number" class="secondary">EXCHANGE NUMBERS</button>':''}<button id="say-goodbye" class="secondary">TAKE CARE</button></div>`,'dialogue');
 if($('exchange-number'))$('exchange-number').onclick=()=>{if(phone.add(person)){person.relationship=clamp(person.relationship+5,-100,100);stage.exchange('Number saved · '+phoneNumber(person.id));saveGame();$('exchange-number').textContent=phoneNumber(person.id);$('exchange-number').disabled=true;}};
 if($('ledger-talk'))$('ledger-talk').onclick=()=>ledgerConversation(person);
 if($('recruit-person'))$('recruit-person').onclick=()=>{person.inside=null;person.x=outside().x+2;person.z=outside().z+2;state.crew.push(person.id);closeModal();saveGame();toast(person.name+' joined your crew.');};
 if($('ask-favor'))$('ask-favor').onclick=()=>{
  const options=[person.errand,'temple','garage','tea'].filter(id=>LOCATIONS.some(l=>l.id===id));const target=LOCATIONS.find(l=>l.id===options[(person.helpCount||0)%options.length]);
  showModal(`<h2>A favor for ${esc(person.name.split(' ')[0])}.</h2><p class="dialogue-quote">“Could you take this parcel to ${esc(target.name)}? I cannot leave ${person.outfit==='work'?'my shift':'the neighborhood'} right now.”</p><p>Reward: Rs. 350 and a stronger relationship. Press E at the destination marker.</p><div class="settings-footer"><button id="accept-favor" class="primary">I’LL TAKE IT</button><button id="leave-favor" class="secondary">ANOTHER TIME</button></div>`,'dialogue');
  $('accept-favor').onclick=()=>{state.errand={id:person.id,target:target.id};state.waypoint=null;closeModal();saveGame();toast(`${person.name}'s parcel collected. Deliver it to ${target.name}.`);};$('leave-favor').onclick=closeModal;
 };
 $('say-goodbye').onclick=()=>{person.relationship=clamp(person.relationship+1,-100,100);closeModal();saveGame();};
}
function weaponsShop(){
 showModal(`<div class="dialogue-name">FERNANDO SPORTING GOODS</div><h2>Equipment counter.</h2><p>Your apartment also contains a free starter pistol and ammunition. Purchased ammunition is added to your inventory; press R to reload.</p><div class="shop-grid"><button id="buy-pistol"><strong>Service pistol</strong><span>12-round magazine · 36 rounds included</span><b>Rs. 800</b></button><button id="buy-rifle"><strong>Carbine</strong><span>30-round magazine · 90 rounds included</span><b>Rs. 1,800</b></button><button id="buy-bazooka"><strong>Shoulder launcher</strong><span>3 rockets included · finite ammunition</span><b>Rs. 1,800</b></button><button id="buy-rockets"><strong>3 rockets</strong><span>Up to 12 carried</span><b>Rs. 900</b></button><button id="buy-kit"><strong>Mechanic’s toolkit</strong><span>Required for the optional vault job</span><b>Rs. 400</b></button><button id="buy-ammo"><strong>Ammunition pack</strong><span>24 pistol + 60 carbine rounds</span><b>Rs. 250</b></button></div><p>1: unarmed · 2: pistol · 3: carbine · 4: launcher · R: reload</p><button id="shop-close" class="secondary">LEAVE COUNTER</button>`,'shop');
 const buy=(type,price)=>{if(state.money<price){toast('You do not have enough money. Deliveries and favors pay for equipment.');return;}state.money-=price;if(type==='ammo'){state.inventory.pistolAmmo=Math.min(300,state.inventory.pistolAmmo+24);state.inventory.rifleAmmo=Math.min(600,state.inventory.rifleAmmo+60);}else{state.inventory[type]=true;state.inventory[type+'Ammo']+=type==='pistol'?36:90;combat.clips[type]=WEAPONS[type].magazine;combat.equip(type,state);}audio.play('success');saveGame();toast('Equipment purchased.');};
 $('buy-bazooka').onclick=()=>{if(state.inventory.bazooka){toast('Launcher already owned.');return;}if(state.money<1800){toast('The launcher costs Rs. 1,800.');return;}state.money-=1800;state.inventory.bazooka=true;state.inventory.missile=Math.min(12,state.inventory.missile+3);combat.equip('bazooka',state);saveGame();toast('Launcher and three rockets purchased.');};
 $('buy-rockets').onclick=()=>{if(state.money<900||state.inventory.missile>=12){toast('Insufficient cash or rocket capacity reached.');return;}state.money-=900;state.inventory.missile=Math.min(12,state.inventory.missile+3);saveGame();toast('Rockets purchased.');};
 $('buy-kit').onclick=()=>{if(state.heist.kit){toast('You already have the toolkit.');return;}if(state.money<400){toast('The toolkit costs Rs. 400.');return;}state.money-=400;state.heist.kit=true;saveGame();toast('Toolkit purchased.');};
 $('buy-pistol').onclick=()=>buy('pistol',800);$('buy-rifle').onclick=()=>buy('rifle',1800);$('buy-ammo').onclick=()=>buy('ammo',250);$('shop-close').onclick=closeModal;
}
function propertyMenu(location){
 const property=PROPERTY_DATA.find(p=>p.location===location);if(!property)return;
 const owned=state.properties.includes(property.id);
 showModal(`<h2>${esc(property.name)}</h2><p>${property.income?`Pays Rs. ${property.income} every two minutes of active play.`:'A northern home where you can rest and save.'}</p><p>${owned?'You own this property.':`Purchase price: Rs. ${property.price.toLocaleString()}`}</p><div class="settings-footer">${owned?'':'<button id="buy-property" class="primary">PURCHASE</button>'}<button id="property-close" class="secondary">BACK</button></div>`,'property');
 if($('buy-property'))$('buy-property').onclick=()=>{if(state.money<property.price){toast('Not enough money for this property yet.');return;}state.money-=property.price;state.properties.push(property.id);saveGame();audio.play('success');closeModal();toast(`${property.name} is now yours.`);};$('property-close').onclick=closeModal;
}
function advanceStory(){state.campaign=Math.min(6,state.campaign+1);state.waypoint=null;state.money+=400;audio.play('success');saveGame();toast(state.campaign===6?'After the monsoon · story complete. Your life in Maya continues.':`Chapter complete · +Rs. 400 · ${CAMPAIGN[state.campaign].title}`);}
function storyInteraction(location){
 if(state.campaign===1&&location==='clinic'){showModal(`<div class="dialogue-name">MAYA GENERAL HOSPITAL</div><h2>A city takes care of its own.</h2><p class="dialogue-quote">“Amma never forgets us. Take our thanks to the community hall. Ruwani needs someone who can move between the neighborhoods.”</p><button id="story-next" class="primary">DELIVER THE CONTRIBUTION</button>`,'story');$('story-next').onclick=()=>{state.factions.community+=5;advanceStory();closeModal();};return true;}
 if(state.campaign===2&&location==='village'){
  showModal(`<div class="dialogue-name">RUWANI · COMMUNITY ORGANIZER</div><h2>Two sides of the island.</h2><p>Harbor wages have disappeared from the books. The community wants a public record; the union wants to resolve it privately. Both need the original manifest inside the South Harbor Union warehouse.</p><div class="settings-footer"><button id="choose-community" class="primary">WORK WITH THE COMMUNITY</button><button id="choose-harbor" class="secondary">WORK WITH THE UNION</button></div>`,'story');
  for(const choice of ['community','harbor'])$('choose-'+choice).onclick=()=>{state.choice=choice;state.factions[choice]+=8;advanceStory();closeModal();};return true;
 }
 if(state.campaign===3&&location==='harbor'){toast('Enter the South Harbor Union warehouse. The manifest is on the rear workbench.');return true;}
 if(state.campaign===4&&location===(state.choice==='harbor'?'harbor':'village')){
  showModal(`<h2>${state.choice==='harbor'?'An agreement at the docks.':'The books belong to everyone.'}</h2><p>${state.choice==='harbor'?'The union uses the manifest to recover the unpaid wages quietly. Ravi promises you a place at the harbor, but the community is disappointed the record stays private.':'The community publishes the missing records. Workers recover their wages, and Ruwani asks you to meet the neighbors at Mistwood when the rain clears.'}</p><button id="story-next" class="primary">HAND OVER THE MANIFEST</button>`,'story');$('story-next').onclick=()=>{state.factions[state.choice]+=15;state.factions[state.choice==='harbor'?'community':'harbor']-=5;advanceStory();closeModal();};return true;
 }
 if(state.campaign===5&&location==='outlook'){
  showModal(`<div class="dialogue-name">AFTER THE MONSOON</div><h2>A place in the city.</h2><p class="dialogue-quote">“You arrived without a name anyone knew. Now there are people who look for you when they need help. Stay. There is more to do.”</p><p>${state.choice==='harbor'?'The harbor union offers you steady work and the chance to invest in a warehouse.':'The community celebrates your help. Amma offers you a partnership at the tea stop.'} The island remains open: make friends, buy a home, build a business, race, or explore.</p><button id="finish-story" class="primary">THIS IS HOME</button>`,'story');$('finish-story').onclick=()=>{state.money+=1500;state.reputation=clamp(state.reputation+15,0,100);advanceStory();closeModal();};return true;
 }
 return false;
}
function bankJob(){
 showModal(`<div class="dialogue-name">OPTIONAL · DOCKSIDE CREW</div><h2>The vault job.</h2><p>The crew offers Rs. 4,000 for a recovered vault bag. This is separate from the main story.</p><p>1. Study the floor plan inside the bank.<br>2. Buy a toolkit at Fernando Sporting Goods.<br>3. Park an escape vehicle near the bank.<br>4. Open the vault, escape the police, and deliver the bag at South Harbor.</p><p>Status: ${esc(state.heist.stage)} · Toolkit ${state.heist.kit?'ready':'needed'}</p><div class="settings-footer"><button id="plan-heist" class="primary">${state.heist.stage==='complete'?'PLAN ANOTHER JOB':'PLAN THE JOB'}</button><button id="leave-heist" class="secondary">LEAVE</button></div>`,'heist');
 $('plan-heist').onclick=()=>{if(['idle','complete'].includes(state.heist.stage))state.heist.stage='planned';state.waypoint={...world.buildings.find(b=>b.id==='bank').door};closeModal();saveGame();toast('Bank entrance marked. Enter and inspect the lobby floor plan.');};$('leave-heist').onclick=closeModal;
}
function useOrdnance(kind){if(!state.started||state.paused||state.death||state.transition||state.driving)return;if(!ordnance.launch(kind,state,aim,activeScene(),activeCollision()))toast(`No ${kind} available, or equipment is cooling down.`);else saveGame();}
function cityJobBoard(){
 showModal(`<h2>Calls around the city.</h2>${jobs.active?`<p>Active: ${esc(CITY_JOBS[jobs.active.id].name)} · ${Math.ceil(jobs.active.time)} seconds left.</p><button id="cancel-city-job" class="secondary">CANCEL CURRENT JOB</button>`:''}<div class="activity-grid">${Object.entries(CITY_JOBS).map(([id,j])=>`<article><span class="dialogue-name">${j.contact}</span><h3>${j.name}</h3><p>${j.brief}</p><small>${j.vehicle==='foot'?'On foot':j.vehicle==='ambulance'?'Ambulance required':'Road vehicle required'} · ${j.seconds}s · Rs. ${j.reward} + time bonus · completed ${state.jobRecords[id]||0}</small><button class="primary" data-city-job="${id}" ${jobs.active?'disabled':''}>TAKE THE CALL</button></article>`).join('')}</div>`,'city-jobs');
 if($('cancel-city-job'))$('cancel-city-job').onclick=()=>{jobs.stop();cityJobBoard();};document.querySelectorAll('[data-city-job]').forEach(b=>b.onclick=()=>{if(jobs.start(b.dataset.cityJob,state)){state.waypoint=null;closeModal();toast(CITY_JOBS[b.dataset.cityJob].name+' · '+jobs.target().name);}});
}
function crewMenu(){showModal(`<h2>Your crew · ${state.crew.length}/3</h2><p>Help a resident with three favors and build at least 30 relationship points. Ask them to come with you. Companions follow on foot, share a car and defend you from active threats.</p>${state.crew.map(id=>{const p=population.people.find(p=>p.id===id);return `<article class="crew-card"><strong>${esc(p?.name||id)}</strong><p>Health ${Math.round(p?.health||0)} · ${p?.following?'Following':'Meet them outside'}</p><button class="secondary" data-dismiss="${id}">GO HOME</button></article>`;}).join('')||'<p>No companions yet. Keep helping your neighbors.</p>'}`,'crew');document.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>{state.crew=state.crew.filter(id=>id!==b.dataset.dismiss);saveGame();crewMenu();});}
function clubLounge(){if(!canEnterClub(state.profile)){toast('Club access requires age 18 or over.');return;}showModal(`<h2>Ceylon Social · lounge</h2><p>Music, drinks and company. Performances begin at 18:00.</p><div class="shop-grid"><button data-drink="soft"><strong>Lime soda</strong><b>Rs. 25</b></button><button data-drink="beer"><strong>Beer</strong><b>Rs. 60</b></button><button data-drink="cocktail"><strong>Monsoon cocktail</strong><b>Rs. 120</b></button><button id="lounge-dance"><strong>Seated lounge dance</strong><span>An adult performer joins your table for a short, fully clothed dance.</span><b>Rs. 150</b></button></div>`,'club-lounge');document.querySelectorAll('[data-drink]').forEach(b=>b.onclick=()=>{const type=b.dataset.drink,cost={soft:25,beer:60,cocktail:120}[type];if(state.money<cost){toast('Not enough cash.');return;}state.money-=cost;state.intoxication=type==='soft'?Math.max(0,state.intoxication-25):Math.min(120,state.intoxication+(type==='beer'?45:75));closeModal();react(player,'drink',state.elapsed);audio.play('ui');saveGame();toast(type==='soft'?'A cool lime soda.':'Drink served. Your movement is less steady for a while.');});$('lounge-dance').onclick=()=>{if(state.hour<18&&state.hour>=4){toast('Performances begin at 18:00.');return;}if(state.money<150){toast('Not enough cash.');return;}state.money-=150;state.loungeUntil=state.elapsed+12;state.loungeSeated=true;combat.equip('fists',state);closeModal();saveGame();};}
function equipmentMenu(){
 showModal(`<h2>Field equipment</h2><p>G · grenade / T · place C4 / Y · detonate / L · missile<br>X · jetpack / K · parachute / Space · ascend / Ctrl · descend</p><div class="shop-grid">${Object.keys(ORDNANCE).map(k=>`<button data-equip="${k}"><strong>${k.toUpperCase()} · ${state.inventory[k]}</strong><span>Use equipped ordnance</span></button>`).join('')}<button id="equip-pack">${state.flightMode==='jetpack'?'DISABLE':'ENABLE'} JETPACK</button><button id="equip-chute">DEPLOY PARACHUTE</button><button id="equip-detonate">DETONATE C4</button><button id="equipment-cheats">SANDBOX CHEATS</button></div>`,'equipment');
 document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{closeModal();useOrdnance(b.dataset.equip);});$('equip-pack').onclick=()=>{closeModal();if(!flight.jetpack(state))toast('Jetpack unavailable. Visit the depot.');};$('equip-chute').onclick=()=>{closeModal();flight.parachute(state);};$('equip-detonate').onclick=()=>{closeModal();ordnance.detonate(state);};$('equipment-cheats').onclick=cheatMenu;
}
function applyCheat(code){code=code.trim().toUpperCase();if(code==='RUNFAST'){state.runBoost=state.runBoost===1?2.5:1;}else if(code==='SKYHIGH'){state.inventory.jetpack=true;state.inventory.parachute=true;state.cheats.fly=!state.cheats.fly;state.fuel=100;if(!state.flightMode)flight.jetpack(state);}else if(code==='ARMORY'){state.inventory.pistol=state.inventory.rifle=state.inventory.bazooka=true;state.inventory.pistolAmmo=300;state.inventory.rifleAmmo=600;state.inventory.grenade=12;state.inventory.c4=6;state.inventory.missile=12;combat.equip('pistol',state);combat.reload(state);}else if(code==='AIRFLEET'){state.ownedAir=['helicopter','plane'];state.waypoint={x:7,z:-282,name:'Air depot'};}else if(code==='HOPUP'){state.cheats.superJump=!state.cheats.superJump;}else if(code==='SQUAD'){for(const p of population.people.slice(6,9)){if(p.vehicle)occupants.eject(p.vehicle,state);p.inside=null;p.x=outside().x+3;p.z=outside().z;p.helpCount=3;p.relationship=60;}state.crew=population.people.slice(6,9).map(p=>p.id);}else if(code==='TEMPEST'){state.weatherMode='tornado';}else if(code==='POCKETS'){state.money+=10000;}else if(code==='PEACE'){state.heat=0;emergency.lastKnown=null;}else if(code==='ARMOR'){state.cheats.invincible=!state.cheats.invincible;}else return false;return true;}
function cheatMenu(){showModal(`<h2>Sandbox codes</h2><p>RUNFAST · fast running<br>HOPUP · high jumps<br>SQUAD · trusted companions<br>TEMPEST · tornado event<br>SKYHIGH · jetpack and unlimited fuel<br>AIRFLEET · aircraft access<br>ARMORY · weapons, explosives and missiles<br>POCKETS · Rs. 10,000<br>PEACE · clear wanted level<br>ARMOR · toggle invulnerability</p><p>Movement modifiers last for this session. Equipment and cash save normally.</p><label class="settings-row">Code<input id="cheat-code" autocomplete="off" maxlength="24"></label><button id="apply-cheat" class="primary">APPLY CODE</button>`,'cheats');$('apply-cheat').onclick=()=>{const code=$('cheat-code').value;if(applyCheat(code)){closeModal();saveGame();toast(code.toUpperCase()+' applied.');}else toast('Unknown code.');};$('cheat-code').onkeydown=e=>{if(e.key==='Enter')$('apply-cheat').click();};}
function depotMenu(){
 const stock=[['bazooka','Shoulder launcher',1800],['jetpack','Jetpack',1400],['parachute','Parachute',180],['grenade','Grenade',180],['c4','Remote charge',350],['missile','Missile',300],['fuel','Jetpack fuel refill',60]];
 showModal(`<h2>Air & cycle depot</h2><p>Aircraft are parked along the north road. Space climbs; Ctrl descends. Planes need forward speed to lift off. Land before exiting, or use K with a parachute.</p><div class="shop-grid">${Object.entries(AIRCRAFT).map(([id,a])=>`<button data-air="${id}"><strong>${a.name}</strong><b>${state.ownedAir.includes(id)?'LOCATE':`CHARTER · Rs. ${a.price}`}</b></button>`).join('')}${stock.map(([id,name,price])=>`<button data-gear="${id}"><strong>${name}</strong><b>Rs. ${price}</b></button>`).join('')}<button id="cycle-shop">BICYCLES, MOTORCYCLES & ROAD VEHICLES</button></div>`,'depot');
 document.querySelectorAll('[data-air]').forEach(b=>b.onclick=()=>{const kind=b.dataset.air;if(!state.ownedAir.includes(kind)){if(state.money<AIRCRAFT[kind].price){toast('Not enough cash.');return;}state.money-=AIRCRAFT[kind].price;state.ownedAir.push(kind);}const c=flight.craft.find(c=>c.kind===kind);if(c.health<=0){c.health=100;c.x=0;c.z=kind==='plane'?-306:-264;c.altitude=0;c.mesh.position.set(c.x,.35,c.z);c.mesh.rotation.z=0;}state.waypoint={x:c.x,z:c.z,name:c.spec.name};closeModal();saveGame();toast('Aircraft marked. Press F beside it.');});
 document.querySelectorAll('[data-gear]').forEach(b=>b.onclick=()=>{const [id,,price]=stock.find(v=>v[0]===b.dataset.gear),cap=id==='c4'?6:12;if((id==='jetpack'||id==='parachute'||id==='bazooka')&&state.inventory[id]){toast('Already owned.');return;}if(ORDNANCE[id]&&state.inventory[id]>=cap){toast('Equipment capacity reached.');return;}if(state.money<price){toast('Not enough cash.');return;}state.money-=price;if(id==='fuel')state.fuel=100;else if(ORDNANCE[id])state.inventory[id]++;else state.inventory[id]=true;saveGame();toast('Equipment purchased.');});$('cycle-shop').onclick=vehicleShop;
}
function openPhone(view='home'){state.jobActive=!!jobs.active;phoneUI.open(view);}
function clothingShop(selected='arrival'){
 showModal(`<h2>Lotus Threads</h2><p>Try a look on the mannequin. Purchased outfits stay in your wardrobe.</p><div class="shop-grid">${Object.entries(OUTFITS).map(([id,o])=>`<button data-outfit="${id}"><i class="cloth-swatch" style="background:${o.color}"></i><strong>${o.name}</strong><b>${state.wardrobe.owned.includes(id)?state.wardrobe.equipped===id?'WEARING':'WEAR':'BUY & WEAR · Rs. '+o.price}</b></button>`).join('')}</div>`,'wardrobe');stage.preview('outfit:'+selected);document.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{const id=b.dataset.outfit;if(!buyOutfit(state,id)){toast('Not enough cash for that outfit.');return;}wear(player,state.wardrobe);if(state.driving)wear(state.driving.mesh.userData.driver,state.wardrobe);wear(stage.buyer,state.wardrobe);stage.preview('outfit:'+id);stage.exchange('Your new look · '+OUTFITS[id].name);saveGame();document.querySelectorAll('[data-outfit]').forEach(button=>button.querySelector('b').textContent=state.wardrobe.equipped===button.dataset.outfit?'WEARING':state.wardrobe.owned.includes(button.dataset.outfit)?'WEAR':'BUY & WEAR · Rs. '+OUTFITS[button.dataset.outfit].price);});
}
function foodShop(selected='tea'){
 if(!['tea','roll','rice'].includes(selected))selected='tea';
 const foods=[{id:'tea',name:'Ginger tea',price:25,health:12,stamina:40},{id:'roll',name:'Vegetable rolls',price:45,health:30,stamina:20},{id:'rice',name:'Rice & curry',price:90,health:75,stamina:100}];
 showModal(`<h2>Amma’s kitchen</h2><div class="shop-grid">${foods.map(f=>`<button data-food="${f.id}"><strong>${f.name}</strong><span>+${f.health} health · +${f.stamina} stamina</span><b>Rs. ${f.price}</b></button>`).join('')}</div>`,'food');
 stage.preview('food:'+selected);document.querySelectorAll('[data-food]').forEach(b=>b.onclick=()=>{const f=foods.find(f=>f.id===b.dataset.food);if(state.money<f.price){toast('Not enough cash.');return;}state.money-=f.price;state.health=clamp(state.health+f.health,0,100);state.stamina=clamp(state.stamina+f.stamina,0,100);saveGame();audio.play('success');closeModal();});
}
function vehicleShop(){
 showModal(`<h2>De Silva Motors</h2><p>Delivery to a clear bay outside the workshop.</p>${state.driving?'<button id="repair-car" class="secondary">REPAIR · Rs. 150</button>':''}<div class="shop-grid">${Object.entries(VEHICLE_SPECS).map(([id,v])=>`<button data-car="${id}"><strong>${v.name}</strong><span>${Math.round(v.maxSpeed*3.6)} km/h · ${v.mass} kg · acceleration ${v.acceleration} m/s²</span><b>Rs. ${v.price.toLocaleString()}</b></button>`).join('')}</div>`,'vehicles');
 if($('repair-car'))$('repair-car').onclick=()=>{if(state.money<150){toast('Repairs cost Rs. 150.');return;}state.money-=150;vehicles.repair(state.driving);saveGame();closeModal();audio.play('success');};
 document.querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>{
  const model=b.dataset.car,spec=VEHICLE_SPECS[model];if(state.money<spec.price){toast('Not enough cash.');return;}
  if(vehicles.cars.filter(c=>c.owned).length>=24){toast('Your garage is full.');return;}
  const spots=Array.from({length:16},(_,i)=>({x:i<8?103:55,z:55+(i%8)*8})),spot=spots.find(p=>!vehicleBlocked(collision,p.x,p.z,0,spec)&&vehicles.cars.every(c=>c.kind==='removed'||distance(c,p)>Math.max(6,(spec.length+c.spec.length)/2+.6)));
  if(!spot){toast('Delivery bays are occupied. Clear a bay and try again.');return;}
  const car=vehicles.add(spot.x,spot.z,['#b45350','#92b9b1','#e5ca8e','#6c819c'][vehicles.counter%4],0,'parked',{model});car.mesh.userData.driver.visible=false;state.money-=spec.price;state.waypoint={...spot,name:spec.name};saveGame();closeModal();audio.play('success');toast(`${spec.name} delivered. Follow the marker.`);
 });
}
function useLocation(loc){
 if(finishLedger(loc.id))return;
 if(progressContract(loc.id))return;
 if(loc.id==='depot'){depotMenu();return;}
 if(loc.id==='club'){if(!canEnterClub(state.profile)){toast('Ceylon Social is for guests aged 18 and over.');return;}if(!state.driving&&interiors.enter(world.buildings.find(b=>b.id==='club'),state,player)){cutscene=1;toast('Ceylon Social · dancing 18:00–04:00');}return;}
 if(loc.id==='bank'){bankJob();return;}
 if(loc.id==='harbor'&&state.heist.stage==='escape'){
  if(state.heat>0){toast('Lose the police before delivering the vault cash.');return;}
  state.money+=4000;state.heist.stage='complete';state.factions.dockside=clamp(state.factions.dockside+10,-100,100);state.factions.police=clamp(state.factions.police-15,-100,100);saveGame();audio.play('success');toast('Vault job complete · Rs. 4,000 paid by the Dockside Crew.');return;
 }
 if(state.errand?.target===loc.id){const p=population.people.find(p=>p.id===state.errand.id);if(p){p.helped=true;p.helpCount=(p.helpCount||0)+1;p.relationship=clamp(p.relationship+15,-100,100);}state.errand=null;state.money+=350;state.reputation=clamp(state.reputation+3,0,100);audio.play('success');saveGame();toast('Parcel delivered · +Rs. 350 · Your neighbor will remember.');return;}
 if(storyInteraction(loc.id))return;
 if(loc.id==='tailor'){clothingShop();return;}
 if(loc.id==='tea'){
  if(state.mission==='delivery'){foodShop();return;}
  showModal(`<div class="dialogue-name">AMMA · TEA SHOP OWNER</div><h2>A small favor.</h2><p class="dialogue-quote">“The temple volunteers could use a warm cup. Will you take this tea over? There is Rs. 750 in it for you.”</p><div class="settings-footer"><button id="accept-job" class="primary">TAKE THE DELIVERY</button><button id="food-shop" class="secondary">FOOD & DRINK</button><button id="tea-invest" class="secondary">BUSINESS PARTNERSHIP</button><button id="leave-job" class="secondary">LATER</button></div>`,'dialogue');
  $('accept-job').onclick=()=>{state.mission='delivery';state.waypoint=null;closeModal();audio.play('ui');saveGame();toast('Tea collected. Bring it to the Lotus Temple marker.');};$('food-shop').onclick=foodShop;$('tea-invest').onclick=()=>propertyMenu('tea');$('leave-job').onclick=closeModal;
 }else if(loc.id==='temple'){
  if(state.mission==='delivery'){state.mission='done';state.money+=750;state.reputation=clamp(state.reputation+5,0,100);state.deliveries++;state.factions.community+=3;if(state.campaign===0){state.campaign=1;toast('Delivery complete · +Rs. 750. Amma asks you to take her contribution to the hospital.');}else toast('Delivery complete · +Rs. 750 · +5 reputation.');audio.play('success');saveGame();}
  else {state.health=100;toast('A quiet moment at Lotus Temple. Health restored.');}
 }else if(loc.id==='garage'){
  vehicleShop();
 }else if(loc.id==='home'){
  const home=world.buildings.find(b=>b.id==='home');toast('Your equipment locker is inside the apartment. Follow the new doorway marker.');state.waypoint={...home.door};
 }else if(loc.id==='weapons')weaponsShop();
 else if(loc.id==='clinic'){if(state.money>=100){state.money-=100;state.health=100;saveGame();toast('Treated at Maya General · −Rs. 100');}else toast('Treatment costs Rs. 100.');}
 else if(loc.id==='race'){
  if(!state.driving){toast('Bring a vehicle to enter the coastal time trial.');return;}if(state.race){toast('Follow the next checkpoint!');return;}raceMenu();
 }else if(['harbor','outlook'].includes(loc.id))propertyMenu(loc.id);
 else if(loc.id==='farm'){
  if(state.mission==='delivery'){toast('Finish your current delivery first.');return;}
  state.errand={id:'resident-26',target:'tea'};state.waypoint=null;toast('Farm produce collected. Deliver it to Amma for Rs. 350.');saveGame();
 }else if(loc.id==='village')journal();
 else if(loc.id==='station'){toast(state.heat?'Police are looking for you. Stay here and surrender, or leave the search area.':'No outstanding reports. The station keeps the district records.');}
}
function useInterior(item){
 if(item.action==='floor-up'||item.action==='floor-down'){state.buildingWork=null;interiors.floorChange(item.action==='floor-up'?1:0,state,player);cutscene=1;return;}
 if(item.action==='club-lounge'){clubLounge();return;}
 if(item.action==='food'&&state.interior==='club'){clubLounge();return;}
 if(item.action==='club-music'){audio.clubTrack=(audio.clubTrack+1)%3;toast(['Island house','Coastal disco','Late-night dub'][audio.clubTrack]);return;}
 if(item.action==='work-order'){const b=interiors.active.building,step=state.buildingJobs[b.id]||0;if(step===3){toast('Work order completed. Thank you.');return;}state.buildingJobs[b.id]=Math.max(1,step);saveGame();toast(`${buildingTask(b)[Math.max(0,step-1)]} · upper floor. Rs. 220 on completion.`);return;}
 if(item.action==='work-a'||item.action==='work-b'){const b=interiors.active.building,step=item.action==='work-a'?1:2;if(state.buildingJobs[b.id]!==step){toast(state.buildingJobs[b.id]===3?'This work order is complete.':'Read the work order downstairs and follow its steps.');return;}state.buildingWork={id:b.id,step,x:state.x,z:state.z,time:4};toast('Working… stay at the station for four seconds.');return;}
 if(item.action==='wage-ledger'){const q=state.activities.encounter;if(q.stage==='evidence'){q.stage='witness';state.waypoint=null;saveGame();toast('Sealed ledger collected. Find Deepa Gunaratne; she keeps her own work and home schedule.');}else toast('Sealed wage records. Ravi knows why they were kept apart from the manifest.');return;}
 if(item.action==='exit'){interiors.exit(state,player);cutscene=1;audio.play('door');return;}
 if(item.action==='weapons'){weaponsShop();if(item.id.startsWith('display-'))stage.preview(item.id.slice(8));return;}
 if(item.action==='supplies'){vehicleShop();return;}
 if(item.action==='food'){foodShop(item.id.startsWith('meal-')?item.id.slice(5):'tea');return;}
 if(item.action==='case-bank'){
  if(state.heist.stage==='planned'){state.heist.stage='cased';saveGame();toast('Floor plan studied. Bring a toolkit and leave an escape vehicle near the bank before opening the vault.');}
  else toast('A public floor plan shows the lobby, service rooms and vault.');return;
 }
 if(item.action==='vault'){
  if(state.heist.stage!=='cased'){toast(state.heist.stage==='opening'?'The vault timer is running. Stay nearby.':'Plan the job at the bank marker and study the lobby floor plan first.');return;}
  const bank=world.buildings.find(b=>b.id==='bank');
  if(!state.heist.kit){toast('You need a toolkit from Fernando Sporting Goods.');return;}
  if(!vehicles.cars.some(c=>c.owned&&c.health>0&&distance(c,bank)<50)){toast('Leave a working escape vehicle near the bank first.');return;}
  state.heist.stage='opening';state.heist.timer=10;state.heat=Math.max(3,state.heat);emergency.lastKnown={...bank.door};emergency.escape=0;saveGame();toast('Silent alarm triggered. Stay by the vault for 10 seconds, then escape.');return;
 }
 if(item.action==='clothing'){clothingShop(item.id.replace('outfit-',''));return;}
 if(item.action==='starter'){
  if(state.inventory.pistol){toast('Your locker is empty. Restock at Fernando Sporting Goods.');return;}
  state.inventory.pistol=true;state.inventory.pistolAmmo+=36;combat.clips.pistol=12;combat.equip('pistol',state);saveGame();audio.play('success');toast('Pistol and 36 rounds collected. 2 equips it; R reloads.');return;
 }
 if(item.action==='manifest'){
  if(state.campaign===3){advanceStory();toast(`Manifest recovered. Return to ${state.choice==='harbor'?'the harbor union marker':'Diyara Community Hall'}.`);}else toast('Shipping manifests and wage records cover the table.');return;
 }
 if(item.action==='rest'){
  if(state.heat){toast('You cannot rest during an active police search.');return;}
  if(interiors.active.building.id==='outlook'&&!state.properties.includes('hill-home')){propertyMenu('outlook');return;}
  state.health=100;state.hour=7;saveGame();audio.play('success');toast('Rested until morning. Progress saved.');return;
 }
 if(item.action==='property'){propertyMenu('outlook');return;}
 if(item.action==='heal'||item.action==='food'){
  const price=item.action==='heal'?100:60;if(state.money<price){toast(`This costs Rs. ${price}.`);return;}state.money-=price;state.health=100;saveGame();audio.play('success');toast(item.action==='heal'?'Treated and recovered.':'A warm meal. Health restored.');return;
 }
 toast(item.action==='records'?'The noticeboard lists local families, missing parcels, and the next community meeting.':'Tools, spare parts, and a long list of unfinished repairs.');
}
function context(){
 if(state.flightMode)return null;
 const cash=cashDrops.nearest(state);if(cash)return {type:'cash',value:cash,label:`Collect Rs. ${cash.value}`,key:'E'};
 const job=jobs.target();if(job&&!state.interior&&distance(state,job)<4.5)return {type:'city-job',label:job.name,key:'E'};
 const dog=!state.interior&&wildlife.nearest(state);if(dog)return {type:'animal',value:dog,label:'Greet the friendly dog',key:'E'};
 const craft=!state.interior&&!state.driving&&flight.nearest(state);if(craft)return {type:'aircraft',value:craft,label:state.ownedAir.includes(craft.kind)?`Board ${craft.spec.name}`:'Aircraft charter · visit depot',key:'F'};
 if(state.transition)return null;
 const drop=!state.driving&&street.nearest(state);if(drop)return {type:'drop',value:drop,label:`Pick up ${drop.weapon}`,key:'E'};
 if(state.interior){
  const item=interiors.nearest(state);if(item)return {type:'item',value:item,label:item.name,key:'E'};
  const dancer=interiors.active.scene.userData.dancers?.find(d=>d.mesh.visible&&distance(d,state)<2.5);if(dancer)return {type:'person',value:dancer,label:`Talk to ${dancer.name}`,key:'E'};
  const p=interiors.active.people.find(p=>!p.resident.dead&&distance(p,state)<3);if(p)return {type:'person',value:p.resident,label:`Talk to ${p.resident.name}`,key:'E'};
  return null;
 }
 const locations=LOCATIONS.filter(l=>distance(l,state)<4.6).sort((a,b)=>distance(a,state)-distance(b,state));
 if(locations[0])return {type:'location',value:locations[0],label:locations[0].name,key:'E'};
 if(!state.driving){
  const building=world.buildings.filter(b=>distance(b.door,state)<3).sort((a,b)=>distance(a.door,state)-distance(b.door,state))[0];
  if(building)return {type:'building',value:building,label:`Enter ${building.name}`,key:'E'};
  const person=population.nearest(state)||families.nearest(state)||footPolice.people.find(p=>!p.dead&&distance(p,state)<3);if(person)return {type:'person',value:person,label:`Talk to ${person.name}`,key:'E'};
  const car=vehicles.nearest(state);if(car)return {type:'car',value:car,label:Math.abs(car.speed)>4?'Wait for the vehicle to slow down':'Enter vehicle',key:'F'};
 }
 return null;
}
function interact(){
 if(!state.started||state.paused||state.death||state.transition||state.knocked>0||state.dodge>0)return;
 const c=context();if(!c)return;
 if(c.type==='cash'){const value=cashDrops.collect(c.value,state);saveGame();toast(`Picked up Rs. ${value}`);return;}
 if(c.type==='city-job'){const result=jobs.interact(state);if(result){toast(result);saveGame();}return;}
 if(c.type==='animal'){toast(wildlife.pet(c.value,state));return;}
 if(c.type==='drop'){street.collect(c.value,state);saveGame();audio.play('success');}
 if(c.type==='item')useInterior(c.value);if(c.type==='person')talk(c.value);if(c.type==='location')useLocation(c.value);
 if(c.type==='building'){
  if(interiors.enter(c.value,state,player)){cutscene=1;audio.play('door');toast(c.value.name);}
 }
}
function parkedVehicleAt(x,z){
 if(flight.craft.some(c=>c.altitude<1&&distance(c,{x,z})<2.3))return true;
 return vehicles.cars.some(c=>c!==state.driving&&c.kind!=='removed'&&Math.abs(c.speed)<2&&[c.spec.axle||1.1,-(c.spec.axle||1.1)].some(offset=>Math.hypot(x-c.x-Math.sin(c.angle)*offset,z-c.z-Math.cos(c.angle)*offset)<(c.spec.radius||1)+.6));
}
function enterVehicle(){
 if(state.death)return;
 if(state.started&&!state.paused&&!state.transition){if(state.flightMode){if(!flight.exit(state))toast('Land before exiting, or press K to deploy your parachute.');return;}const craft=flight.nearest(state);if(craft&&!state.driving&&!state.interior){if(!state.ownedAir.includes(craft.kind)){toast('Charter this aircraft at the Air & Cycle Depot.');return;}flight.board(craft,state);return;}}
 if(!state.started||state.paused||state.death||state.transition||state.interior||state.knocked>0||state.dodge>0)return;
 const car=state.driving||vehicles.nearest(state);if(!car){toast('Move closer to a vehicle.');return;}
 if(Math.abs(car.speed)>4){toast('Wait for the vehicle to slow down.');return;}
 if(!state.driving&&car.kind==='racer'){toast('This vehicle is locked.');return;}
 if(!state.driving&&car.health<=0){toast('This vehicle is disabled.');return;}
 const spot=occupants.freeDoor(car,state.driving?null:state);if(!spot){toast('The doors are blocked. Move to open space.');return;}
 if(!state.driving&&['police','ambulance'].includes(car.kind)){const police=car.kind==='police';emergency.releaseVehicle(car,state);if(police){for(const officer of footPolice.people)if(!officer.dead&&distance(officer,car)<35)officer.aggressiveUntil=state.elapsed+30;state.heat=Math.max(state.heat,2);}}
 const exit=!!state.driving,stolen=!exit&&!car.owned;
 state.transition={car,spot,exit,stolen,time:0,start:{x:state.x,z:state.z},ejected:false};car.transition=true;car.speed=0;state.speed=0;
 if(exit){state.driving=null;car.mesh.userData.driver.visible=false;}else if(stolen){emergency.report(1,state,state);state.reputation=Math.max(0,state.reputation-2);}
 player.visible=true;audio.play('door');
}
function updateVehicleTransition(dt){
 const t=state.transition;if(!t)return false;const {car,spot}=t;t.time+=dt;
 if(car.exploded||state.health<=0||state.knocked>0){car.transition=false;if(!car.driver)car.kind='parked';car.mesh.userData.doors.forEach(d=>d.rotation.y=0);state.transition=null;return false;}
 const duration=t.stolen?1.75:1.1,progress=Math.min(1,t.time/duration),door=car.mesh.userData.doors[spot.side<0?0:1];door.rotation.y=spot.side*Math.sin(progress*Math.PI)*1.2;
 if(!t.exit&&!t.ejected&&progress>.3){if(!occupants.eject(car,state,true)){car.transition=false;state.transition=null;door.rotation.y=0;return false;}t.ejected=true;}
 const seat={x:car.x-Math.cos(car.angle)*.5,z:car.z+Math.sin(car.angle)*.5};
 let from,to,blend;if(t.exit){from=seat;to=spot;blend=progress;}else if(progress<.35){from=t.start;to=spot;blend=progress/.35;}else{from=spot;to=seat;blend=(progress-.35)/.65;}
 state.x=from.x+(to.x-from.x)*blend;state.z=from.z+(to.z-from.z)*blend;player.position.set(state.x,.3,state.z);player.rotation.y=car.angle;animatePerson(player,state.elapsed,2,false,!t.exit&&progress>.75);
 if(progress===1){car.transition=false;door.rotation.y=0;state.transition=null;car.kind='parked';
  if(t.exit){state.x=spot.x;state.z=spot.z;player.visible=true;}else{car.owned=true;state.driving=car;state.x=car.x;state.z=car.z;player.visible=false;occupants.playerBoard(car);wear(car.mesh.userData.driver,state.wardrobe);state.angle=car.angle+Math.PI;state.pitch=.12;state.driveOrbit=0;}
  state.previous={x:state.x,z:state.z};audio.play('door');saveGame();}
 return true;
}
function attack(){
 if(!state.started||state.paused||state.death||state.transition||state.knocked>0||state.dodge>0)return;
 camera.updateMatrixWorld();raycaster.setFromCamera(state.cameraMode==='top'?pointer:new THREE.Vector2(0,0),camera);
 const point=new THREE.Vector3();
 if(raycaster.ray.intersectPlane(ground,point))aim={x:point.x,z:point.z};
 else aim={x:state.x-Math.sin(state.angle)*50,z:state.z-Math.cos(state.angle)*50};
 combat.attack(state,aim,activeCollision(),activeScene(),interiors.active?.people||[]);
}
function keyAction(key){
 if(state.death)return;
 if(key==='escape'){if(activeModal)closeModal();else if(state.started)settings();return;}
 if(!state.started)return;
 if(key==='m'){if(activeModal==='map')closeModal();else openMap();return;}
 if(key==='tab'){if(activeModal==='journal')closeModal();else if(!activeModal)journal();return;}
 if(key==='j'){if(activeModal==='phone')closeModal();else openPhone();return;}
 if(activeModal==='phone'){phoneUI.key(key);return;}
 if(state.paused)return;
 if(key==='n'){state.radio=STATIONS[(STATIONS.findIndex(r=>r.id===state.radio)+1)%STATIONS.length].id;saveGame();toast(STATIONS.find(r=>r.id===state.radio).name);return;}
 if(key==='o'){cityJobBoard();return;}if(key==='`'){cheatMenu();return;}if(key==='i'){equipmentMenu();return;}
 if(key==='x'){if(!flight.jetpack(state))toast('Get a jetpack at the depot, then use X outdoors on foot.');return;}
 if(key==='k'){if(!flight.parachute(state))toast('A parachute needs at least five meters of altitude.');return;}
 if(key==='g')useOrdnance('grenade');if(key==='t')useOrdnance('c4');if(key==='y')ordnance.detonate(state);if(key==='l')useOrdnance('missile');
 if(key==='c')tactics.crouch(state);
 if(key==='b'&&!tactics.cover(state,activeCollision()))toast('Move within three meters of a wall, tree, or solid cover.');
 if(key==='alt'){const f=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),r=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));tactics.dodge(state,{x:-Math.sin(state.angle)*(f||(!r?1:0))+Math.cos(state.angle)*r,z:-Math.cos(state.angle)*(f||(!r?1:0))-Math.sin(state.angle)*r});}
 if(key==='f')enterVehicle();if(key==='e')interact();if(key==='h'&&state.driving)audio.play('horn');
 if(key==='j'){combat.equip('fists',state);attack();}if(key==='r')combat.reload(state);
 if(['1','2','3','4'].includes(key))combat.equip(['fists','pistol','rifle','bazooka'][Number(key)-1],state);
 if(key==='q')state.angle+=Math.PI/2;if(key==='v')cycleCamera();if(key==='p')saveGame(true);
 if(key===' '&&!state.flightMode&&!state.driving&&state.jump===0)state.jumpVelocity=state.cheats.superJump?9:5;
}
window.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)&&e.key!=='Escape')return;
 const key=e.key.toLowerCase();if([' ','alt','arrowup','arrowdown','arrowleft','arrowright'].includes(key)||(key==='tab'&&state.started&&!activeModal))e.preventDefault();
 keys.add(key);if(!e.repeat)keyAction(key);
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();firing=false;rightMouse=false;if(state.started&&!state.paused)settings();});
document.addEventListener('visibilitychange',()=>{keys.clear();firing=false;if(document.hidden&&state.started)saveGame();});
window.addEventListener('pagehide',()=>{if(state.started)saveGame();});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
let lookTouch=null,lastMouseLook=null;
renderer.domElement.addEventListener('pointerleave',()=>lastMouseLook=null);
renderer.domElement.addEventListener('pointerenter',e=>{lastMouseLook={x:e.clientX,y:e.clientY};});
renderer.domElement.style.touchAction='none';
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'&&state.started&&!state.paused){lookTouch={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}
 if(e.button===2){rightMouse=true;renderer.domElement.setPointerCapture(e.pointerId);}
 if(e.button===0&&e.pointerType!=='touch'){if(state.started&&!state.paused&&state.cameraMode!=='top'&&!document.pointerLockElement){renderer.domElement.requestPointerLock?.()?.catch?.(()=>{});}firing=true;attack();}
});
window.addEventListener('pointerup',e=>{if(lookTouch?.id===e.pointerId)lookTouch=null;if(e.button===0&&e.pointerType!=='touch')firing=false;if(e.button===2)rightMouse=false;});
window.addEventListener('pointercancel',()=>{lookTouch=null;firing=false;rightMouse=false;});
window.addEventListener('pointermove',e=>{
 if(lookTouch?.id===e.pointerId){if(state.cameraMode!=='top'&&!state.paused){state.angle-=(e.clientX-lookTouch.x)*.006*preferences.sensitivity;state.pitch=clamp(state.pitch+(e.clientY-lookTouch.y)*.005*preferences.sensitivity,-.7,.7);}lookTouch.x=e.clientX;lookTouch.y=e.clientY;}
 if(e.target===renderer.domElement||rightMouse||lookTouch?.id===e.pointerId)pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);
 if(e.pointerType!=='touch'&&(e.target===renderer.domElement||rightMouse)&&state.started&&state.cameraMode!=='top'&&!state.paused){if(lastMouseLook){const locked=document.pointerLockElement===renderer.domElement,dx=clamp(locked?e.movementX:e.clientX-lastMouseLook.x,-80,80),dy=clamp(locked?e.movementY:e.clientY-lastMouseLook.y,-80,80);state.angle-=dx*.004*preferences.sensitivity;if(state.driving||state.aircraft){state.driveOrbit=(state.driveOrbit||0)-dx*.004*preferences.sensitivity;state.lastLook=state.elapsed;}state.pitch=clamp(state.pitch+dy*.003*preferences.sensitivity,-.55,.55);}lastMouseLook={x:e.clientX,y:e.clientY};}
});
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom+e.deltaY*.04,40,115);},{passive:false});
for(const b of document.querySelectorAll('[data-key]')){
 b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);keyAction(b.dataset.key);};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(b.dataset.key);
}
for(const b of document.querySelectorAll('[data-action]')){
 if(b.dataset.action==='fire'){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);firing=true;attack();};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>firing=false;}
 else b.onclick=()=>b.dataset.action==='interact'?interact():b.dataset.action==='vehicle'?enterVehicle():combat.equip(state.weapon==='fists'?(state.inventory.pistol?'pistol':state.inventory.rifle?'rifle':'fists'):state.weapon==='pistol'&&state.inventory.rifle?'rifle':'fists',state);
}

function hurtPlayer(damage,force=false){if(state.death||state.cheats.invincible)return;if(!force&&damageCooldown>0||damage<=0)return;state.health=clamp(state.health-damage,0,100);react(player,'hit',state.elapsed);damageCooldown=.6;combat.blood(activeScene(),state,state.elapsed,.45);audio.play('crash');document.body.classList.add('hurt');setTimeout(()=>document.body.classList.remove('hurt'),250);if(state.health<=0)beginDeath();}
function beginDeath(){
 if(state.death)return;
 state.health=0;state.death={remaining:3};keys.clear();firing=false;rightMouse=false;lookTouch=null;
 if(activeModal)closeModal();
 phone.hangup();jobs.stop();state.walking=false;state.speed=0;
 if(state.driving)state.driving.speed=0;
 if(document.pointerLockElement)document.exitPointerLock();
 react(player,'death',state.elapsed);halo.visible=false;
 document.body.classList.add('wasted');$('wasted-screen').classList.remove('hidden');
 for(const el of document.querySelectorAll('.hud,#touch-controls,#flight-controls'))el.inert=true;
}
function respawn(arrest=false){
 if(arrest&&(state.death||state.health<=0))return;
 state.death=null;document.body.classList.remove('wasted','hurt');$('wasted-screen').classList.add('hidden');
 for(const el of document.querySelectorAll('.hud,#touch-controls,#flight-controls'))el.inert=false;
 keys.clear();firing=false;rightMouse=false;damageCooldown=2;
 emergency.lastKnown=null;emergency.contact=0;emergency.escape=0;
 for(const u of emergency.patrols){u.aim=null;u.forcedExit=false;}
 for(const p of footPolice.people){p.aggressiveUntil=0;p.aim=null;}

 jobs.stop();player.userData.action=null;state.flightMode=null;state.aircraft=null;state.altitude=0;state.buildingWork=null;
 if(state.transition){state.transition.car.transition=false;state.transition.car.mesh.userData.doors.forEach(d=>d.rotation.y=0);state.transition=null;}
 if(state.driving){state.driving.speed=0;state.driving.mesh.userData.driver.visible=false;state.driving=null;}
 if(state.interior)interiors.exit(state,player);
 state.x=arrest?-96:-144;state.z=arrest?-14:8;state.health=100;state.heat=0;state.speed=0;state.race=null;state.jump=0;state.jumpVelocity=0;state.walking=false;state.sprinting=false;state.stamina=100;state.loungeSeated=false;state.loungeUntil=0;state.knocked=0;state.dodge=0;state.cover=null;state.crouching=false;state.previous={x:state.x,z:state.z};
 state.money=Math.max(0,state.money-(arrest?350:150));player.visible=true;player.rotation.z=0;player.scale.y=1;player.userData.torso.rotation.set(0,0,0);player.userData.armL.rotation.z=player.userData.armR.rotation.z=0;animatePerson(player,state.elapsed,0);player.position.set(state.x,.3,state.z);cutscene=1;saveGame();
 toast(arrest?'Released at the police station · Rs. 350 fine.':'Recovered at Maya General Hospital · Rs. 150 treatment.');
}
function movePlayer(dt){
 if(state.loungeSeated&&(!(state.loungeUntil>state.elapsed)||state.interior!=='club')){state.loungeSeated=false;if(state.interior==='club'){state.x=6;state.z=5;}}
 if(state.loungeUntil>state.elapsed&&state.interior==='club'){state.x=8;state.z=3;state.walking=false;player.position.set(8,.3,3);player.rotation.y=0;animatePerson(player,state.elapsed,0,false,true);return;}
 const airInput={up:keys.has('w')||keys.has('arrowup'),down:keys.has('s')||keys.has('arrowdown'),left:keys.has('a')||keys.has('arrowleft'),right:keys.has('d')||keys.has('arrowright'),ascend:keys.has(' '),descend:keys.has('control')};if(flight.update(dt,state,airInput,hurtPlayer)){halo.visible=false;return;}
 if(updateVehicleTransition(dt))return;
 state.previous={x:state.x,z:state.z};state.walking=false;state.sprinting=keys.has('shift')&&!state.crouching&&!state.exhausted&&state.stamina>0;
 const input={up:keys.has('w')||keys.has('arrowup'),down:keys.has('s')||keys.has('arrowdown'),left:keys.has('a')||keys.has('arrowleft'),right:keys.has('d')||keys.has('arrowright'),brake:keys.has(' ')};
 if(state.driving){
  if(state.race?.countdown>0){input.up=input.down=input.left=input.right=false;input.brake=true;state.driving.speed=0;}
  vehicles.drive(state.driving,dt,input,state.weather,speed=>hurtPlayer(speed*.5));
  state.x=state.driving.x;state.z=state.driving.z;state.speed=state.driving.speed;state.heading=state.driving.angle;player.visible=false;
 }else if(state.dodge>0){
  const before={x:state.x,z:state.z};tactics.moveDodge(dt,state,activeCollision());if(!state.interior&&parkedVehicleAt(state.x,state.z)){state.x=before.x;state.z=before.z;state.dodge=0;}state.walking=true;player.position.set(state.x,.3,state.z);player.rotation.z=Math.sin(state.dodge/.4*Math.PI)*.8;state.speed=0;
 }else if(state.knocked>0){
  state.knocked=Math.max(0,state.knocked-dt);activeCollision().move(state,state.knockX*dt,state.knockZ*dt,.6);state.knockX*=Math.exp(-dt*4);state.knockZ*=Math.exp(-dt*4);
  player.rotation.z=Math.sin(state.knocked*Math.PI)*1.2;player.position.set(state.x,.35,state.z);player.visible=state.cameraMode!=='first';state.speed=0;
 }else{
  player.rotation.z=0;
  let forward=Number(input.up)-Number(input.down),side=Number(input.right)-Number(input.left),length=Math.hypot(forward,side);
  if(length){
   forward/=length;side/=length;const speed=state.crouching?2.1:keys.has('control')?2.5:state.sprinting?10*(state.runBoost||1):5.6*(state.runBoost||1);
   const dx=(-Math.sin(state.angle)*forward+Math.cos(state.angle)*side)*speed*dt*(state.intoxication>0?.8:1),dz=(-Math.cos(state.angle)*forward-Math.sin(state.angle)*side)*speed*dt*(state.intoxication>0?.8:1);
   const before={x:state.x,z:state.z};activeCollision().move(state,dx,dz,.6);
   if(!state.interior&&(parkedVehicleAt(state.x,state.z)||population.people.some(p=>!p.vehicle&&!p.inside&&!p.removed&&!p.dead&&distance(p,state)<.85))){state.x=before.x;state.z=before.z;}
   state.walking=distance(before,state)>.001;walkTime+=dt*(state.sprinting?16:11);
   if(state.cameraMode==='top'&&!firing)state.heading=Math.atan2(dx,dz);
  }
  if(state.cameraMode!=='top'||firing)state.heading=Math.atan2(aim.x-state.x,aim.z-state.z);
  player.rotation.y=state.heading;
  const swing=state.walking?Math.sin(walkTime)*.65:0;animatePerson(player,state.elapsed,state.walking?(state.sprinting?8:3):0,state.weapon!=='fists');
  if(state.jumpVelocity||state.jump){state.jumpVelocity-=dt*12;state.jump=Math.max(0,state.jump+state.jumpVelocity*dt);if(state.jump===0)state.jumpVelocity=0;}
  player.position.set(state.x,.3+state.jump,state.z);player.visible=state.cameraMode!=='first';state.speed=0;
 }
 player.scale.y=state.crouching&&state.exposed<=0?.65:1;
 halo.position.set(state.x,.29,state.z);halo.visible=state.cameraMode==='top'&&!state.interior;halo.scale.setScalar(state.driving?1.8:1);
}
function simulate(dt){
 if(state.health<=0&&!state.death)beginDeath();
 if(state.death){
  state.elapsed+=dt;state.death.remaining-=dt;
  if(!state.driving&&!state.aircraft)reactionPose(player,state.elapsed,.3+(state.altitude||0));
  if(state.death.remaining<=0)respawn();
  return;
 }

 if(state.elapsed>nextMessageAt){nextMessageAt=state.elapsed+180;const id=phone.offers.find(id=>!phone.data.read.includes(id));if(id){audio.play('ui');toast('New message · '+CITY_JOBS[id].contact+' · J opens your phone');}}
 state.intoxication=Math.max(0,state.intoxication-dt);state.elapsed+=dt;state.hour=(state.hour+dt/60)%24;damageCooldown=Math.max(0,damageCooldown-dt);
 tactics.update(dt,state);movePlayer(dt);
 {
  vehicles.update(dt,state,[...population.people,...footPolice.people,...wildlife.animals],(p,damage,c)=>{if(p.police||p.type){combat.onExternalHit(p.police?{footOfficer:p}:{animal:p},damage,c===state.driving);p.impulse={x:Math.sin(c.angle)*8,z:Math.cos(c.angle)*8};}else combat.hurtResident(p,damage,state,{crime:c===state.driving,source:c});},(damage,car)=>{if(state.altitude>2)return;hurtPlayer(damage);state.knocked=.85;state.knockX=Math.sin(car.angle)*9;state.knockZ=Math.cos(car.angle)*9;},(a,b,impact)=>{emergency.collision(a,b,impact,state);if(a===state.driving||b===state.driving){audio.play('crash');hurtPlayer(impact*.6);emergency.report(1,state,state);}});
 }
 occupants.update(dt,state);population.update(dt,state,vehicles.cars);families.update(dt,state);interiors.update(dt,state);ordnance.update(dt,state);street.update(dt,state,damage=>{if(state.altitude<4)hurtPlayer(damage);});
 if(state.buildingWork){const work=state.buildingWork;if(state.interior!==work.id||state.floor!==1||Math.hypot(state.x-work.x,state.z-work.z)>1.4)state.buildingWork=null;else{work.time-=dt;if(work.time<=0){if(completeBuildingStep(state,work.id,work.step)){saveGame();toast(work.step===2?'Work order complete · +Rs. 220':buildingTask(interiors.active.building)[1]+' · use the second station.');}state.buildingWork=null;}}}
 emergency.update(dt,state,damage=>{if(state.altitude<4)hurtPlayer(damage);},()=>respawn(true));racing.update(dt,state);
 combat.update(dt,state);for(const u of emergency.patrols){const a=u.officer.userData.action;if(a){if(u.health<=0)u.officer.visible=!state.interior&&state.elapsed-a.now<60;reactionPose(u.officer,state.elapsed);}}streetLife.update(dt,state,hurtPlayer);footPolice.update(dt,state,hurtPlayer);wildlife.update(dt,state,hurtPlayer);tornado.update(dt,state,vehicles,population,d=>hurtPlayer(d,true));cashDrops.update(state);const jobEvent=jobs.update(dt,state);if(jobEvent)toast(jobEvent);if(!state.driving&&!state.transition)reactionPose(player,state.elapsed,.3+(state.jump||0)+(state.altitude||0));
 if(updateLedgerWitness(state,population.people)){saveGame();toast('Deepa has died. Take the surviving ledger to the police station so her records are preserved.');}
 interiorTimer+=dt;if(state.interior&&interiorTimer>1){interiors.syncResidents();interiorTimer=0;}
 if(state.interior)for(const view of interiors.active.people){view.mesh.visible=!view.resident.removed;view.mesh.userData.action=view.resident.mesh.userData.action;reactionPose(view.mesh,state.elapsed);if(view.mesh.userData.gun)view.mesh.userData.gun.visible=!view.resident.dropped;}
 if(firing)attack();
 if(state.health<=0){beginDeath();return;}
 saveTimer+=dt;incomeTimer+=dt;
 if(saveTimer>20){saveGame();saveTimer=0;}
 if(incomeTimer>=120){incomeTimer=0;const income=PROPERTY_DATA.filter(p=>state.properties.includes(p.id)).reduce((n,p)=>n+p.income,0);if(income){state.money+=income;saveGame();toast(`Your businesses earned Rs. ${income}.`);}}
 if(!state.interior&&state.waypoint&&distance(state,state.waypoint)<3){state.waypoint=null;toast('Waypoint reached.');}
 if(state.heist.stage==='opening'){
  if(state.interior==='bank'&&Math.hypot(state.x,state.z+6)<3){
   state.heist.timer=Math.max(0,state.heist.timer-dt);
   if(state.heist.timer===0){state.heist.stage='escape';state.waypoint=null;audio.play('success');saveGame();toast('Vault bag collected. Escape the search, then deliver it at South Harbor.');}
  }
 }
 if(state.race){
  const result=tickRace(state.race,dt,state,!!state.driving),course=raceCourse(state.race);
  if(result==='failed'){racing.finish(state);state.race=null;toast('Time is up. Return to the waterfront race marker to try again.');}
  else if(result==='won'){
   const elapsed=course.seconds-state.race.time,previous=state.activities.raceBest[course.id];state.activities.raceBest[course.id]=previous?Math.min(previous,elapsed):elapsed;
   const place=course.opponents?racing.finish(state):1,prize=place===1?course.prize:place===2?Math.round(course.prize/2):0;
   state.race=null;state.money+=prize;state.reputation=clamp(state.reputation+(place===1?3:1),0,100);saveGame();audio.play('success');toast(`${course.name} complete${course.opponents?` · Place ${place}/3`:''} · ${elapsed.toFixed(1)}s · +Rs. ${prize}`);
  }else if(result==='checkpoint')audio.play('ui');
 }
 const place=district(outside().x,outside().z);if(!state.discoveries.includes(place)){state.discoveries.push(place);if(state.discoveries.length>1)toast(`Discovered ${place}`);}
}
function updateHUD(){
 $('touch-jump').textContent=state.driving?'BRAKE':'JUMP';
 document.body.dataset.driving=!!state.driving;document.body.dataset.flying=!!state.flightMode;$('flight-controls').classList.toggle('hidden',!state.flightMode);$('flight-status').classList.toggle('hidden',!state.flightMode);$('flight-status').textContent=state.flightMode?`${state.flightMode.toUpperCase()} · ${Math.round(state.altitude)} m${state.flightMode==='jetpack'?` · FUEL ${Math.ceil(state.fuel)}%`:` · ${state.inventory.missile} MISSILES`}`:'';
 const place=state.interior?interiors.active.building.name+(state.floor?' · upper rooms':''):district(state.x,state.z);
 $('district').textContent=place;$('map-location').textContent=place.toUpperCase();$('clock').textContent=clockLabel(state.hour);$('phase').textContent=phase(state.hour);
 $('weather').textContent=state.interior?'INDOORS':{clear:'CLEAR SKIES',rain:'MONSOON RAIN',snow:'HIGHLAND SNOW',cloudy:'OVERCAST',tornado:'TORNADO WARNING'}[state.weather];$('weather-icon').innerHTML=ui.icon(state.weather==='clear'?(phase(state.hour)==='Night'?'moon':'sun'):state.weather==='cloudy'||state.weather==='tornado'?'cloud':state.weather);
 $('money').textContent=`Rs. ${Math.floor(state.money).toLocaleString('en-US')}`;$('health-bar').style.width=state.health+'%';$('health-label').textContent=Math.round(state.health);$('rep').textContent=state.reputation;
 $('wanted').textContent=Array.from({length:5},(_,i)=>i<Math.ceil(state.heat)?'★':'☆').join(' ');$('wanted').classList.toggle('hot',state.heat>0);$('wanted').setAttribute('aria-label',`Wanted level ${Math.ceil(state.heat)}`);
 $('weapon-label').textContent=WEAPONS[state.weapon].name;$('ammo-label').textContent=combat.reloadRemaining>0?'RELOADING':state.weapon==='fists'?'—':state.weapon==='bazooka'?`${state.inventory.missile} ROCKETS`:`${combat.clips[state.weapon]} / ${Math.max(0,state.inventory[state.weapon+'Ammo']-combat.clips[state.weapon])}`;
 $('camera-label').textContent={top:'ELEVATED',shoulder:'SHOULDER',first:'FIRST PERSON'}[state.cameraMode];$('crosshair').classList.toggle('hidden',state.cameraMode==='top'||state.paused||!state.started||!!state.driving);
 $('stance-label').textContent=state.dodge>0?'DODGING':state.cover?'IN COVER':state.crouching?'CROUCHED':state.sprinting&&state.walking?'SPRINTING':'';$('stamina-bar').style.width=state.stamina+'%';
 $('dispatch').textContent=state.heat?`${emergency.patrols.filter(p=>p.active).length} PATROLS${emergency.helicopter.visible?' · AIR SUPPORT':''}${emergency.roadblocks.some(b=>b.stage==='blocking'||b.stage==='deploying')?' · ROADBLOCKS':''}${emergency.escape>3?' · SEARCHING':''}`:emergency.responding?`AMBULANCE RESPONDING · ${emergency.responding}`:'';
 $('speed').classList.toggle('hidden',!state.driving);$('speed').querySelector('strong').textContent=Math.round(Math.abs(state.speed)*3.6);$('car-name').textContent=state.driving?`${state.driving.spec.name} · ${Math.round(state.driving.health)}%${state.driving.burnTime>0&&!state.driving.exploded?' · FIRE!':''}`:'';
 const c=context();$('interaction').classList.toggle('hidden',!c||!state.started||state.paused);if(c){$('interaction').querySelector('span').textContent=c.label;$('interaction').querySelector('kbd').textContent=c.key;}
 const mission=CAMPAIGN[state.campaign];
 if(jobs.active){$('mission-tag').textContent=CITY_JOBS[jobs.active.id].name;$('mission-title').textContent=`${jobs.target().name} · ${Math.ceil(jobs.active.time)}s`;$('mission-copy').textContent=`Condition ${Math.round(jobs.active.condition)}% · Stop and press E at the marker.`;}
 else if(state.race){const c=raceCourse(state.race);$('mission-tag').textContent=c.name.toUpperCase();$('mission-title').textContent=state.race.countdown>0?`Starting in ${Math.ceil(state.race.countdown)}`:`${Math.ceil(state.race.time)}s · lap ${state.race.lap}/${c.laps}`;$('mission-copy').textContent=`${c.opponents?`Position ${racing.rank(state)}/3 · `:''}Checkpoint ${state.race.checkpoint+1}/${c.route.length}. Prize Rs. ${c.prize}.`;}
 else if(state.activities.encounter.tracking&&state.activities.encounter.stage!=='resolved'){const q=state.activities.encounter;$('mission-tag').textContent='A HARBOR STORY';$('mission-title').textContent='The wages ledger';$('mission-copy').textContent={available:'Find Ravi Jayawardena and ask about the wages ledger.',evidence:'Enter the harbor warehouse and inspect the sealed ledger.',witness:'Find Deepa Gunaratne and hear her testimony.',deliver:q.missingWitness?'Preserve Deepa’s records at the police station.':`Deliver the ledger: ${LEDGER_OUTCOMES[q.choice]?.name||''}.`}[q.stage];}
 else if(state.activities.contract){const a=state.activities.contract,c=CONTRACTS.find(c=>c.id===a.id);$('mission-tag').textContent=FACTIONS[c.faction].name.toUpperCase();$('mission-title').textContent=c.name;$('mission-copy').textContent=`${a.step+1}/${c.stops.length} · ${c.verbs[a.step]}`;}
 else if(['planned','cased','opening','escape'].includes(state.heist.stage)){$('mission-tag').textContent='OPTIONAL · THE VAULT JOB';$('mission-title').textContent=state.heist.stage==='opening'?`Vault · ${Math.ceil(state.heist.timer)}s`:state.heist.stage==='escape'?'Lose the search':'Prepare the job';$('mission-copy').textContent=state.heist.stage==='escape'?'Lose the police and bring the vault bag to South Harbor.':'Study the bank floor plan, get a toolkit, and park an escape vehicle nearby.';}
 else if(state.errand){const p=population.people.find(p=>p.id===state.errand.id);$('mission-tag').textContent='A PERSONAL FAVOR';$('mission-title').textContent=p?`For ${p.name.split(' ')[0]}`:'A neighbor’s parcel';$('mission-copy').textContent=`Deliver the parcel to ${LOCATIONS.find(l=>l.id===state.errand.target)?.name}. Reward Rs. 350.`;}
 else if(state.mission==='delivery'){$('mission-tag').textContent='DELIVERY IN PROGRESS';$('mission-title').textContent='Tea for the temple';$('mission-copy').textContent='Bring the tea to the marker beside Lotus Temple.';}
 else{$('mission-tag').textContent=mission?`CHAPTER ${state.campaign+1} / 6`:'YOUR LIFE IN MAYA';$('mission-title').textContent=mission?.title||'The city goes on';$('mission-copy').textContent=mission?.description||'Meet your neighbors, build a business, or take the long way home.';}
 const t=trackedTarget();refreshMapRoute();$('mission-distance').textContent=t?`${Math.round(distance(outside(),t))} m · ${t.name||'CHECKPOINT'}`:'';
 $('district-sub').textContent=state.interior?'A place with a life behind its door.':state.heat?'Police are responding. Break their line of sight.':state.weather==='snow'?'Snow above the coast, among the northern pines.':state.weather==='rain'?'Wet roads. Longer stopping distances.':state.cameraMode==='top'?'Every door leads somewhere.':'Look closer. The city has stories.';
 drawMap($('minimap'),mapState(),world,vehicles.cars,trackedTarget());if(activeModal==='map')drawMap($('big-map'),mapState(),world,vehicles.cars,trackedTarget(),true);
}
const lookAt=new THREE.Vector3(state.x,0,state.z),camGoal=new THREE.Vector3();let camAngle=state.angle;
function updateCamera(dt){
 document.body.dataset.camera=state.cameraMode;
 if(state.driving){if(state.elapsed-(state.lastLook||0)>1.6)state.driveOrbit=(state.driveOrbit||0)*Math.exp(-dt*2);state.angle=state.driving.angle+Math.PI+(state.driveOrbit||0);}
 camAngle+=Math.atan2(Math.sin(state.angle-camAngle),Math.cos(state.angle-camAngle))*(1-Math.exp(-dt*7));
 const altitude=state.altitude||0;const desired=new THREE.Vector3(state.x,altitude,state.z);if(cutscene){lookAt.copy(desired);}else lookAt.lerp(desired,1-Math.exp(-dt*8));
 const collision=activeCollision();
 if(interiors.active)interiors.active.scene.userData.ceiling.visible=state.cameraMode!=='top';
 if(state.cameraMode==='top'){
  const zoom=state.interior?25:state.zoom+(state.driving?Math.abs(state.speed)*.25:0);
  camGoal.set(lookAt.x+Math.sin(camAngle)*zoom*.86,zoom*.82+lookAt.y,lookAt.z+Math.cos(camAngle)*zoom*.86);
  if(cutscene)camera.position.copy(camGoal);else camera.position.lerp(camGoal,1-Math.exp(-dt*8));camera.lookAt(lookAt.x,lookAt.y+1,lookAt.z);
 }else{
  const shoulder=state.cameraMode==='shoulder',back=state.aircraft?16:state.driving?10.5+Math.abs(state.speed)*.1:shoulder?(state.interior?4:6):0,side=state.driving?0:shoulder?.75:0;
  const y=(state.driving?5.2:shoulder?(state.interior?2.6:3.1):1.92)+state.jump-(state.crouching&&state.exposed<=0?.6:0);
  camGoal.set(state.x+Math.sin(camAngle)*back+Math.cos(camAngle)*side,(state.interior?Math.min(3.1,y+state.pitch*back):y+state.pitch*back),state.z+Math.cos(camAngle)*back-Math.sin(camAngle)*side);
  // Shorten an obstructed shoulder camera rather than clipping through a wall.
  if((shoulder||state.driving)&&!state.flightMode){for(let fraction=.15;fraction<=1;fraction+=.06){const x=state.x+(camGoal.x-state.x)*fraction,z=state.z+(camGoal.z-state.z)*fraction;if(collision.blocked(x,z,.18,y)){camGoal.set(state.x+(camGoal.x-state.x)*Math.max(.05,fraction-.1),y,state.z+(camGoal.z-state.z)*Math.max(.05,fraction-.1));break;}}}
  camGoal.y+=altitude;camera.position.copy(camGoal);if(state.driving)camera.lookAt(state.x-Math.sin(camAngle)*5,1.4,state.z-Math.cos(camAngle)*5);else camera.lookAt(state.x-Math.sin(camAngle)*24,y+altitude-state.pitch*24,state.z-Math.cos(camAngle)*24);
 }
 cutscene=0;
 if(state.intoxication>0)camera.rotateZ(Math.sin(state.elapsed*1.8)*.015);
 if(state.knocked>0&&state.cameraMode==='first')camera.rotateZ(Math.sin(state.knocked*Math.PI)*.15);
 raycaster.setFromCamera(state.cameraMode==='top'?pointer:new THREE.Vector2(0,0),camera);
 const hit=new THREE.Vector3();if(raycaster.ray.intersectPlane(ground,hit))aim={x:hit.x,z:hit.z};else aim={x:state.x-Math.sin(camAngle)*50,z:state.z-Math.cos(camAngle)*50};
 if(state.cameraMode!=='top'&&distance(aim,state)<1)aim={x:state.x-Math.sin(camAngle)*50,z:state.z-Math.cos(camAngle)*50};
 if(combat.gun&&state.cameraMode==='first'&&!state.driving&&!state.aircraft){
  // A separate view-model remains visible when the player body is hidden.
  if(!viewGun||viewGun.userData.kind!==state.weapon)createViewGun();
 }else if(viewGun)viewGun.visible=false;
 if(viewGun){viewGun.position.x=.22*Math.min(1,camera.aspect/1.3);viewGun.visible=state.cameraMode==='first'&&state.weapon!=='fists'&&!state.driving&&!state.aircraft;viewGun.rotation.x=combat.reloadRemaining>0?-.6:combat.cooldown>0?-.1:0;}
 const limit=state.cameraMode==='top'?155:QUALITY[preferences.quality].distance;
 for(const b of world.buildings)if(b.group)b.group.visible=distance(b,outside())<limit;
 for(const c of vehicles.cars)c.mesh.visible=c.kind!=='removed'&&distance(c,outside())<limit;
 for(const p of population.people)p.mesh.visible=(!!p.ridingWith||!p.vehicle)&&!p.inside&&!p.removed&&distance(p,outside())<limit;
}
// First-person weapon rendering uses the same authored geometry, attached to the camera.
import { weaponModel } from './combat.js';
let viewGun=null;scene.add(camera);
function createViewGun(){if(viewGun){camera.remove(viewGun);viewGun.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}if(state.weapon==='fists'){viewGun=null;return;}viewGun=weaponModel(state.weapon);viewGun.userData.kind=state.weapon;viewGun.position.set(.22,-.2,-.75);viewGun.rotation.y=Math.PI;viewGun.scale.setScalar(.5);viewGun.traverse(o=>{if(o.isMesh){o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=50;}});camera.add(viewGun);}
function frame(now){
 const dt=Math.min((now-lastFrame)/1000,.2);lastFrame=now;const running=state.started&&!state.paused&&!document.hidden;
 if(running){let remaining=dt;while(remaining>0){const step=Math.min(remaining,1/30);simulate(step);remaining-=step;}}
 atmosphere.update(running?dt:0,state,outside());
 phone.update(dt,state);stage.update(dt);if(activeModal==='phone')phoneUI.update(dt);
 audio.update(dt,{...state,phoneRinging:phone.call?.phase==='ringing',radioSignal:radioSignal(state,vehicles.cars),paused:!running,club:state.interior==='club'&&(state.hour>=18||state.hour<4),helicopter:emergency.helicopter.visible||state.flightMode==='helicopter',ambulance:emergency.ambulances.some(a=>a.stage==='responding'&&a.car.speed>1),indoor:!!state.interior});
 updateCamera(dt);
 const target=trackedTarget();targetRing.visible=!!target&&!state.interior;if(target){targetRing.position.set(target.x,.3,target.z);targetRing.scale.setScalar(1+Math.sin(state.elapsed*3)*.05);}
 hudTimer+=dt;if(hudTimer>.13){updateHUD();hudTimer=0;}
 windowClock+=dt;if(interiors.active&&windowClock>.35){windowClock=0;const b=interiors.active.building;windowCamera.position.set(b.x,2+state.floor*4,b.z-b.d/2-1);windowCamera.lookAt(b.x,2+state.floor*4,b.z-80);renderer.setRenderTarget(windowTarget);renderer.render(scene,windowCamera);renderer.setRenderTarget(null);interiors.active.scene.userData.windowMaterial.map=windowTarget.texture;interiors.active.scene.userData.windowMaterial.needsUpdate=true;}
 const current=activeScene();if(camera.parent!==current)current.add(camera);renderer.render(current,camera);requestAnimationFrame(frame);
}
camera.position.set(state.x+40,75,state.z+40);camera.lookAt(state.x,0,state.z);atmosphere.update(0,state,state);updateHUD();requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,QUALITY[preferences.quality].pixelRatio));});
const snapshot=()=>({dead:!!state.death,deathRemaining:state.death?.remaining||0,wardrobe:structuredClone(state.wardrobe),radio:state.radio,phone:{...phone.data,call:phone.call},presentation:stage.snapshot(),profile:state.profile?{...state.profile}:null,crew:[...state.crew],job:jobs.active?{...jobs.active,target:jobs.target()}:null,jobRecords:{...state.jobRecords},cashDrops:cashDrops.items.map(d=>({x:d.x,z:d.z,value:d.value,source:d.source})),footPolice:footPolice.people.map(p=>({id:p.id,x:p.x,z:p.z,health:p.health,dead:p.dead,aggressive:p.aggressiveUntil>state.elapsed})),tornado:state.tornado,intoxication:state.intoxication,started:state.started,paused:state.paused,x:state.x,z:state.z,hour:state.hour,elapsed:state.elapsed,health:state.health,knocked:state.knocked,crouching:state.crouching,cover:state.cover,dodge:state.dodge,stamina:state.stamina,weather:state.weather,weatherMode:state.weatherMode,driving:!!state.driving,money:state.money,mission:state.mission,heat:state.heat,race:state.race?{...state.race}:null,rivals:racing.snapshot(),weapon:state.weapon,inventory:{...state.inventory},interior:state.interior,cameraMode:state.cameraMode,cameraAngle:state.angle,cameraUpY:camera.matrixWorld.elements[5],altitude:state.altitude,cameraY:camera.position.y,fuel:state.fuel,flightMode:state.flightMode,ownedAir:[...state.ownedAir],floor:state.floor,buildingJobs:{...state.buildingJobs},ordnance:ordnance.projectiles.map(p=>({kind:p.kind,x:p.mesh.position.x,y:p.mesh.position.y,z:p.mesh.position.z})),familyCount:families.people.length,transition:state.transition?{exit:state.transition.exit,stolen:state.transition.stolen,time:state.transition.time}:null,drops:street.drops.map(d=>({x:d.x,z:d.z,weapon:d.weapon,source:d.source})),campaign:state.campaign,choice:state.choice,properties:[...state.properties],errand:state.errand,activities:structuredClone(state.activities),heist:{...state.heist},buildingCount:world.buildings.length,colliderCount:world.solids.length,residentCount:population.people.length,policeCount:emergency.patrols.length,respondingPatrols:emergency.patrols.filter(p=>p.active).length,ambulances:emergency.responding,helicopter:emergency.helicopter.visible,roadblocks:emergency.roadblocks.filter(b=>['deploying','blocking'].includes(b.stage)).length,blood:combat.effects.filter(e=>e.blood).length,graphics:preferences.quality,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries});
window.__MAYA__={snapshot,assetsReady:Promise.all(world.assetLoads),ready:true};
// Deterministic integration harness is excluded from production builds.
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('test')){
 window.__MAYA_TEST__={
  snapshot,
  hurtPlayer:damage=>hurtPlayer(damage,true),
  teleport(x,z){state.flightMode=null;state.aircraft=null;state.altitude=0;if(state.transition){state.transition.car.transition=false;state.transition.car.mesh.userData.doors.forEach(d=>d.rotation.y=0);state.transition=null;}if(state.interior)interiors.exit(state,player);if(state.driving){state.driving.speed=0;state.driving.mesh.userData.driver.visible=false;state.driving=null;}state.x=x;state.z=z;state.previous={x,z};player.position.set(x,.3,z);cutscene=1;},
  advance(seconds){for(let t=0;t<seconds;t+=1/30){simulate(Math.min(1/30,seconds-t));}atmosphere.update(0,state,outside());updateHUD();},
  buildings:()=>world.buildings.map(({id,name,kind,door,x,z})=>({id,name,kind,door,x,z})),
  cars:()=>vehicles.cars.map(c=>({id:c.id,x:c.x,z:c.z,prev:c.prev,kind:c.kind,speed:c.speed,angle:c.angle,health:c.health,officialType:c.officialType,path:c.path,model:c.model,spec:c.spec,driver:c.driver?.id,exploded:c.exploded,burnTime:c.burnTime,door:c.mesh.userData.doors[0].rotation.y,doors:c.mesh.userData.doors.map(d=>d.rotation.y),impulseX:c.impulseX,impulseZ:c.impulseZ})),
  colliders:()=>world.solids.map(s=>({...s})),
  blocked:(x,z,r=.6)=>collision.blocked(x,z,r),
  people:()=>population.people.map(p=>({id:p.id,name:p.name,x:p.x,z:p.z,health:p.health,dead:p.dead,removed:p.removed,routine:p.routine,outfit:p.outfit,inside:p.inside,vehicle:p.vehicle?.id,gender:p.gender,variant:p.variant,helpCount:p.helpCount,cashDropped:p.cashDropped,following:p.following,action:p.mesh.userData.action?.kind,gang:p.gang,gun:!!p.gun?.visible,job:p.job,story:p.story,relationship:p.relationship})),
  injure(id,damage){const p=population.people.find(p=>p.id===id);combat.hurtResident(p,damage,state,{crime:true});},
  heat(value){state.heat=value;emergency.lastKnown={x:state.x,z:state.z};},
  trafficImpact(){const c=vehicles.cars.find(c=>c.kind==='traffic');c.x=0;c.z=state.z-3;c.angle=0;c.speed=18;c.tripRemaining=60;c.impactTime=0;c.impulseX=c.impulseZ=c.spin=0;c.hitCooldown=0;c.playerHitCooldown=0;c.path=[{x:0,z:state.z+60}];c.waypoint=0;c.prev={x:c.x,z:c.z};state.x=0;state.previous={x:0,z:state.z};},
  save:()=>saveGame(),enter:id=>{interiors.enter(world.buildings.find(b=>b.id===id),state,player);cutscene=1;},
  positionIndoor(x,z){state.x=x;state.z=z;player.position.set(x,.3,z);},
  campaign(value){state.campaign=value;},
  vehicleAt(x,z){const c=vehicles.cars[0];c.x=x;c.z=z;c.speed=0;c.angle=Math.PI;c.mesh.position.set(x,.26,z);},
  aimAt(x,z){aim={x,z};combat.attack(state,aim,activeCollision(),activeScene(),interiors.active?.people||[]);},
  patrols:()=>emergency.patrols.map(u=>({x:u.officer.position.x,z:u.officer.position.z,health:u.health,onFoot:u.onFoot,aim:u.aim,armed:u.gun.visible,forcedExit:!!u.forcedExit})),
  residentAt(id,x,z){const p=population.people.find(p=>p.id===id);if(p.vehicle)occupants.eject(p.vehicle,state);occupants.exits=occupants.exits.filter(e=>e.p!==p);Object.assign(p,{x,z,inside:null,dead:false,removed:false,injured:false,health:100,stun:100,route:[],routePending:false});p.mesh.position.set(x,.3,z);p.mesh.visible=true;},
  emergency:()=>({incidents:emergency.incidents.map(i=>({id:i.person.id,closed:i.closed,position:i.position})),ambulances:emergency.ambulances.map(a=>({x:a.car.x,z:a.car.z,stage:a.stage,path:a.car.path?.length,next:a.car.path?.[0],speed:a.car.speed,medics:a.medics.map(m=>({x:m.position.x,z:m.position.z,goal:m.userData.goal,path:m.userData.route}))}))}),
  nextSystems:()=>({animals:wildlife.animals.map(a=>({id:a.id,type:a.type,x:a.x,z:a.z,friend:a.friend,health:a.health})),birds:wildlife.birds.length,jobActor:jobs.actor?{x:jobs.actor.x,z:jobs.actor.z,riding:jobs.actor.mesh.parent===state.driving?.mesh}:null,loungeSeated:!!state.loungeSeated,jump:state.jump,windows:!!interiors.active?.scene.userData.windowMaterial.map,mapRoute:state.mapRoute?.length,crew:state.crew}),
  lifeDepth:()=>({radio:radioSignal(state,vehicles.cars),playerColor:player.userData.cloth.color.getHexString(),driverColor:state.driving?.mesh.userData.driver.userData.cloth.color.getHexString(),snake:phoneUI.game?.body?{score:phoneUI.game.score,over:phoneUI.game.over}:null,memory:phoneUI.game?.cards?{cards:phoneUI.game.cards,matched:phoneUI.game.matched,moves:phoneUI.game.moves}:null,police:footPolice.people.map(p=>({id:p.id,x:p.x,z:p.z,path:p.navPath,recoveries:p.navRecoveries})),meetings:population.people.filter(p=>p.meeting).map(p=>({id:p.id,x:p.x,z:p.z,meeting:p.meeting}))}),
  setOfficer(id,x,z){const p=footPolice.people.find(p=>p.id===id);p.x=x;p.z=z;p.navAt=0;},
  serviceReady(kind,x,z){const u=(kind==='police'?emergency.patrols:emergency.ambulances)[0];if(u.incident){u.incident.closed=true;u.incident.person.medicalHold=false;u.incident=null;}for(const m of u.medics||[])m.visible=false;u.medics=[];u.stolen=false;u.assist=null;u.stage='idle';u.active=false;u.health=100;Object.assign(u.car,{x,z,health:100,speed:0,path:[],repath:0,impulseX:0,impulseZ:0});},
  serviceCalls:()=>[...emergency.patrols,...emergency.ambulances].filter(u=>u.assist).map(u=>({kind:u.assist.kind,phase:u.assist.phase,point:u.assist.point,x:u.car.x,z:u.car.z})),
  hurtOfficer:(id,damage)=>footPolice.hurt(footPolice.people.find(p=>p.id===id),damage,state),
  newSystems:()=>({aircraft:flight.craft.map(c=>({kind:c.kind,x:c.x,z:c.z,health:c.health})),items:interiors.active?.items,clubDancers:interiors.active?.scene.userData.dancers?.map(d=>({name:d.name,age:d.age,visible:d.mesh.visible})),families:families.people.map(p=>({name:p.name,age:p.age,routine:p.routine,x:p.x,z:p.z,visible:p.mesh.visible,outfit:p.outfit})),floor:interiors.active?.floor}),
  view(mode,angle,pitch=.12){state.cameraMode=mode;state.angle=angle;camAngle=angle;state.pitch=pitch;cutscene=1;},
  setCar(id,values){const c=vehicles.cars.find(c=>c.id===id);Object.assign(c,values);c.prev={x:c.x,z:c.z};c.mesh.position.set(c.x,.26,c.z);return c.id;},
  policeCrash(){const u=emergency.patrols[0];u.car.x=state.x+7;u.car.z=state.z;u.car.prev={x:u.car.x,z:u.car.z};u.car.speed=0;emergency.collision(state.driving,u.car,15,state);},
  wallet(value){state.money=value;},
  effects:()=>combat.effects.map(e=>({created:e.created,lifetime:e.lifetime,blood:e.blood})),
 };
}
