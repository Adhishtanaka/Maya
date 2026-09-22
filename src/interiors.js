import {foodModel} from './shop-props.js';
import * as THREE from 'three';
import { CollisionWorld } from './physics.js';
import { createPerson, dressPerson } from './actor-models.js';
import { buildingTask } from './interior-activities.js';
import { animatePerson } from './actor-models.js';
import {OUTFITS} from './wardrobe.js';
import { weaponModel } from './combat.js';

// Interiors are separate scenes, built on demand for every registered building.
export class Interiors {
 constructor(outdoor,population){this.outdoor=outdoor;this.population=population;this.active=null;this.cache=new Map();this.returnPoint=null;}
 build(building,floor=0){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#263c3e');
  scene.add(new THREE.HemisphereLight('#fff1d8','#5c6a63',2.8));const light=new THREE.PointLight('#ffe5b9',85,35);light.position.set(0,5,0);scene.add(light);
  const objects=[],solids=[],items=[],people=[];
  const material=new Map();const mat=color=>{if(!material.has(color))material.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return material.get(color);};
  const box=(x,y,z,w,h,d,color,solid=false)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);objects.push(mesh);
   if(solid)solids.push({x,z,w,d,height:y+h/2,kind:'furniture'});return mesh;
  };
  const wall=(x,z,w,d)=>box(x,1.65,z,w,3.3,d,'#c5c3a9',true);
  box(0,-.05,0,23,.4,21,building.kind==='warehouse'?'#89928b':'#b49d7e');
  wall(-11,0,.3,20);wall(11,0,.3,20);box(0,.5,-10,22,1,.3,'#c5c3a9',true);box(0,3,-10,22,.6,.3,'#c5c3a9',true);for(const x of [-10.8,-3.6,3.6,10.8])box(x,1.9,-10,.16,1.8,.3,'#383536',true);solids.push({x:0,z:-10,w:22,d:.3,height:3.3,kind:'window'});const windowMaterial=new THREE.MeshBasicMaterial({color:'#dce9df'}),windowPane=new THREE.Mesh(new THREE.PlaneGeometry(21.5,1.7),windowMaterial);windowPane.position.set(0,1.9,-10.02);scene.add(windowPane);scene.userData.windowMaterial=windowMaterial;wall(-6.2,10,9.6,.3);wall(6.2,10,9.6,.3);
  const ceiling=box(0,3.55,0,22,.15,20,'#d5d1b8');ceiling.visible=false;scene.userData.ceiling=ceiling;
  const exit=new THREE.Mesh(new THREE.RingGeometry(.8,1.05,24),new THREE.MeshBasicMaterial({color:'#d4e7a1',side:THREE.DoubleSide}));exit.rotation.x=-Math.PI/2;exit.position.set(0,.17,8.5);scene.add(exit);
  items.push({id:'exit',x:0,z:8.5,name:'Return to '+building.name,action:'exit'});
  const item=(id,x,z,name,action)=>{
   items.push({id,x,z,name,action});const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.18),new THREE.MeshBasicMaterial({color:'#e6d697'}));gem.position.set(x,1.8,z);scene.add(gem);
  };
  const table=(x,z,w=3,d=1.6)=>{box(x,.9,z,w,.2,d,'#8f7357',true);for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.2),.43,z+b*(d/2-.2),.14,.8,.14,'#5e6051');};
  const bed=(x,z)=>{box(x,.55,z,2.6,.8,4,'#8d7b66',true);box(x,1,z,2.5,.3,3.8,'#d9d9c0');box(x,1.2,z-1.2,1.9,.22,.65,'#f0e9d3');};
  const shelf=(x,z)=>{box(x,1.1,z,3,2.2,.6,'#7a7760',true);for(let i=0;i<5;i++)box(x-1.1+i*.5,1.35,z+.4,.3,.6,.25,['#9baa8d','#a88371','#b4b796'][i%3]);};
  const kind=floor?'upper':building.kind;
  if(kind==='upper'){
   wall(0,-6,.22,8);wall(0,6,.22,4);wall(-7,0,5,.22);wall(7,0,5,.22);
   bed(-7,-6);shelf(-9,-1);table(6,-6,4);box(6,1.5,-6,1.2,.7,.12,'#383536');box(7,.7,5,4,1.1,1.5,'#919947',true);table(-6,5,3);shelf(8,-8);
   item('work-a',-6,-2,'Work station · '+buildingTask(building)[0],'work-a');item('work-b',6,-2,'Work station · '+buildingTask(building)[1],'work-b');
   items[0].action='floor-down';items[0].name='Stairs · ground floor';
  }else if(kind==='club'){
   box(0,.22,-4,12,.2,8,'#a62646');table(0,-8,7);for(const x of [-8,8]){box(x,1,-7,1.4,2,1.4,'#383536',true);box(x,.6,3,2,1.1,4,'#a62646',true);}table(-6,7,5);item('bar',-6,5,'Order refreshments','food');item('dj',0,-6,'Select the club music','club-music');item('lounge',7,5,'Adult lounge · drinks & performances','club-lounge');
   scene.userData.dancers=Array.from({length:4},(_,i)=>{const mesh=createPerson(['#bd8e68','#966e51'][i%2],['#a62646','#919947','#faf7ee','#6b879a'][i],{gender:i===3?'man':'woman',variant:i,height:.95+i*.02});mesh.position.set(-3+i*2,.35,-3);scene.add(mesh);return {id:'club-dancer-'+i,x:-3+i*2,z:-3,job:'Club performer',relationship:0,met:false,helped:true,routine:'evening performance',outfit:'work',story:['I teach dance after my morning shift at the bakery. My first class had two people; now the whole block comes.','My sister and I stitch our own stage clothes. We save each show’s earnings for a costume workshop.','I used to work on the harbor accounts. Music gave me another way to bring our neighborhood together.','I rehearse on the roof at sunrise. Next month I am teaching a beginner class at the community hall.'][i],dialogue:['Try the slow step first. Listen for the bass before moving your feet.','This jacket took three evenings to sew. Olive and burgundy catch the stage lights beautifully.','The early set is house, but I always ask for dub after midnight.','I learned this routine from my aunt. She still corrects my timing.'][i],mesh,age:25+i*3,name:['Nadeesha','Roshini','Samira','Dinesh'][i]};});
   scene.userData.couples=Array.from({length:2},(_,i)=>{const mesh=createPerson('#bd8e68',i?'#919947':'#a62646',{gender:i?'man':'woman',variant:i});mesh.position.set(-4+i*.5,.3,3);mesh.rotation.y=i?-Math.PI/2:Math.PI/2;scene.add(mesh);return mesh;});
   const disco=new THREE.PointLight('#a62646',25,18);disco.position.set(0,3,-3);scene.add(disco);scene.userData.disco=disco;
  }else if(['apartment','house','cabin'].includes(kind)){
   // Living room, bedroom, kitchen and bathroom with traversable doorways.
   wall(-2,-6,.2,8);wall(-2,6,.2,4);wall(-7,0,5,.2);wall(7,-2,8,.2);wall(3,-6,.2,8);
   bed(-7,-6);box(-7,.4,5,4,.6,2,'#809889',true);box(-7,1.1,5.7,4,.9,.5,'#809889',true);table(-6,2);
   box(7,.8,-7,6,1.5,1.5,'#b4b9a4',true);box(5,1.61,-7,1.2,.05,1.1,'#455c5b');box(9,1.61,-7,1.2,.05,1.1,'#e2ded0');
   box(7,.35,6,4,.6,2,'#d9dfca',true);box(7,.8,8,1,1.1,1,'#d9dfca',true);shelf(-9,-1);
   item('rest',-7,-3.5,'Rest until morning','rest');
   if(building.id==='home')item('starter',-8,-1,'Open your equipment locker','starter');
   if(building.id==='outlook')item('property',3,1,'Mistwood cabin deed','property');
  }else if(kind==='clothing'){
   table(0,-7,12);const colors=Object.values(OUTFITS);for(const [i,o] of colors.entries()){const x=-8+(i%3)*8,z=i<3?-4:3,mannequin=createPerson('#c2bba8',o.color);dressPerson(mannequin,o.style,o.color);mannequin.position.set(x,.3,z);scene.add(mannequin);solids.push({x,z,r:.65,height:2.6,kind:'display'});item('outfit-'+Object.keys(OUTFITS)[i],x,z+2,'Try '+o.name,'clothing');}
   item('tailor',0,6,'Speak with Sewwandi · clothing & fitting','clothing');
  }else if(kind==='armory'){
   table(0,-4,14,1.5);shelf(-8,-8);shelf(0,-8);shelf(8,-8);
   for(let i=-6;i<=6;i+=3){box(i,1.9,-8,.18,.3,1.8,'#34464a');box(i,1.75,-7.7,.15,.35,.3,'#745942');}
   item('shop',0,-1,'Speak with Fernando','weapons');for(const [i,k] of ['pistol','rifle','bazooka'].entries()){const gun=weaponModel(k);gun.position.set(-5+i*5,1.2,-4);scene.add(gun);item('display-'+k,-5+i*5,-2,'Inspect '+k,'weapons');}
  }else if(kind==='bank'){
   table(0,-1,16,1.8);wall(-5,-6,.25,6);wall(5,-6,.25,6);
   box(0,1.5,-9,7,3,.4,'#687977',true);box(0,1.6,-8.7,2.6,2.7,.2,'#82918b');
   box(-8,.8,5,3,1.3,1.3,'#667e74',true);shelf(8,-8);
   item('case-bank',-7,3,'Read the bank floor plan','case-bank');
   item('vault',0,-6,'Access the vault','vault');
  }else if(kind==='hospital'){
   for(const x of [-7,0,7]){bed(x,-6);box(x+1.8,1,-7,.8,2,.6,'#77958b');}
   table(-6,4,6);item('heal',-6,2,'Receive treatment · Rs. 100','heal');
  }else if(kind==='warehouse'||kind==='garage'){
   for(const x of [-7,7])for(const z of [-6,-2,2]){box(x,1,z,3,2,2.4,'#9c8c68',true);box(x,1,z+.02,3.1,.12,2.5,'#6d7463');}
   table(0,-7,6);if(building.id==='harbor')item('wages',-3,-5,'Inspect the sealed wages ledger','wage-ledger');item('manifest',0,-5,building.id==='harbor'?'Inspect the harbor manifest':'Inspect the workbench',building.id==='harbor'?'manifest':'supplies');
  }else if(kind==='temple'){
   box(0,.5,-7,10,1,3,'#c7b481',true);const shrine=new THREE.Mesh(new THREE.ConeGeometry(1.3,3,6),mat('#d5b969'));shrine.position.set(0,2.3,-7);scene.add(shrine);
   for(const x of [-6,0,6])for(const z of [-1,3])box(x,.18,z,2.2,.05,3,'#b98972');item('peace',0,-4,'Take a quiet moment','rest');
  }else if(kind==='cafe'||kind==='shop'){
   table(0,-7,14);for(const x of [-6,1,7])for(const z of [-1,5]){table(x,z,2);for(const a of [-1,1])box(x+a*1.5,.5,z,.7,.8,.7,'#879881',true);}item('food',0,-4,'Speak with the cook','food');for(const [i,k] of ['tea','roll','rice'].entries()){const dish=foodModel(k);dish.position.set(-4+i*4,1.02,-7);scene.add(dish);item('meal-'+k,-4+i*4,-5,'Inspect '+k,'food');}
  }else{
   table(0,-5,10);for(const x of [-8,8])shelf(x,-8);for(const x of [-5,0,5])box(x,.5,3,1.3,.8,1.3,'#80968a',true);item('records',0,-2,'Read the neighborhood records','records');
  }
  if(!floor&&['clothing','armory','cafe','shop','garage'].includes(kind)){const vendor=createPerson('#bd8e68',kind==='clothing'?'#a62646':'#919947',{variant:1,gender:kind==='clothing'?'woman':'man'});vendor.position.set(2,.3,-8.5);scene.add(vendor);scene.userData.vendor=vendor;}
  // Stable authored interior colors and furnishings vary with the building identity.
  item('stairs',9.8,8.5,floor?'Stairs · ground floor':'Stairs · upper rooms',floor?'floor-down':'floor-up');
  if(!floor)item('work-order',9.8,5.5,'Building work order','work-order');
  for(let n=0;n<5;n++)box(9.75,.12+n*.08,8.7-n*.22,.7,.14,.2,'#919947');
  // Small furnishings keep room functions legible while leaving central circulation clear.
  box(-10,1,-8,.7,2,.6,'#383536',true);box(10,1,-8,.6,2,.6,'#919947',true);box(-4,.15,7,2,.03,1.2,'#a62646');
  const hash=[...building.id].reduce((n,c)=>n+c.charCodeAt(0),0);
  const painting=box(-10.8,2.1,-6,.06,1.4,3,['#8ca9a0','#b59e77','#aa877c'][hash%3]);
  const data={building,floor,scene,solids,items,people,collision:new CollisionWorld(solids,{minX:-10.7,maxX:10.7,minZ:-9.7,maxZ:9.7})};
  this.cache.set(building.id+':'+floor,data);return data;
 }
 enter(building,state,player){
  if(state.driving||this.canEnter&&!this.canEnter(building,state))return false;
  this.returnPoint={x:state.x,z:state.z,angle:state.angle};this.active=this.cache.get(building.id+':0')||this.build(building);
  state.floor=0;state.interior=building.id;state.x=0;state.z=7.4;state.speed=0;state.previous={x:0,z:7.4};this.active.scene.add(player);player.position.set(0,.2,7.4);
  this.syncResidents();return true;
 }
 syncResidents(){
  if(!this.active)return;
  const data=this.active;
  const present=data.floor?[]:this.population.people.filter(p=>p.inside===data.building.id&&!p.removed);
  for(const view of [...data.people])if(!present.includes(view.resident)){
   data.scene.remove(view.mesh);view.mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
   data.people=data.people.filter(p=>p!==view);
  }
  for(const [i,resident] of present.entries()){
   let view=data.people.find(p=>p.resident===resident);
   if(!view){
    const candidates=Array.from({length:24},(_,j)=>({x:-8+(j%5)*4,z:-3+Math.floor(j/5)*2}));
    const position=candidates.find(p=>!data.collision.blocked(p.x,p.z,.6)&&data.people.every(other=>Math.hypot(other.x-p.x,other.z-p.z)>1.3));
    if(!position)continue;
    const mesh=createPerson(resident.skin,resident.outfit==='work'?resident.uniform:resident.casual,resident);mesh.position.set(position.x,.2,position.z);if(resident.gang&&!resident.dropped){const gun=weaponModel(resident.gangWeapon);gun.position.set(.4,1.28,.2);mesh.add(gun);mesh.userData.gun=gun;}data.scene.add(mesh);resident.interiorPosition=position;view={resident,mesh,...position};data.people.push(view);
   }
   dressPerson(view.mesh,resident.outfit,resident.outfit==='work'?resident.uniform:resident.casual);
   view.mesh.rotation.z=resident.dead||resident.injured?Math.PI/2:0;
  }
 }

 exit(state,player){
  if(!this.active)return;state.x=this.returnPoint.x;state.z=this.returnPoint.z;state.angle=this.returnPoint.angle;state.interior=null;state.floor=0;state.previous={x:state.x,z:state.z};this.outdoor.add(player);player.position.set(state.x,.3,state.z);this.active=null;
 }
 floorChange(floor,state,player){if(!this.active)return;const building=this.active.building;this.active=this.cache.get(building.id+':'+floor)||this.build(building,floor);state.floor=floor;state.x=9.8;state.z=7.9;state.previous={x:state.x,z:state.z};this.active.scene.add(player);player.position.set(state.x,.3,state.z);this.syncResidents();}
 update(dt,state){const data=this.active;if(!data)return;const vendor=data.scene.userData.vendor;if(vendor){animatePerson(vendor,state.elapsed,0);vendor.userData.armR.rotation.x=-.4+Math.sin(state.elapsed*2)*.2;}const open=state.hour>=18||state.hour<4;for(const [i,d] of (data.scene.userData.dancers||[]).entries()){d.mesh.visible=open;if(!open)continue;animatePerson(d.mesh,state.elapsed+i,2);d.mesh.rotation.y=Math.sin(state.elapsed*1.4+i)*.8;d.mesh.userData.armL.rotation.z=Math.sin(state.elapsed*2+i)*.8;d.mesh.userData.armR.rotation.z=-Math.sin(state.elapsed*2+i)*.8;d.mesh.position.set(state.loungeUntil>state.elapsed&&i===0?8:-3+i*2,.35+Math.abs(Math.sin(state.elapsed*3+i))*.12,state.loungeUntil>state.elapsed&&i===0?4.7:-3);}for(const [i,m] of (data.scene.userData.couples||[]).entries()){m.visible=open;m.rotation.z=Math.sin(state.elapsed*.4)>0?(i?.09:-.09):0;m.userData.armR.rotation.x=-.5;}if(data.scene.userData.disco)data.scene.userData.disco.intensity=open?18+Math.sin(state.elapsed*5)*9:2;}
 nearest(position){return this.active?.items.filter(i=>Math.hypot(i.x-position.x,i.z-position.z)<2.5).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))[0];}
}
