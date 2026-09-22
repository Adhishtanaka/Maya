import * as THREE from 'three';
import { clamp, weatherAt } from './systems.js';
export class Atmosphere {
 constructor(scene,world){
  this.scene=scene;this.world=world;
  this.hemi=new THREE.HemisphereLight('#e5e8cd','#52645e',2);scene.add(this.hemi);
  this.sun=new THREE.DirectionalLight('#ffcf98',3);const sun=this.sun;sun.position.set(-65,85,45);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,far:230});sun.shadow.normalBias=.08;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
  this.nightLights=Array.from({length:6},()=>{const l=new THREE.PointLight('#ffe0a4',0,21,2);scene.add(l);return l;});
  this.headlight=new THREE.SpotLight('#ffe9b0',0,45,.44,.6,1.2);scene.add(this.headlight,this.headlight.target);
  this.count=800;this.positions=new Float32Array(this.count*3);for(let i=0;i<this.count;i++){this.positions[i*3]=(Math.random()-.5)*110;this.positions[i*3+1]=Math.random()*48;this.positions[i*3+2]=(Math.random()-.5)*110;}
  this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));
  this.snow=new THREE.Points(this.geometry,new THREE.PointsMaterial({color:'#edf5ed',size:.25,transparent:true,opacity:.9,depthWrite:false}));this.snow.frustumCulled=false;scene.add(this.snow);
  this.streaks=new Float32Array(this.count*6);this.rainGeometry=new THREE.BufferGeometry();this.rainGeometry.setAttribute('position',new THREE.BufferAttribute(this.streaks,3));
  this.rain=new THREE.LineSegments(this.rainGeometry,new THREE.LineBasicMaterial({color:'#d6ece9',transparent:true,opacity:.35,depthWrite:false}));this.rain.frustumCulled=false;scene.add(this.rain);
  this.daySky=new THREE.Color('#b4cbc4');this.eveningSky=new THREE.Color('#c5ad9d');this.nightSky=new THREE.Color('#122032');this.rainSky=new THREE.Color('#6f8c95');this.sky=new THREE.Color();
  this.weatherTimer=0;
 }
 update(dt,state,outside){
  this.weatherTimer+=dt;if(this.weatherTimer>90){state.weatherRoll=Math.random();this.weatherTimer=0;}
  const position=state.interior?outside:state;state.weather=weatherAt(state.weatherMode,position.z,state.weatherRoll);
  const h=state.hour,daylight=clamp(Math.sin((h-6)/24*Math.PI*2)*2.1,0,1),evening=h>16&&h<20?Math.max(0,1-Math.abs(h-18)/2):h>4&&h<7?.35:0;
  this.sky.copy(this.nightSky).lerp(this.daySky,daylight).lerp(this.eveningSky,evening*.65);if(state.weather!=='clear')this.sky.lerp(this.rainSky,['rain','tornado'].includes(state.weather)?.55:.32);
  this.scene.background.copy(this.sky);this.scene.fog.color.copy(this.sky);this.scene.fog.density=['rain','tornado'].includes(state.weather)?.005:state.weather==='snow'?.006:.002;
  this.hemi.intensity=.36+daylight*1.8;this.sun.intensity=(.18+daylight*2.3+evening*.8)*(['rain','tornado'].includes(state.weather)?.4:1);
  this.sun.color.set(daylight>.8?'#fff1d5':evening>.2?'#ffc38d':'#9badcf');this.sun.position.set(position.x-65,65+daylight*30,position.z+35);this.sun.target.position.set(position.x,0,position.z);
  this.world.water.material.color.set(['rain','tornado'].includes(state.weather)?'#466d79':daylight>.3?'#448e94':'#183d50');this.world.water.position.y=-.6+Math.sin(state.elapsed*.5)*.035;
  this.world.roadMat.roughness=['rain','tornado'].includes(state.weather)?.24:.93;this.world.roadMat.metalness=['rain','tornado'].includes(state.weather)?.35:.05;
  for(const m of this.world.windows)m.emissiveIntensity=.08+(1-daylight)*1.65;
  const nearby=this.world.lamps.map(p=>({p,d:Math.hypot(p.x-position.x,p.z-position.z)})).sort((a,b)=>a.d-b.d);
  this.nightLights.forEach((l,i)=>{l.position.copy(nearby[i].p);l.intensity=i<(this.quality?.lights??6)?(1-daylight)*33:0;});
  this.headlight.intensity=state.driving?(1-daylight)*85:0;if(state.driving){const c=state.driving;this.headlight.position.set(c.x,2,c.z);this.headlight.target.position.set(c.x+Math.sin(c.angle)*15,.2,c.z+Math.cos(c.angle)*15);}
  this.snow.visible=state.weather==='snow';this.rain.visible=['rain','tornado'].includes(state.weather);
  if(this.snow.visible||this.rain.visible){
   const snow=this.snow.visible;this.snow.position.set(position.x,0,position.z);this.rain.position.copy(this.snow.position);
   for(let i=0;i<(this.quality?.particles??this.count);i++){const k=i*3,j=i*6;this.positions[k+1]-=dt*(snow?2.5:36);this.positions[k]+=dt*(snow?Math.sin(state.elapsed+i)*.9:-4);if(this.positions[k+1]<0){this.positions[k+1]=48;this.positions[k]=(Math.random()-.5)*110;this.positions[k+2]=(Math.random()-.5)*110;}this.streaks[j]=this.positions[k];this.streaks[j+1]=this.positions[k+1];this.streaks[j+2]=this.positions[k+2];this.streaks[j+3]=this.positions[k]+.2;this.streaks[j+4]=this.positions[k+1]+1.7;this.streaks[j+5]=this.positions[k+2];}
   this.geometry.attributes.position.needsUpdate=true;this.rainGeometry.attributes.position.needsUpdate=true;
  }
  for(const marker of this.world.markers){marker.gem.position.y=2.8+Math.sin(state.elapsed*2)*.25;marker.gem.rotation.y=state.elapsed*.5;}
 }
}
