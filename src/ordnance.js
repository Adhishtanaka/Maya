import * as THREE from 'three';
import { clamp } from './systems.js';
export const ORDNANCE={grenade:{radius:6,damage:68,fuse:2.5,price:180},c4:{radius:7,damage:90,price:350},missile:{radius:7,damage:88,price:300}};
export function blastDamage(kind,distance){const w=ORDNANCE[kind];return w?Math.max(0,w.damage*(1-distance/w.radius)):0;}
export function bulletDamage(kind,distance){const base={fists:14,pistol:24,rifle:20}[kind]||0;return Math.round(base*(kind==='fists'?1:clamp(1-Math.max(0,distance-15)/150,.55,1)));}
export class Ordnance {
 constructor(scene,collision,onBlast){this.scene=scene;this.collision=collision;this.onBlast=onBlast;this.projectiles=[];this.flashes=[];this.cooldown=0;}
 launch(kind,s,aim,scene=this.scene,collision=this.collision){
  if(kind==='c4'&&s.altitude>.8)return false;
  if(!ORDNANCE[kind]||this.cooldown>0||!(s.inventory[kind]>0)||this.projectiles.length>=16||s.interior&&kind==='missile')return false;
  s.inventory[kind]--;this.cooldown=kind==='missile'?.8:.5;
  const start=new THREE.Vector3(s.x,1.4+(s.altitude||0),s.z),goal=new THREE.Vector3(aim.x,1,aim.z),dir=goal.sub(start).normalize(),mesh=new THREE.Mesh(kind==='c4'?new THREE.BoxGeometry(.32,.15,.4):new THREE.SphereGeometry(kind==='missile'?.19:.15,7,6),new THREE.MeshStandardMaterial({color:kind==='grenade'?'#919947':'#a62646',emissive:kind==='missile'?'#a62646':'#000000'}));
  const velocity=dir.multiplyScalar(kind==='missile'?58:kind==='grenade'?11:0);if(kind==='grenade')velocity.y=6;
  if(kind==='c4'){const dx=Math.sin(s.heading||0),dz=Math.cos(s.heading||0);if(collision.lineClear(s,{x:s.x+dx,z:s.z+dz},.2,1)){start.x+=dx;start.z+=dz;}start.y=.3;}
  mesh.position.copy(start);scene.add(mesh);this.projectiles.push({kind,mesh,scene,collision,velocity,age:0,interior:s.interior||null,floor:s.floor||0});return true;
 }
 detonate(s){let count=0;for(const p of [...this.projectiles])if(p.kind==='c4'&&p.interior===(s.interior||null)&&p.floor===(s.floor||0)){this.explode(p,s);count++;}return count;}
 explode(p,s){if(!this.projectiles.includes(p))return;const pos=p.mesh.position.clone();this.onBlast(p.kind,{x:pos.x,z:pos.z,y:pos.y},s,p);p.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();this.projectiles.splice(this.projectiles.indexOf(p),1);const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,1),new THREE.MeshBasicMaterial({color:'#f5bd67',transparent:true,opacity:.7,depthWrite:false}));mesh.position.copy(pos);p.scene.add(mesh);this.flashes.push({mesh,scene:p.scene,age:0});}
 update(dt,s){this.cooldown=Math.max(0,this.cooldown-dt);for(const p of [...this.projectiles]){p.age+=dt;if(p.kind==='c4')continue;if(p.kind==='grenade')p.velocity.y-=dt*9.8;const steps=Math.max(1,Math.ceil(p.velocity.length()*dt/.3));let impact=false;for(let i=0;i<steps;i++){const next=p.mesh.position.clone().addScaledVector(p.velocity,dt/steps);if(p.collision.blocked(next.x,next.z,.15,Math.max(.3,next.y))){impact=true;p.velocity.x*=-.3;p.velocity.z*=-.3;break;}p.mesh.position.copy(next);if(next.y<.3){p.mesh.position.y=.3;p.velocity.y=Math.abs(p.velocity.y)*.3;p.velocity.x*=.6;p.velocity.z*=.6;impact=true;break;}}
 if(p.kind==='missile'&&(impact||p.age>3)||p.kind==='grenade'&&p.age>=2.5)this.explode(p,s);}
 for(const f of [...this.flashes]){f.age+=dt;f.mesh.scale.setScalar(1+f.age*12);f.mesh.material.opacity=Math.max(0,.7-f.age);if(f.age>=.7){f.scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();this.flashes.splice(this.flashes.indexOf(f),1);}}
 }
}
