import { aircraftModel, canopyModel, part } from './mobility-models.js';
import * as THREE from 'three';
import { clamp, distance, BOUNDS } from './systems.js';
export const AIRCRAFT={helicopter:{name:'Maya Utility Helicopter',price:6500,maxSpeed:27,climb:12},plane:{name:'Coast Survey Plane',price:8500,maxSpeed:45,climb:9}};
export class Flight {
 constructor(scene,collision,player){this.scene=scene;this.collision=collision;this.player=player;this.craft=Object.entries(AIRCRAFT).map(([kind,spec],i)=>{const mesh=aircraftModel(kind),c={kind,spec,mesh,x:0,z:i?-306:-264,angle:0,altitude:0,health:100};mesh.position.set(c.x,.35,c.z);scene.add(mesh);return c;});this.canopy=canopyModel();this.canopy.visible=false;scene.add(this.canopy);this.pack=new THREE.Group();part(this.pack,.6,.6,.35,'#383536',0,1.35,-.36);for(const x of [-.3,.3])part(this.pack,.18,.7,.25,'#a62646',x,1.4,-.36);player.add(this.pack);this.pack.visible=false;}
 nearest(s){return this.craft.filter(c=>c.health>0&&c.altitude<1&&distance(c,s)<5).sort((a,b)=>distance(a,s)-distance(b,s))[0];}
 board(c,s){if(s.driving||s.interior||s.flightMode)return false;s.crouching=false;s.cover=null;s.jump=0;this.player.scale.y=1;s.flightMode=c.kind;s.aircraft=c;s.x=c.x;s.z=c.z;s.altitude=c.altitude;s.airSpeed=0;s.heading=c.angle;s.angle=c.angle+Math.PI;return true;}
 jetpack(s){if(s.driving||s.interior||s.transition||!s.inventory.jetpack)return false;if(s.flightMode==='jetpack'){s.flightMode=s.altitude>2?'fall':null;return true;}if(s.flightMode)return false;s.crouching=false;s.cover=null;s.jump=0;this.player.scale.y=1;s.flightMode='jetpack';s.altitude=0;s.airSpeed=0;return true;}
 parachute(s){if(!s.flightMode||s.altitude<5||!s.inventory.parachute)return false;if(s.aircraft){s.aircraft.abandoned=true;s.aircraft=null;}s.flightMode='parachute';s.airSpeed=7;return true;}
 exit(s){if(s.altitude>1.2)return false;const c=s.aircraft;if(c){const spot=[-1,1].map(v=>({x:c.x+Math.cos(c.angle)*4*v,z:c.z-Math.sin(c.angle)*4*v})).find(p=>!this.collision.blocked(p.x,p.z,.65));if(!spot)return false;s.x=spot.x;s.z=spot.z;c.altitude=0;c.mesh.position.y=.35;}s.flightMode=null;s.aircraft=null;s.altitude=0;s.airSpeed=0;this.player.visible=true;return true;}
 update(dt,s,input,onDamage){
  for(const c of this.craft){c.mesh.userData.rotor.rotation[c.kind==='plane'?'z':'y']+=dt*(c===s.aircraft?35:0);if(c.abandoned){c.altitude=Math.max(0,c.altitude-dt*7);c.mesh.position.y=.35+c.altitude;if(!c.altitude){c.health=0;c.abandoned=false;c.mesh.rotation.z=.3;}}}
  this.pack.visible=s.flightMode==='jetpack';this.canopy.visible=s.flightMode==='parachute';if(!s.flightMode)return false;
  const kind=s.flightMode,craft=s.aircraft,rotor=kind==='helicopter',plane=kind==='plane',powered=rotor||plane||kind==='jetpack';
  if(craft){craft.angle+=(Number(input.left)-Number(input.right))*dt*(plane?.8:1.35);s.heading=craft.angle;if(s.elapsed-(s.lastLook||0)>1.6)s.driveOrbit=(s.driveOrbit||0)*Math.exp(-dt*2);s.angle=craft.angle+Math.PI+(s.driveOrbit||0);s.airSpeed=clamp((s.airSpeed||0)+(input.up?12:input.down?-16:-4)*dt,0,craft.spec.maxSpeed);}
  else{s.heading=s.angle+Math.PI;s.airSpeed=input.up?(kind==='parachute'?10:17):input.down?-7:0;}
  let vertical=powered?((input.ascend?1:0)-(input.descend?1:0))*(craft?.spec.climb||11):kind==='parachute'?-3.2:-15;
  if(plane){if((s.airSpeed||0)<14&&s.altitude>0)vertical=Math.min(vertical,-6);if(input.ascend&&s.airSpeed<12)vertical=0;}
  if(kind==='jetpack'&&!s.cheats?.fly){s.fuel=Math.max(0,s.fuel-dt*(s.altitude>0?1:.15));if(s.fuel===0){s.flightMode='fall';vertical=-15;}}
  const nextHeight=clamp((s.altitude||0)+vertical*dt,0,100),old={x:s.x,z:s.z},speed=s.airSpeed||0,side=!craft?(Number(input.left)-Number(input.right))*8:0;
  const dx=(Math.sin(s.heading)*speed+Math.cos(s.heading)*side)*dt,dz=(Math.cos(s.heading)*speed-Math.sin(s.heading)*side)*dt;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.4));let impact=false;
  for(let n=0;n<steps;n++){const x=clamp(s.x+dx/steps,BOUNDS.minX+4,BOUNDS.maxX-4),z=clamp(s.z+dz/steps,BOUNDS.minZ+4,BOUNDS.maxZ-4);if(this.collision.blocked(x,z,craft?1.6:.6,nextHeight+.5)){impact=true;break;}s.x=x;s.z=z;}
  if(!this.collision.blocked(s.x,s.z,craft?1.6:.6,nextHeight+.5))s.altitude=nextHeight;else{impact=true;s.x=old.x;s.z=old.z;}
  if(impact){s.airSpeed=0;if(!s.flightHit||s.elapsed-s.flightHit>1){onDamage(Math.min(18,Math.abs(speed)*.5));s.flightHit=s.elapsed;if(craft)craft.health=Math.max(0,craft.health-15);}}
  if(craft){Object.assign(craft,{x:s.x,z:s.z,altitude:s.altitude});craft.mesh.position.set(s.x,s.altitude+.35,s.z);craft.mesh.rotation.y=craft.angle;craft.mesh.rotation.z=(Number(input.right)-Number(input.left))*(plane?.3:.1);if(craft.health<=0){craft.abandoned=true;s.aircraft=null;s.flightMode='fall';}}
  this.player.position.set(s.x,.3+s.altitude,s.z);this.player.rotation.y=s.heading;this.player.visible=!craft&&s.cameraMode!=='first';this.canopy.position.set(s.x,s.altitude,s.z);this.canopy.rotation.y=s.heading;
  if(s.altitude===0&&['fall','parachute'].includes(s.flightMode)){if(s.flightMode==='fall')onDamage(55);this.exit(s);}
  s.speed=s.airSpeed||0;s.walking=false;return true;
 }
}
