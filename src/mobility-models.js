import * as THREE from 'three';
export function part(group,w,h,d,color,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.65}));m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
export function twoWheeler(color,motor,person,spec){
 const g=new THREE.Group(),frame=part(g,.2,.16,1.5,color,0,.75,0),wheels=[];
 for(const z of [-.85,.85]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.43,.075,6,16),new THREE.MeshStandardMaterial({color:'#383536'}));wheel.rotation.y=Math.PI/2;wheel.position.set(0,.47,z);g.add(wheel);wheels.push(wheel);part(g,.13,.8,.12,'#919947',0,.85,z);}
 part(g,.5,.13,.55,'#383536',0,1.1,-.3);part(g,.9,.1,.1,'#383536',0,1.35,.78);if(motor){part(g,.43,.45,.7,color,0,.85,.15);part(g,.43,.35,.4,'#383536',0,.44,0);}else{const strut=part(g,.12,.12,1.05,color,0,.85,0);strut.rotation.x=.5;}
 const driver=person;driver.scale.setScalar(.74);driver.position.set(0,.2,-.1);g.add(driver);driver.visible=false;
 const doors=[new THREE.Group(),new THREE.Group()],beams=new THREE.Group();g.add(...doors,beams);g.userData={body:frame.material,driver,doors,beams,wheels,spec,paint:color,twoWheel:true};return g;
}
export function aircraftModel(kind){const g=new THREE.Group(),burgundy='#a62646',ivory='#faf7ee';
 part(g,2,1.5,kind==='plane'?7:4,ivory,0,1,0);part(g,1.8,.8,1.7,'#5c7377',0,1.6,1.1);part(g,.4,.4,5,burgundy,0,1,-4);part(g,.16,1.8,1.4,burgundy,0,1.6,-6);
 const rotor=new THREE.Group();g.add(rotor);
 if(kind==='plane'){part(g,10,.15,1.5,burgundy,0,1,-.8);part(g,3.5,.12,.85,burgundy,0,1,-5.8);rotor.position.set(0,1,3.65);part(rotor,.13,3,.15,'#383536');}
 else{rotor.position.y=2.4;part(rotor,11,.08,.2,'#383536');part(rotor,.2,.08,11,'#383536');}
 for(const side of [-1,1]){if(kind==='plane'){for(const z of [-1.6,1.6]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.2,10),new THREE.MeshStandardMaterial({color:'#383536'}));wheel.rotation.z=Math.PI/2;wheel.position.set(side*1.3,.1,z);g.add(wheel);}}else part(g,.15,.15,4,'#383536',side*1.3,-.1,0);part(g,.15,.7,.15,'#383536',side*1.3,.25,0);}
 g.userData.rotor=rotor;return g;
}
export function canopyModel(){const g=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(3.7,12,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#a62646',side:THREE.DoubleSide}));mesh.scale.set(1,.4,.65);mesh.position.y=4.5;g.add(mesh);for(const x of [-2.5,2.5]){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,4.5,0),new THREE.Vector3(0,1.4,0)]),new THREE.LineBasicMaterial({color:'#faf7ee'}));g.add(line);}return g;}
