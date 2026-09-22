import * as THREE from 'three';
import {distance} from './physics.js';
export class CashDrops{
 constructor(){this.items=[];}
 drop(p,state,scene,position=p){if(p.cashDropped)return null;p.cashDropped=true;const value=25+(Number(p.id?.split('-').at(-1))||0)*7%90,mesh=new THREE.Mesh(new THREE.BoxGeometry(.4,.09,.23),new THREE.MeshStandardMaterial({color:'#919947',emissive:'#919947',emissiveIntensity:.35}));mesh.position.set(position.x,.6,position.z);scene.add(mesh);const item={mesh,scene,value,x:position.x,z:position.z,interior:state.interior||null,floor:state.floor||0,created:state.elapsed,source:p.id};this.items.push(item);if(this.items.length>30)this.remove(this.items[0]);return item;}
 remove(item){item.scene.remove(item.mesh);item.mesh.geometry.dispose();item.mesh.material.dispose();this.items.splice(this.items.indexOf(item),1);}
 nearest(s){return this.items.find(d=>d.interior===(s.interior||null)&&d.floor===(s.floor||0)&&distance(d,s)<2);}
 collect(item,s){if(!this.items.includes(item))return 0;s.money+=item.value;this.remove(item);return item.value;}
 update(s){for(const item of [...this.items]){if(s.elapsed-item.created>120)this.remove(item);else{item.mesh.rotation.y=s.elapsed*1.3;item.mesh.position.y=.5+Math.sin(s.elapsed*3)*.1;}}}
}
