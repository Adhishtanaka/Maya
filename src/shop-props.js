import * as THREE from 'three';
export function foodModel(kind='tea'){
 const group=new THREE.Group();const add=(geo,color,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.8}));m.position.set(x,y,z);group.add(m);return m;};
 if(kind==='tea'){add(new THREE.CylinderGeometry(.22,.17,.4,16),'#faf7ee',0,.2);add(new THREE.CylinderGeometry(.19,.19,.015,16),'#65432d',0,.405);const handle=add(new THREE.TorusGeometry(.13,.035,6,12),'#faf7ee',.24,.22);handle.rotation.y=Math.PI/2;}
 else{add(new THREE.CylinderGeometry(.4,.36,.045,20),'#faf7ee',0,.03);if(kind==='roll'){for(const z of [-.13,.13]){const roll=add(new THREE.CapsuleGeometry(.085,.35,4,8),'#cc924d',0,.13,z);roll.rotation.z=Math.PI/2;}}else{add(new THREE.SphereGeometry(.23,12,8),'#f0e5c8',-.08,.11).scale.y=.55;add(new THREE.SphereGeometry(.16,10,8),'#b16c3f',.2,.09,.1).scale.y=.55;add(new THREE.SphereGeometry(.12,10,8),'#71944b',.18,.08,-.16).scale.y=.5;}}
 return group;
}
