import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROADS, LOCATIONS, BOUNDS, district } from './systems.js';

export function createWorld(scene) {
  const solids = [], windows = [], lamps = [], signs = [], buildings = [], props = [], roadSegments = [];
  let batches = new Map();
  const rootBatches = batches;
  function flush(batch, parent) {
    for (const [mat,geos] of batch) {
      const mesh = new THREE.Mesh(mergeGeometries(geos),mat);
      mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
      geos.forEach(g=>g.dispose());
      if(mat.emissive.getHex()&&!windows.includes(mat)) windows.push(mat);
    }
  }
  function collider(shape) { solids.push(shape); return shape; }
  const materials = new Map();
  function material(color, glow = false) {
    const key = color + glow;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .84, ...(glow ? { emissive: color, emissiveIntensity: .65 } : {}) }));
    return materials.get(key);
  }
  function box(x,y,z,w,h,d,color,glow=false,rotation=0) {
    const mat = material(color,glow), geo = new THREE.BoxGeometry(w,h,d);
    geo.rotateY(rotation); geo.translate(x,y,z);
    if (!batches.has(mat)) batches.set(mat,[]);
    batches.get(mat).push(geo);
  }
  function cone(x,y,z,r,h,color,sides=7) {
    const mat = material(color), geo = new THREE.ConeGeometry(r,h,sides); geo.translate(x,y,z);
    if (!batches.has(mat)) batches.set(mat,[]); batches.get(mat).push(geo);
  }
  function sign(text,x,y,z,width=12,color='#ecce8c',rotation=0) {
    const canvas=document.createElement('canvas'); canvas.width=512;canvas.height=96;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#15252c';ctx.fillRect(0,0,512,96);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.strokeRect(6,6,500,84);
    ctx.fillStyle=color;ctx.font='bold 33px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,49,475);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width*96/512),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
    m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);signs.push(m);return m;
  }
  // A compact connected island: five avenues, a waterfront, and a northern hill road.
  box(-106,-.8,-24,448,1.5,624,'#6c8668');
  box(0,.02,0,218,.2,218,'#c0b9a1');
  const roadMat=material('#35464b');roadMat.roughness=.93;
  for(const r of ROADS){
    box(r,.15,0,13,.16,218,'#35464b');box(0,.15,r,218,.16,13,'#35464b');
    for(let t=-105;t<108;t+=9){
      if(!ROADS.some(v=>Math.abs(t-v)<9)){box(r,.245,t,.16,.02,3.6,'#c4bea2');box(t,.245,r,3.6,.02,.16,'#c4bea2');}
    }
    for(const s of ROADS) for(let n=-4;n<=4;n+=2){box(r+n,.25,s+8,1,.02,3,'#dedcca');box(r+8,.25,s+n,3,.02,1,'#dedcca');}
  }
  box(0,.12,-130,13,.18,55,'#35464b');
  for(let z=-150;z<-108;z+=9)box(0,.24,z,.16,.02,4,'#c4bea2');
  box(114,-.3,-8,10,1,256,'#b6aa87');
  const water=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshStandardMaterial({color:'#387d88',roughness:.3,metalness:.4}));water.rotation.x=-Math.PI/2;water.position.set(260,-.6,0);scene.add(water);
  for(let z=-100;z<108;z+=8){box(110,1,z,.35,1.8,.35,'#ece0bd');if(z<100)box(110,1.65,z+4,.2,.18,8,'#ece0bd');}
  for(let z=-75;z<100;z+=48){box(122,.3,z,23,.5,6,'#997c62');for(let x=115;x<134;x+=6)box(x,-.7,z,1,3,1,'#65594c');}
  let seed=81;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const palette=['#c6a28a','#d1bc9a','#8ba89d','#ccae9f','#a6b6af','#a2a5a1','#c9bf9b','#bd9692'];
  function building(x,z,w,d,h,col,style=0,meta={}){
    const parent = new THREE.Group(); parent.name = meta.name || `Building ${buildings.length+1}`; scene.add(parent);
    batches = new Map();
    const id = meta.id || `building-${buildings.length}`;
    const kind = meta.kind || (x < -210 ? 'house' : z > 120 ? 'warehouse' : style===1 ? 'shop' : 'apartment');
    const data = {id,name:meta.name || `${district(x,z)} ${kind} ${buildings.length+1}`,kind,x,z,w,d,h,door:{x,z:z+d/2+2.6},group:parent};
    buildings.push(data);
    collider({x,z,w,d,height:h+1,kind:'building',id});box(x,h/2+.35,z,w,h,d,col);
    box(x,h+.6,z,w+.9,.6,d+.9,'#d5cbb2');box(x,h+.94,z,w-1.7,.12,d-1.7,'#727f79');
    for(const side of [-1,1]){
      box(x+side*w/2,h+1.2,z,.35,1,d,'#d5cbb2');box(x,h+1.2,z+side*d/2,w,1,.35,'#d5cbb2');
      for(let yy=3.6;yy<h-1;yy+=3.8)for(let xx=-w/2+2;xx<w/2-1;xx+=3.5){
        const glow=rand()>.42;const color=glow?'#efc480':'#354e57';box(x+xx,yy,z+side*(d/2+.025),1.6,1.9,.06,color,glow);
        if(style===1)box(x+xx,yy-1.25,z+side*(d/2+.65),2.4,.2,1.4,'#b5c4bc');
      }
      for(let yy=3.6;yy<h-1;yy+=3.8)for(let zz=-d/2+2;zz<d/2-1;zz+=3.5)box(x+side*(w/2+.025),yy,z+zz,.06,1.8,1.5,rand()>.6?'#efc480':'#354e57',true);
    }
    box(x-2,h+1.8,z+2,3.6,1.8,3,'#89948e');box(x+3,h+1.4,z-3,2,1,2,'#c5cbc0');
    // Shop windows, awnings, and arcade pillars.
    for(let a=-w/2+2;a<w/2-1;a+=4){box(x+a,1.7,z+d/2+.04,2.8,2.5,.08,'#283f43');box(x+a,3.2,z+d/2+.65,3.5,.3,1.6,style===1?'#c47c65':'#688f82');}
    if(style===1){box(x,3.1,z+d/2+1.5,w+.4,.3,3,'#e3d2b2');for(let a=-w/2+.5;a<=w/2;a+=4)box(x+a,1.5,z+d/2+2.7,.3,3,.3,'#e3d2b2');}
    box(x,1.25,z+d/2+.09,1.5,2.5,.14,'#354a44');
    box(x,.22,z+d/2+1.4,2,.3,2.8,'#d9c9a3');
    box(x+.52,1.2,z+d/2+.2,.12,.14,.12,'#e7cc7e',true);
    flush(batches,parent); batches=rootBatches;
    return data;
  }
  const centers=[-72,-24,24,72];
  for(const x of centers)for(const z of centers){
    // Temple garden in the northwest and public square by the tea stop.
    if(x===-72&&z===-72){
      const templeGroup=new THREE.Group();templeGroup.name='Lotus Temple';scene.add(templeGroup);batches=new Map();
      box(x,.4,z,32,.5,32,'#b2b796');box(x,1,z,19,1.3,21,'#dcd0ad');box(x,4.2,z,14,5.5,15,'#ecddbb');
      cone(x,9,z,12,5,'#ac7656',4);cone(x,12.5,z,6,4,'#d2a251',4);cone(x,15.3,z,2,3,'#e5c375',4);
      collider({x,z,w:19,d:21,height:15,kind:'building',id:'temple'});buildings.push({id:'temple',name:'Lotus Temple',kind:'temple',x,z,w:19,d:21,h:15,door:{x,z:z+13},group:templeGroup});sign('LOTUS TEMPLE',x,3,z+11,14);flush(batches,templeGroup);batches=rootBatches;continue;
    }
    if(x===-24&&z===24){
      building(-25,20,17,16,7,'#cbbda1',1,{id:'tea',name:'Amma’s Tea Stop',kind:'cafe'});sign('AMMA’S TEA STOP',-25,4.5,28.08,15,'#e9ce88');
      box(-25,.35,36,23,.3,8,'#b9b39d');
      for(let a=-32;a<-15;a+=7){box(a,1,35,2,.15,2,'#af8868');box(a,.5,35,.3,1,.3,'#665d4e');cone(a,3.3,35,2.5,.7,'#b7c995',8);box(a,1.7,35,.12,3,.12,'#ded1ab');}
      continue;
    }
    const old=x<0;const h=old?7+Math.floor(rand()*3)*3.6:12+Math.floor(rand()*5)*3.6;
    if(x===72&&z===72){building(x,z,29,25,8,'#8fa6a2',0,{id:'garage',name:'De Silva Motors',kind:'garage'});sign('DE SILVA • MOTOR WORKS',x,5,z-12.6,24,'#b7d8c5',Math.PI);}
    else if(x===24&&z===-72){
      box(x,.32,z,32,.25,32,'#8aab82');box(x,.48,z,5,.12,32,'#c8bba0');box(x,.48,z,32,.12,5,'#c8bba0');
      cone(x,3,z,4,5,'#b8b8a0',6);
    }else{
      building(x-7,z,14,28,h,palette[Math.floor(rand()*palette.length)],old?1:0,x===24&&z===-24?{id:'bank',name:'Maya City Bank',kind:'bank'}:x===24&&z===72?{id:'home',name:'Your apartment',kind:'apartment'}:x===-72&&z===72?{id:'weapons',name:'Fernando Sporting Goods',kind:'armory'}:x===-72&&z===-24?{id:'station',name:'Central Police Station',kind:'station'}:{});
      building(x+9,z-5,12,18,h*.8,palette[Math.floor(rand()*palette.length)],old?1:0);
      if(x>0)building(x+9,z+13,12,10,7,'#9baeb1');
    }
  }
  sign('CEYLON SOCIAL CLUB',24,5,14.8,20,'#f09fac');
  sign('PETTAH • NIGHT MARKET',-72,5,39,25,'#b8dba9');
  sign('LOTUS RESIDENCES',24,5,57.8,18,'#d4dda9',Math.PI);
  sign('MAYA  /  WATERFRONT',99,5,-30,18,'#b4d9d1',-Math.PI/2);
  // Palms, lamps, street furniture, market canopies.
  function palm(x,z){
    collider({x,z,r:.48,height:7,kind:'tree'});
    box(x,3.4,z,.52,6.8,.52,'#8e8771');
    for(let k=0;k<6;k++){const a=k*Math.PI/3;box(x+Math.sin(a)*1.8,6.7,z+Math.cos(a)*1.8,1.15,.22,4.8,'#557b65',false,a);}
    cone(x,7,z,1.6,1.2,'#618b6d',7);
  }
  for(const r of ROADS)for(let t=-104;t<108;t+=24){
    if(ROADS.some(v=>Math.abs(t-v)<10))continue;
    palm(r+10,t);
    collider({x:r-8,z:t,r:.24,height:6,kind:'lamp'});box(r-8,3,t,.2,6,.2,'#53635e');box(r-7.2,6,t,1.8,.18,.25,'#53635e');box(r-6.5,5.85,t,1,.14,.65,'#ffdd9a',true);
    lamps.push(new THREE.Vector3(r-6.5,5.7,t));
    collider({x:r+9,z:t+5,w:2,d:.6,height:1.5,kind:'bin'});box(r+9,.8,t+5,2,1.5,.6,'#5d7972');
  }
  for(let z=-92;z<105;z+=17)palm(107,z);
  for(let i=0;i<5;i++){const z=13+i*5;box(-55,2.5,z,4,.3,3,i%2?'#c4ae74':'#b77574');collider({x:-55,z,w:3.8,d:2.6,height:2.5,kind:'stall'});box(-55,1,z,3.8,1,2.6,'#876e55');for(let k=0;k<3;k++)box(-56+k,1.65,z,.65,.4,.6,'#dab16b');}
  // Connected west/south suburbs, countryside, and a northern highland road.
  const road = (x1,z1,x2,z2,width=12) => {
    roadSegments.push({x1,z1,x2,z2,width});
    box((x1+x2)/2,.15,(z1+z2)/2,Math.abs(x2-x1)+width,.16,Math.abs(z2-z1)+width,'#35464b');
    const len=Math.hypot(x2-x1,z2-z1);
    for(let t=0;t<len;t+=12){const x=x1+(x2-x1)*t/len,z=z1+(z2-z1)*t/len;box(x,.245,z,x1===x2?.14:4,.02,x1===x2?4:.14,'#c4bea2');}
  };
  for(const r of ROADS){roadSegments.push({x1:r,z1:-108,x2:r,z2:108,width:13},{x1:-108,z1:r,x2:108,z2:r,width:13});}
  box(-214,.02,32,210,.2,252,'#aaa990');
  box(-130,.01,205,358,.12,144,'#809164');
  box(37,.04,193,137,.2,155,'#9c9b84');
  box(-178,.03,-222,285,.12,208,'#6b7b69');
  for(const x of [-288,-240,-192,-144])road(x,-96,x,264);
  for(const z of [-96,-48,0,48,96,144,192,240])road(-312,z,96,z);
  for(const x of [-96,-48,0,48,96])road(x,96,x,264);
  road(0,-96,0,-312);road(-192,-96,-192,-288,10);road(-192,-144,0,-144,10);road(-192,-240,48,-240,10);
  for(const x of [-264,-216,-168,-120])for(const z of [-72,-24,24,72,120]){
    if(x===-168&&z===-24){building(x,z,29,26,14,'#cbd6c5',0,{id:'clinic',name:'Maya General Hospital',kind:'hospital'});sign('MAYA GENERAL HOSPITAL',x,7,z+13.1,26,'#b9e8da');continue;}
    if(x===-264&&z===24){building(x,z,25,23,8,'#d2b288',1,{id:'village',name:'Diyara Community Hall',kind:'hall'});sign('DIYARA COMMUNITY HALL',x,5,z+11.6,22);continue;}
    const village=x<-210;
    const cottage=building(x,z,village?18:24,village?17:26,village?5.5:10+rand()*9,village?'#c4a884':z>50?'#909f9a':'#acc3b2',village?1:0);
    if(village){batches=new Map();cone(x,7.5,z,15,4,'#ab6f53',4);flush(batches,cottage.group);batches=rootBatches;palm(x+17,z-5);}
  }
  for(const x of [-264,-216,-168,-120])for(const z of [168,216]){
    if(x===-216&&z===168){building(x,z,22,20,6,'#cab999',1,{id:'farm',name:'Diyara Farm Cooperative',kind:'farm'});continue;}
    box(x,.22,z,32,.3,33,'#76985a');
    for(let i=-13;i<15;i+=3)box(x+i,.43,z,.7,.35,29,'#a2b36a');
    box(x,1.1,z+18,36,.12,.2,'#bca47b');
    for(let i=-18;i<=18;i+=6){box(x+i,.75,z+18,.18,1.5,.18,'#bca47b');collider({x:x+i,z:z+18,r:.2,height:1.5,kind:'fence'});}
  }
  for(const x of [-72,-24,24,72])for(const z of [168,216]){
    building(x,z,30,28,9,x<0?'#bfa688':'#89a2a3',0,x===24&&z===168?{id:'harbor',name:'South Harbor Union',kind:'warehouse'}:{});
    for(let i=0;i<3;i++){box(x-9+i*9,1,z+20,6,2,3,i%2?'#92736a':'#718d89');collider({x:x-9+i*9,z:z+20,w:6,d:3,height:2,kind:'container'});}
  }
  building(28,-272,19,17,6,'#bac4b2',1,{id:'outlook',name:'Mistwood cabin',kind:'cabin'});
  building(-216,-264,20,20,6,'#9ca38a',1,{id:'ranger',name:'Cloud Forest ranger station',kind:'cabin'});
  const tailor=buildings.find(b=>b.x===33&&b.z===-29);if(tailor){tailor.id='tailor';tailor.kind='clothing';tailor.name='Lotus Threads';sign('LOTUS THREADS • CLOTHING',33,5,-19.8,12,'#a62646');}
  const club=buildings.find(b=>b.x===81&&b.z===-77);if(club){club.id='club';club.kind='club';club.name='Ceylon Social Club';sign('CEYLON SOCIAL • MUSIC & DANCE',81,5,-67.8,12,'#a62646');}
  // Uneven coastal rocks, forest, distant mountains and beaches disguise the map boundary.
  for(let i=0;i<75;i++){
    let x=-312+rand()*407,z=-118-rand()*200,r=4+rand()*7;
    if(LOCATIONS.some(l=>Math.hypot(x-l.x,z-l.z)<r+5)||Math.abs(x)<15||Math.abs(x+192)<14||Math.abs(z+144)<14||Math.abs(z+240)<14||buildings.some(b=>Math.abs(x-b.x)<b.w/2+r+3&&Math.abs(z-b.z)<b.d/2+r+3))continue;
    cone(x,3,z,r,9+rand()*12,z<-235?'#a1ada4':'#83958a',7);collider({x,z,r:r*.94,height:16,kind:'hill'});
  }
  for(let i=0;i<65;i++){
    const z=-340+i*10;cone(-331+Math.sin(i*1.7)*3,3,z,8,12,'#758579',7);
    collider({x:-327,z,r:7,height:12,kind:'cliff'});
  }
  for(let i=0;i<48;i++){
    const x=-326+i*9;cone(x,4,-334+Math.sin(i)*3,9,18,'#8d9e95',7);collider({x,z:-330,r:8,height:18,kind:'cliff'});
    cone(x,-.2,288+Math.sin(i)*4,8,5,'#c2b393',7);
  }
  for(let z=-320;z<279;z+=13){cone(119+Math.sin(z)*2,-.3,z,9,3,'#baa98b',7);collider({x:113,z,w:4,d:15,height:3,kind:'coast'});}
  // Distant scenery remains visible from shoulder/first-person cameras.
  for(let i=0;i<28;i++)cone(-500+i*35,10,-430-Math.sin(i)*40,35,70+rand()*55,'#809991',7);
  flush(rootBatches,scene);
  // Reuse the user's existing GLB assets; fallback geometry keeps the game usable if a file cannot load.
  const loader=new GLTFLoader(); const assetLoads=[];
  function asset(url,placements,height){
    if(!url.includes('lantern'))for(const p of placements)collider({x:p[0],z:p[1],r:url.includes('stone')?height*.6:.6,height,kind:url.includes('stone')?'rock':'tree'});
    const job=loader.loadAsync(url).then(gltf=>{
      const bounds=new THREE.Box3().setFromObject(gltf.scene);const size=bounds.getSize(new THREE.Vector3());
      for(const p of placements){const model=gltf.scene.clone(true);model.scale.setScalar(height/Math.max(size.y,.01));model.position.set(p[0],.3-bounds.min.y*model.scale.y,p[1]);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model);}
      return url;
    }).catch(err=>{console.warn('Optional scenery asset unavailable:',url,err.message);return null;});assetLoads.push(job);
  }
  asset('/assets/nature/tree_blocks.glb',[[15,-63],[34,-63],[15,-83],[34,-83],[-88,-59],[-58,-87]],7);
  asset('/assets/nature/tree_blocks_dark.glb',[[-106,20],[-106,-25],[-105,78],[-40,-117],[40,-120]],8);
  const hillTrees=[];for(let i=0;i<170;i++){const x=-310+rand()*409,z=-111-rand()*207;if(Math.abs(x)<13||Math.abs(x+192)<13||Math.abs(z+144)<12||Math.abs(z+240)<12||solids.some(s=>s.kind==='building'&&Math.abs(x-s.x)<s.w/2+3&&Math.abs(z-s.z)<s.d/2+3))continue;hillTrees.push([x,z]);}
  asset('/assets/generated/pine-frost.glb',hillTrees.filter(p=>p[1]<-225),8);
  asset('/assets/generated/pine.glb',hillTrees.filter(p=>p[1]>=-225),8);
  asset('/assets/nature/stone_largeC.glb',[[-14,-140],[21,-124],[-60,-130]],3);
  asset('/assets/generated/lantern.glb',[[-60,-58],[-84,-58]],2);
  const markers=LOCATIONS.map(loc=>{
    const g=new THREE.Group();g.position.set(loc.x,.3,loc.z);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.09,6,32),new THREE.MeshBasicMaterial({color:loc.color}));ring.rotation.x=Math.PI/2;g.add(ring);
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.5),new THREE.MeshBasicMaterial({color:loc.color}));gem.position.y=2.8;g.add(gem);scene.add(g);return {loc,group:g,gem};
  });
  return { solids, buildings, roadSegments, bounds:BOUNDS, windows, lamps, water, roadMat, markers, assetLoads, sign };
}

export { createPerson, createCar } from './actor-models.js';
