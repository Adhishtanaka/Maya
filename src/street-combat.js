import * as THREE from 'three';
import { weaponModel } from './combat.js';
import { distance } from './systems.js';
import { aimedShotHits } from './tactics.js';
import {react} from './reactions.js';
export class StreetCombat {
 constructor(scene,population,combat,collision){this.scene=scene;this.population=population;this.combat=combat;this.collision=collision;this.drops=[];
  for(const p of population.people.filter(p=>p.gang)){p.gangWeapon=Number(p.id.split('-')[1])%2?'rifle':'pistol';const gun=weaponModel(p.gangWeapon);gun.position.set(.4,1.28,.2);p.mesh.add(gun);p.gun=gun;p.dropped=!!p.dropped||p.dead||p.removed;gun.visible=!p.dropped;p.hostileUntil=0;p.shotTimer=0;}
 }
 alert(position,state){for(const p of this.population.people)if(p.gang&&!p.dead&&!(state.crew?.includes(p.id)&&p.relationship>=0)&&distance(p,position)<35&&!p.inside)p.hostileUntil=state.elapsed+25;}
 drop(position,weapon,state,ownerScene=this.scene,interior=null,source=position.id||null){if(this.drops.length>=24)this.remove(this.drops[0]);const mesh=weaponModel(weapon);mesh.position.set(position.x,.55,position.z);mesh.rotation.z=Math.PI/2;ownerScene.add(mesh);const drop={ownerScene,interior,source,floor:0,x:position.x,z:position.z,weapon,mesh,created:state.elapsed};this.drops.push(drop);return drop;}
 remove(drop){drop.ownerScene.remove(drop.mesh);drop.mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.drops.splice(this.drops.indexOf(drop),1);}
 nearest(state){return this.drops.find(d=>d.interior===(state.interior||null)&&d.floor===(state.floor||0)&&distance(d,state)<2.5);}
 collect(drop,state){if(!this.drops.includes(drop))return;state.inventory[drop.weapon]=true;const key=drop.weapon+'Ammo',cap=drop.weapon==='rifle'?600:300;state.inventory[key]=Math.min(cap,state.inventory[key]+(drop.weapon==='rifle'?30:12));this.remove(drop);this.combat.equip(drop.weapon,state);this.combat.reload(state);}
 update(dt,state,hurtPlayer){
  for(const d of [...this.drops]){if(state.elapsed-d.created>=120)this.remove(d);else d.mesh.position.y=.55+Math.sin(state.elapsed*3)*.08;}
  for(const p of this.population.people.filter(p=>p.gang)){
   if((p.dead||p.injured)&&!p.dropped){p.dropped=true;p.gun.visible=false;if(!p.inside)this.drop(p,p.gangWeapon,state);else if(this.interior?.()?.building.id===p.inside&&this.interior().floor===0)this.drop(p.interiorPosition||p,p.gangWeapon,state,this.interior().scene,p.inside,p.id);}
   if(p.dead||p.dropped||p.injured||p.removed||p.inside||p.vehicle||state.interior)continue;
   if(state.crew?.includes(p.id)&&p.relationship>=0){p.aim=null;p.hostileUntil=0;continue;}
   if(p.hostileUntil<=state.elapsed){p.aim=null;continue;}
   const sees=distance(p,state)<32&&this.collision.lineClear(p,state,.1,1.4);p.shotTimer=Math.max(0,p.shotTimer-dt);
   if(!sees){p.aim=null;continue;}
   p.stun=.15;p.mesh.rotation.y=Math.atan2(state.x-p.x,state.z-p.z);p.mesh.userData.armR.rotation.x=-1.3;
   if(!p.aim&&p.shotTimer<=0){p.aim={x:state.x,z:state.z};p.aimTime=.85;}
   if(p.aim){p.aimTime-=dt;if(p.aimTime<=0){if(aimedShotHits(p,p.aim,state,this.collision)){if(state.driving)state.driving.health=Math.max(0,state.driving.health-6);hurtPlayer(state.driving?3:9);}react(p.mesh,'shoot',state.elapsed);this.combat.tracer(p,p.aim,state.elapsed);this.combat.audio.play('gunshot');p.aim=null;p.shotTimer=p.gangWeapon==='rifle'?.65:1.4;}}
  }
 }
}
