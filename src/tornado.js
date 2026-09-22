import * as THREE from 'three';
import {clamp,distance} from './physics.js';
export function windStrength(d){return Math.max(0,1-d/30);}
export class Tornado{
 constructor(scene){this.scene=scene;this.mesh=new THREE.Group();this.mesh.visible=false;scene.add(this.mesh);for(let i=0;i<24;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1+i*.35,.55,5,18),new THREE.MeshBasicMaterial({color:i%2?'#777367':'#383536',transparent:true,opacity:.38,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=i*1.4;this.mesh.add(ring);}this.active=null;this.nextNatural=120;}
 update(dt,s,vehicles,population,onDamage){if(!this.active&&(s.weatherMode==='tornado'||s.elapsed>this.nextNatural&&s.weather==='rain'&&s.z>145&&Math.random()<.0005)){this.active={x:clamp(s.x+38,-280,60),z:clamp(s.z+20,-270,240),age:0};this.nextNatural=s.elapsed+240;this.onWarning?.();}const t=this.active;if(!t){s.tornado=null;return;}t.age+=dt;t.x+=Math.sin(t.age*.05)*dt*1.8;t.z+=Math.cos(t.age*.07)*dt*1.3;s.tornado={x:t.x,z:t.z,radius:30,warning:t.age<5};this.mesh.visible=!s.interior;this.mesh.position.set(t.x,0,t.z);this.mesh.children.forEach((m,i)=>{m.rotation.z=s.elapsed*(2+i*.03);m.position.x=Math.sin(s.elapsed*2+i*.3)*.5;});if(t.age>65){this.active=null;this.mesh.visible=false;s.tornado=null;if(s.weatherMode==='tornado')s.weatherMode='rain';return;}if(t.age<5)return;
 const impulse=(p,mul)=>{const d=distance(p,t),f=windStrength(d);if(!f)return null;const dx=(t.x-p.x)/Math.max(1,d),dz=(t.z-p.z)/Math.max(1,d);return {x:(dx-dz*.6)*f*mul,z:(dz+dx*.6)*f*mul,f};};
 if(!s.interior){const v=impulse(s,16);if(v&&!s.driving){s.knocked=Math.max(s.knocked,.15);s.knockX=v.x;s.knockZ=v.z;if(v.f>.65&&s.elapsed>=(t.nextDamage||0)){onDamage(8);t.nextDamage=s.elapsed+1;}}}
 for(const car of vehicles.cars){const v=impulse(car,20);if(v){car.impulseX+=v.x*dt;car.impulseZ+=v.z*dt;car.spin+=v.f*dt;car.health=Math.max(0,car.health-v.f*dt*3);}}
 for(const p of population.people)if(!p.inside&&!p.dead&&!p.vehicle){const v=impulse(p,9);if(v){p.impulse={x:v.x,z:v.z};p.fleeUntil=s.elapsed+4;}}
 }
}
