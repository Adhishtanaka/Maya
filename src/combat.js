import * as THREE from 'three';
import {react} from './reactions.js';
import { bulletDamage } from './ordnance.js';
import { distance, clamp } from './systems.js';
import { segmentDistance } from './physics.js';
export const WEAPONS={
 bazooka:{name:'BAZOOKA',damage:88,range:175,cooldown:.9},
 fists:{name:'UNARMED',damage:14,range:2.6,cooldown:.45},
 pistol:{name:'SERVICE PISTOL',damage:24,range:65,cooldown:.28,magazine:12,reload:1.1},
 rifle:{name:'CARBINE',damage:20,range:100,cooldown:.11,magazine:30,reload:1.7},
};
export const BLOOD_LIFETIME=60;
export function expiredEffect(created,now,lifetime=BLOOD_LIFETIME){return now-created>=lifetime;}
export function weaponModel(kind){
 const g=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:'#30434b',metalness:.55,roughness:.35}),grip=new THREE.MeshStandardMaterial({color:'#726048'});
 const part=(w,h,d,x,y,z,m=metal)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);g.add(mesh);};
 if(kind==='bazooka'){const tube=new THREE.Mesh(new THREE.CylinderGeometry(.18,.23,1.7,10),metal);tube.rotation.x=Math.PI/2;tube.position.z=.2;g.add(tube);part(.12,.2,.12,0,.25,.6);part(.15,.3,.15,0,-.23,0,grip);return g;}
 part(.16,.18,kind==='rifle'?1.2:.55,0,0,.2);part(.14,.35,.17,0,-.2,0,grip);if(kind==='rifle'){part(.2,.28,.45,0,-.02,-.5,grip);part(.09,.1,.45,0,.03,.9);}
 return g;
}
export class Combat {
 constructor(scene,population,audio,toast){this.scene=scene;this.population=population;this.audio=audio;this.toast=toast;this.effects=[];this.cooldown=0;this.reloadRemaining=0;this.clips={pistol:0,rifle:0};this.gun=null;this.player=null;this.weapon='fists';}
 initialize(state,player){this.player=player;this.clips.pistol=Math.min(12,state.inventory.pistolAmmo);this.clips.rifle=Math.min(30,state.inventory.rifleAmmo);if(!this.equip(state.weapon,state))this.equip('fists',state);}
 equip(kind,state){
  if(kind!=='fists'&&!state.inventory[kind]){this.toast('Find firearms at Fernando Sporting Goods, or open the locker inside your apartment.');return false;}
  if(this.gun){this.player.remove(this.gun);this.gun.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.gun=null;}
  state.weapon=kind;this.weapon=kind;this.reloadRemaining=0;
  if(kind!=='fists'){this.gun=weaponModel(kind);this.gun.position.set(.44,1.3,.25);this.player.add(this.gun);}
  this.audio.play('ui');return true;
 }
 reload(state){
  const w=WEAPONS[state.weapon];if(!w.magazine||this.reloadRemaining>0||state.inventory[state.weapon+'Ammo']<=this.clips[state.weapon])return;
  this.reloadRemaining=w.reload;this.audio.play('reload');
 }
 blood(scene,position,elapsed,size=.7){
  const mesh=new THREE.Mesh(new THREE.CircleGeometry(size,11),new THREE.MeshBasicMaterial({color:'#7f2830',transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  mesh.rotation.x=-Math.PI/2;mesh.rotation.z=Math.random()*Math.PI;mesh.scale.x=1.3;mesh.position.set(position.x,.285,position.z);scene.add(mesh);this.effects.push({mesh,scene,created:elapsed,lifetime:BLOOD_LIFETIME,blood:true});
  // Bounded decals: sustained combat cannot grow GPU memory indefinitely.
  if(this.effects.filter(e=>e.blood).length>80){const old=this.effects.find(e=>e.blood);this.removeEffect(old);}
 }
 removeEffect(effect){effect.scene.remove(effect.mesh);effect.mesh.geometry.dispose();effect.mesh.material.dispose();this.effects=this.effects.filter(e=>e!==effect);}
 hurtResident(p,amount,state,{crime=false,scene=this.scene,position=p,source=null}={}){
  if(p.dead||p.removed||amount<=0)return;
  p.health=clamp(p.health-amount,0,100);p.relationship=clamp(p.relationship-(crime?20:0),-100,100);p.stun=.65;react(p.mesh,p.health<=0?'death':p.health<=20?'down':'hit',state.elapsed,(source?.x??state.x)<p.x?1:-1);
  if(amount>5)this.blood(scene,position,state.elapsed,p.health===0?1.1:.35);
  this.population.frighten(p,state.elapsed);this.onReaction?.(p,state,crime,scene,position);
  if(p.health<=20){p.injured=true;p.route=[];}
  if(p.health<=0){p.dead=true;p.deathAt=state.elapsed;p.injured=true;}
  if(source?.mesh&&Number.isFinite(source.angle)&&amount>5&&!p.inside){p.impulse={x:Math.sin(source.angle)*Math.min(15,Math.max(5,Math.abs(source.speed)*.75)),z:Math.cos(source.angle)*Math.min(15,Math.max(5,Math.abs(source.speed)*.75))};}
  this.onInjury?.(p,state,source);
  if(crime){state.reputation=Math.max(0,state.reputation-3);state.factions.community=clamp(state.factions.community-3,-100,100);this.onCrime?.(p.dead?2:1,source||p);}
 }
 attack(state,aim,collision,activeScene,interiorPeople=[]){
  if(state.altitude>2&&state.weapon!=='bazooka'||state.transition||state.driving||state.knocked>0||state.dodge>0||this.cooldown>0||this.reloadRemaining>0)return false;
  const weapon=WEAPONS[state.weapon];
  if(state.weapon==='bazooka'){const fired=this.onLaunch?.(state,aim);if(fired){this.cooldown=.9;react(this.player,'shoot',state.elapsed);}return !!fired;}
  if(state.weapon!=='fists'&&this.clips[state.weapon]<=0){this.reload(state);if(!this.reloadRemaining)this.toast('Out of ammunition. Visit Fernando Sporting Goods.');return false;}
  this.cooldown=weapon.cooldown;state.exposed=.9;react(this.player,state.weapon==='fists'?'punch':'shoot',state.elapsed);
  const direction={x:aim.x-state.x,z:aim.z-state.z},len=Math.hypot(direction.x,direction.z)||1;direction.x/=len;direction.z/=len;
  this.player.rotation.y=Math.atan2(direction.x,direction.z);this.player.userData.armR.rotation.x=-1.5;
  let endpoint={x:state.x+direction.x*weapon.range,z:state.z+direction.z*weapon.range};
  for(let d=.5;d<weapon.range;d+=.35){const x=state.x+direction.x*d,z=state.z+direction.z*d;if(collision.blocked(x,z,.06,1.4)){endpoint={x,z};break;}}
  const targets=state.interior?interiorPeople.map(p=>({p:p.resident,position:p})):this.population.people.filter(p=>!p.vehicle&&!p.inside&&!p.removed).map(p=>({p,position:p}));
  const hit=targets.filter(t=>!t.p.dead&&segmentDistance(t.position,state,endpoint)<(state.weapon==='fists'?.95:.65)).sort((a,b)=>distance(a.position,state)-distance(b.position,state))[0];
  const vehicleHit=state.weapon==='fists'||state.interior?null:(this.vehicleTargets?.()||[]).filter(t=>segmentDistance(t,state,endpoint)<1.5&&distance(state,t)<distance(state,endpoint)).sort((a,b)=>distance(a,state)-distance(b,state))[0];
  const external=state.interior?null:(this.externalTargets?.()||[]).filter(t=>segmentDistance(t,state,endpoint)<.65).sort((a,b)=>distance(a,state)-distance(b,state))[0];
  if(external&&(!hit||distance(state,external)<distance(state,hit.position))&&(!vehicleHit||distance(state,external)<distance(state,vehicleHit))){endpoint={x:external.x,z:external.z};this.onExternalHit?.(external,bulletDamage(state.weapon,distance(state,external)));}
  if(vehicleHit&&distance(state,vehicleHit)<=distance(state,endpoint)&&(!hit||distance(state,vehicleHit)<distance(state,hit.position))){
   endpoint={x:vehicleHit.x,z:vehicleHit.z};this.onVehicleHit?.(vehicleHit,bulletDamage(state.weapon,distance(state,vehicleHit)),state);
  }
  if(hit&&distance(state,hit.position)<=distance(state,endpoint)+.3){
   this.hurtResident(hit.p,bulletDamage(state.weapon,distance(state,hit.position)),state,{crime:true,scene:activeScene,position:hit.position,source:state.interior?this.outsidePosition?.()||state:state});
   endpoint={x:hit.position.x,z:hit.position.z};
  }
  this.onShotTarget?.(state,endpoint,weapon.damage);
  if(state.weapon!=='fists'){
   const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(.17,0),new THREE.MeshBasicMaterial({color:'#ffe4a1'}));flash.position.set(state.x+direction.x*.7,1.45,state.z+direction.z*.7);activeScene.add(flash);this.effects.push({mesh:flash,scene:activeScene,created:state.elapsed,lifetime:.065});
   this.clips[state.weapon]--;state.inventory[state.weapon+'Ammo']--;
   const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(state.x,1.45,state.z),new THREE.Vector3(endpoint.x,1.45,endpoint.z)]);
   const mesh=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#f4dba2',transparent:true,opacity:.8}));activeScene.add(mesh);this.effects.push({mesh,scene:activeScene,created:state.elapsed,lifetime:.075});
   this.audio.play('gunshot');this.onCrime?.(1,state.interior?this.outsidePosition?.()||state:state);this.population.frighten(state.interior?this.outsidePosition?.()||state:state,state.elapsed,45);
  }else this.audio.play('punch');
  return true;
 }
 tracer(start,end,elapsed){const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(start.x,1.45,start.z),new THREE.Vector3(end.x,1.45,end.z)]);const mesh=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#ffd7a0'}));this.scene.add(mesh);this.effects.push({mesh,scene:this.scene,created:elapsed,lifetime:.1});}
 update(dt,state){
  this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.reloadRemaining>0){this.reloadRemaining-=dt;if(this.reloadRemaining<=0)this.clips[state.weapon]=Math.min(WEAPONS[state.weapon].magazine,state.inventory[state.weapon+'Ammo']);}
  for(const effect of [...this.effects]){
   if(expiredEffect(effect.created,state.elapsed,effect.lifetime)){this.removeEffect(effect);continue;}
   if(effect.blood)effect.mesh.material.opacity=.85*clamp((effect.created+60-state.elapsed)/8,0,1);
  }
  for(const p of this.population.people)if(p.dead&&p.deathAt!=null&&state.elapsed-p.deathAt>=60){p.mesh.visible=false;p.removed=true;}
  if(this.gun)this.gun.rotation.x=this.reloadRemaining>0?-.8:this.cooldown>0?-.12:0;
 }
}
