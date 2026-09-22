import * as THREE from 'three';
import { twoWheeler } from './mobility-models.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
function mergeStatic(group,exclude=[]){const batches=new Map();for(const mesh of [...group.children])if(mesh.isMesh&&!exclude.includes(mesh)){mesh.updateMatrix();const geo=mesh.geometry.clone().applyMatrix4(mesh.matrix);if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(geo);group.remove(mesh);mesh.geometry.dispose();}for(const [mat,geos] of batches){const merged=mergeGeometries(geos);geos.forEach(g=>g.dispose());const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;group.add(mesh);}}
export const VEHICLE_SPECS=Object.freeze({
 truck:{name:'Lotus Sound Truck',price:4600,mass:3400,maxSpeed:26,acceleration:8,steering:1.15,length:6.4,height:2.7,radius:1.14,axle:2.1},
 bicycle:{name:'Lotus Bicycle',price:220,mass:95,maxSpeed:11,acceleration:6,steering:2.6,length:2.1,height:1.7,twoWheel:true,radius:.45,axle:.65},
 motorcycle:{name:'Monsoon 250',price:1400,mass:260,maxSpeed:42,acceleration:21,steering:2.2,length:2.4,height:1.8,twoWheel:true,radius:.5,axle:.7},
 bus:{name:'Maya City Bus',price:5400,mass:5200,maxSpeed:24,acceleration:6,steering:1.05,length:7.5,height:3.1,radius:1.16,axle:2.55},
 classic:{name:'Ceylon Classic',price:2400,mass:1300,maxSpeed:37,acceleration:15,steering:1.8,length:4.5,height:2.1},
 hatch:{name:'Lotus Compact',price:1800,mass:950,maxSpeed:31,acceleration:18,steering:2.2,length:3.8,height:2.05},
 sport:{name:'Coast GT',price:6200,mass:1150,maxSpeed:48,acceleration:24,steering:1.95,length:4.5,height:1.65},
 suv:{name:'Mistwood Trail',price:4800,mass:1950,maxSpeed:33,acceleration:12,steering:1.45,length:4.6,height:2.5},
 van:{name:'Harbor Cargo',price:3200,mass:2300,maxSpeed:27,acceleration:9,steering:1.3,length:4.7,height:2.65},
 tuk:{name:'Diyara Three',price:950,mass:600,maxSpeed:24,acceleration:13,steering:2.4,length:3.1,height:2.2},
});
const material=color=>new THREE.MeshStandardMaterial({color,roughness:.75});
function box(parent,w,h,d,mat,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
export function createPerson(color='#ead5b1',shirt='#da8b74',profile={}){
 const g=new THREE.Group(),skin=material(color),cloth=material(shirt),dark=material('#28343e'),hair=material(profile.hair||'#292322');
 const female=profile.gender==='woman',variant=profile.variant||0,width=female?.56:.68;
 const torso=new THREE.Mesh(new THREE.CylinderGeometry(width*.49,width*.4,.72,8),cloth);torso.scale.z=.72;torso.position.y=1.36;g.add(torso);
 const hips=box(g,width,.2,.36,cloth,0,.94,0);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.245,10,8),skin);head.scale.set(.88,1.15,.88);head.position.y=1.99;g.add(head);
 const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.25,10,8,0,Math.PI*2,0,Math.PI*.55),hair);hairCap.position.y=2.04;g.add(hairCap);
 if(female&&variant%3!==2){const back=box(g,.44,.48,.19,hair,0,1.92,-.16);back.rotation.x=-.1;if(variant%3===1){const pony=new THREE.Mesh(new THREE.SphereGeometry(.17,7,6),hair);pony.scale.y=1.8;pony.position.set(0,1.93,-.38);g.add(pony);}}
 else if(variant%3===2)box(g,.24,.12,.39,hair,0,2.27,-.02);
 for(const x of [-.09,.09])box(g,.04,.045,.025,dark,x,2.02,.21);
 box(g,.065,.075,.06,skin,0,1.96,.22);
 const limbs=[];
 function limb(x,y,arm){const pivot=new THREE.Group();pivot.position.set(x,y,0);g.add(pivot);const length=arm?.36:.4,thickness=arm?.15:.21;
 box(pivot,thickness,length,.22,arm?cloth:dark,0,-length/2,0);const joint=new THREE.Group();joint.position.y=-length;pivot.add(joint);box(joint,thickness,length,.2,arm?skin:dark,0,-length/2,0);
 if(!arm)box(joint,.24,.12,.38,dark,0,-length,.07);else box(joint,.14,.14,.16,skin,0,-length,0);
 limbs.push(joint);return pivot;}
 const left=limb(-.17,.9,false),right=limb(.17,.9,false),armL=limb(-width*.66,1.65,true),armR=limb(width*.66,1.65,true);
 const skirt=new THREE.Mesh(new THREE.CylinderGeometry(.28,.43,.48,9),cloth);skirt.position.y=.89;skirt.scale.z=.78;g.add(skirt);
 const jacket=box(g,width+.07,.52,.42,cloth,0,1.43,-.015),belt=box(g,width+.025,.065,.39,dark,0,1.04,.005);
 const mouth=box(g,.085,.045,.018,dark,0,1.88,.223);
 g.userData={head,mouth,left,right,armL,armR,cloth,skin,torso,hips,skirt,jacket,belt,kneeL:limbs[0],kneeR:limbs[1],elbowL:limbs[2],elbowR:limbs[3],profile};
 dressPerson(g,'casual',shirt);mergeStatic(g,[head,mouth,torso,hips,skirt,jacket,belt]);g.scale.setScalar(profile.height||1);return g;
}
export function dressPerson(g,outfit,color){const u=g.userData;u.cloth.color.set(color);u.skirt.visible=u.profile.gender==='woman'&&outfit!=='work'&&(u.profile.variant||0)%3===0;u.jacket.visible=outfit==='work'||(u.profile.variant||0)%3===1;u.outfit=outfit;}
export function animatePerson(g,time,speed=0,armed=false,seated=false){const u=g.userData,run=speed>4,phase=time*(run?15:8),swing=speed?Math.sin(phase)*(run?.9:.48):0;
 u.left.rotation.x=seated?-1.35:swing;u.right.rotation.x=seated?-1.35:-swing;
 u.kneeL.rotation.x=seated?1.5:Math.max(0,-swing)*(run?1.3:.7);u.kneeR.rotation.x=seated?1.5:Math.max(0,swing)*(run?1.3:.7);
 u.armL.rotation.x=seated?-1.05:-swing;u.armR.rotation.x=armed?-1.2:seated?-1.05:swing;
 u.elbowL.rotation.x=seated?-.3:run?-1.1:-.15;u.elbowR.rotation.x=armed?-.2:run?-1.1:-.15;
 u.torso.rotation.x=run?.13:0;u.torso.rotation.y=0;u.armL.rotation.z=u.armR.rotation.z=0;
}
export function createCar(color='#dfbd76',police=false,tuk=false,model='classic'){
 if(VEHICLE_SPECS[model]?.twoWheel)return twoWheeler(color,model==='motorcycle',createPerson('#c99b75','#eed5a4'),VEHICLE_SPECS[model]);
 const spec=VEHICLE_SPECS[tuk?'tuk':model]||VEHICLE_SPECS.classic,g=new THREE.Group(),body=material(color),trim=material('#c4c9c6'),tire=material('#182126');body.metalness=.3;body.roughness=.35;
 const glass=new THREE.MeshStandardMaterial({color:'#91b9bc',transparent:true,opacity:.22,roughness:.1,depthWrite:false,side:THREE.DoubleSide}),L=spec.length,H=spec.height,W=tuk?1.8:2.2;
 box(g,W,.64,L,body,0,.83,0);box(g,W*.88,.17,2.05,body,0,H,-.28);
 // Open cabin with seats, pillars and transparent windows makes occupants readable.
 for(const x of [-.51,.51]){box(g,.64,.2,.68,tire,x,1.03,-.05);box(g,.64,.7,.16,tire,x,1.4,-.38);}
 for(const x of [-W*.42,W*.42])for(const z of [-1.2,.66])box(g,.09,H-1.04,.09,body,x,(H+1.04)/2,z);
 box(g,W*.85,H-1.18,.035,glass,0,(H+1.18)/2,.67);box(g,W*.85,H-1.18,.035,glass,0,(H+1.18)/2,-1.22);
 const doors=[];for(const side of [-1,1]){const door=new THREE.Group();door.position.set(side*W*.48,1.1,.67);g.add(door);box(door,.09,.42,1.42,body,0,0,-.71);box(door,.025,H-1.33,1.35,glass,0,(H-1.1)/2,-.7);box(door,.035,.06,.26,trim,side*.07,.13,-1.16);doors.push(door);}
 if(model==='bus'){box(g,W,H-1.05,L-.2,body,0,(H+1.05)/2,0);for(const side of [-1,1])for(let z=-2.8;z<=2.8;z+=1.1)box(g,.04,.8,.85,glass,side*W*.505,2.25,z);box(g,1.8,.4,.04,trim,0,2.6,L/2+.02);}
 if(model==='truck'){box(g,2.1,1.3,1.7,body,0,1.65,1.4);box(g,2.1,.35,3.5,body,0,1.15,-1.25);for(const x of [-.63,.63]){box(g,.95,1.65,.8,tire,x,2,-1.8);for(const y of [1.6,2.25]){const speaker=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.09,14),trim);speaker.rotation.x=Math.PI/2;speaker.position.set(x,y,-1.35);g.add(speaker);}}box(g,2,.09,.08,material('#a62646'),0,2.9,-1.35);}
 if(model==='van')box(g,W*.95,H-.95,1.9,body,0,(H+.95)/2,-1.1);
 if(model==='suv'){box(g,.08,.12,2.35,trim,-.7,H+.12,-.2);box(g,.08,.12,2.35,trim,.7,H+.12,-.2);}
 if(model==='sport'){box(g,2,.12,.5,body,0,H-.05,-1.94);box(g,W,.15,.6,tire,0,.45,1.9);}
 const wheels=[],wheelPositions=tuk?[[-W*.51,-L*.31],[W*.51,-L*.31],[0,L*.31]]:[[-W*.51,-L*.31],[-W*.51,L*.31],[W*.51,-L*.31],[W*.51,L*.31]];for(const [x,z] of wheelPositions){const pivot=new THREE.Group();pivot.position.set(x,.48,z);g.add(pivot);const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.28,12),tire);wheel.rotation.z=Math.PI/2;pivot.add(wheel);wheels.push(pivot);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.3,8),trim);hub.rotation.z=Math.PI/2;pivot.add(hub);}
 const headlights=new THREE.MeshBasicMaterial({color:'#fff0b1'}),tail=new THREE.MeshBasicMaterial({color:'#e96a58'});
 for(const x of [-W*.34,W*.34]){box(g,.44,.2,.06,headlights,x,.95,L/2+.03);box(g,.4,.2,.06,tail,x,.95,-L/2-.03);}
 box(g,W,.14,.16,trim,0,.55,L/2);box(g,W,.14,.16,trim,0,.55,-L/2);
 const beams=new THREE.Group();for(const x of [-.7,.7]){const geo=new THREE.ConeGeometry(3,13,16,1,true);geo.rotateX(-Math.PI/2);geo.translate(x,.35,8.7);beams.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#ffe9ab',transparent:true,opacity:.035,depthWrite:false,side:THREE.DoubleSide})));}g.add(beams);
 const driver=createPerson('#b98e6b','#78968f',{gender:police?'man':model==='sport'?'woman':'man',variant:2});driver.scale.setScalar(H<1.8?.6:.64);driver.position.set(-.5,H<1.8?.2:.42,.1);animatePerson(driver,0,0,false,true);g.add(driver);
 g.userData={beams,doors,wheels,body,paint:color,driver,spec};
 if(police){g.userData.siren=[-1,1].map((side,i)=>box(g,.5,.2,.38,new THREE.MeshBasicMaterial({color:i?'#729dff':'#ff5959'}),side*.34,H+.25,0));}
 mergeStatic(g,g.userData.siren||[]);return g;
}
