import {foodModel} from './shop-props.js';
import * as THREE from 'three';
import {createPerson,animatePerson,createCar} from './actor-models.js';
import {weaponModel} from './combat.js';
import {wear,OUTFITS} from './wardrobe.js';
function dispose(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.parent?.remove(root);}
export class InteractionStage{
 constructor(){this.time=0;this.handover=0;this.active=false;this.turn=0;}
 mount(host,type,person,wardrobe){
  if(!this.renderer){this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});this.renderer.setPixelRatio(1);this.renderer.setSize(640,400);this.renderer.setClearColor('#242c2b');this.camera=new THREE.PerspectiveCamera(38,640/400,.1,50);this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight('#fff2dc','#4c675b',3));const light=new THREE.DirectionalLight('#ffe3bc',3);light.position.set(-3,7,5);this.scene.add(light);}
  this.floating?.remove();this.floating=null;if(this.set)dispose(this.set);this.set=new THREE.Group();this.scene.add(this.set);this.type=type;this.person=person;this.active=true;this.handover=0;this.time=0;
  this.seller=createPerson(person?.skin||'#bd8e68',person?.casual||'#919947',person||{variant:1,gender:type==='wardrobe'?'woman':'man'});this.seller.position.set(1.2,0,-.7);this.seller.rotation.y=-.45;this.set.add(this.seller);
  this.buyer=createPerson('#c99b75','#eed5a4');wear(this.buyer,wardrobe);this.buyer.position.set(-1.2,0,1.2);this.buyer.rotation.y=2.3;this.set.add(this.buyer);
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(5,5,.18,36),new THREE.MeshStandardMaterial({color:'#383536'}));floor.position.y=-.1;this.set.add(floor);
  const counter=new THREE.Mesh(new THREE.BoxGeometry(2.5,.12,.8),new THREE.MeshStandardMaterial({color:'#9c8564'}));counter.position.set(0,1,0);counter.visible=['shop','food','vehicles','depot','wardrobe','club-lounge'].includes(type);this.set.add(counter);
  this.display=new THREE.Group();this.display.position.set(0,1.25,0);this.set.add(this.display);this.product=null;this.camera.position.set(-4,3.25,6);this.camera.lookAt(0,1.1,0);
  const frame=document.createElement('div');frame.className='interaction-stage';frame.setAttribute('aria-label','Animated conversation and item preview');frame.append(this.renderer.domElement);const caption=document.createElement('span');caption.className='stage-caption';caption.textContent=person?.name||({shop:'Fernando · equipment counter',food:'Amma · fresh from the kitchen',vehicles:'Arun · test the view before choosing',wardrobe:'Sewwandi · Lotus Threads',depot:'Air & Cycle Depot'}[type]||'Maya · conversation');frame.append(caption);host.prepend(frame);const copy=document.createElement('div');copy.className='interaction-copy';for(const node of [...host.children])if(node!==frame)copy.append(node);host.append(copy);this.caption=caption;this.preview(type==='wardrobe'?'outfit:arrival':type==='shop'?'pistol':type==='vehicles'?'car:classic':type==='food'?'food:tea':'parcel');
  let last=null;this.renderer.domElement.onpointerdown=e=>{last=e.clientX;this.renderer.domElement.setPointerCapture(e.pointerId);};this.renderer.domElement.onpointermove=e=>{if(last!=null){this.turn+=(e.clientX-last)*.015;last=e.clientX;}};this.renderer.domElement.onpointerup=()=>last=null;
 }
 preview(id){if(!this.active||this.previewId===id&&this.product)return;this.previewId=id;if(this.product)dispose(this.product);let mesh;
  if(id.startsWith('car:')){mesh=createCar('#a62646',false,false,id.slice(4));mesh.scale.setScalar(.33);}
  else if(id.startsWith('outfit:')){mesh=createPerson('#bd8e68','#faf7ee');wear(mesh,{equipped:id.slice(7)});mesh.scale.setScalar(.65);}
  else if(id.startsWith('food:'))mesh=foodModel(id.slice(5));
  else if(['pistol','rifle','bazooka'].includes(id)){mesh=weaponModel(id);mesh.scale.setScalar(.8);}
  else{mesh=new THREE.Mesh(new THREE.BoxGeometry(.6,.35,.45),new THREE.MeshStandardMaterial({color:id==='food'?'#d79161':'#a62646'}));}
  this.product=mesh;this.display.add(mesh);
 }
 exchange(label='Handed over'){this.handover=1;this.caption.textContent=label;}
 update(dt){if(!this.active)return;if(this.leaveTime){this.leaveTime-=dt;if(this.leaveTime<=0){this.floating?.remove();this.floating=null;this.leaveTime=0;this.active=false;return;}}this.time+=dt;const t=this.time,u=this.seller.userData;animatePerson(this.seller,t,0);animatePerson(this.buyer,t,0);u.armR.rotation.x=-.6-Math.sin(t*3)*.22;u.elbowR.rotation.x=-.5;u.torso.rotation.y=Math.sin(t*1.4)*.07;if(u.head)u.head.rotation.x=Math.sin(t*4)*.055;if(u.mouth)u.mouth.scale.y=.25+Math.abs(Math.sin(t*12))*.8;
  this.display.rotation.y=this.turn+Math.sin(t*.5)*.25;if(this.handover>0){this.handover=Math.max(0,this.handover-dt);const p=1-this.handover;this.display.position.set(1.1-p*2.1,1.3+Math.sin(p*Math.PI)*.25,-.4+p*1.4);this.buyer.userData.armR.rotation.x=-1.1;u.armR.rotation.x=-1.1;}else this.display.position.set(0,1.25,0);
  this.renderer.render(this.scene,this.camera);
 }
 close(celebrate=false){if(celebrate&&this.active){this.exchange('Thank you · handed over');const frame=this.renderer.domElement.parentElement;frame.classList.add('handover-toast');document.body.append(frame);this.floating=frame;this.leaveTime=1;}else{this.active=false;this.floating?.remove();this.floating=null;this.leaveTime=0;}}
 snapshot(){return {active:this.active,time:this.time,preview:this.previewId,handover:this.handover,talking:!!this.seller&&this.seller.userData.armR.rotation.x};}
}
