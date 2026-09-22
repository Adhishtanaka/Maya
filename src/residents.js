import { createPerson, dressPerson, animatePerson } from './actor-models.js';
import { distance, clamp, LOCATIONS } from './systems.js';
import { segmentDistance } from './physics.js';

// Each visible resident is a persistent adult, not a disposable random pedestrian.
const biographies = [
 ['Nimali Perera','Tea grower','farm','I planted my first tea bushes with my father. Now I send the harvest to Amma, and keep his old notebook dry through every monsoon.','My youngest sister wants to bring our tea to the whole island. I would settle for one reliable delivery van.','tea'],
 ['Arun Fernando','Mechanic','garage','I rebuilt my mother’s three-wheeler after the flood. That repair became a workshop, then the place everyone calls when a car gives up.','A machine tells you what is wrong if you take time to listen. People do too.','garage'],
 ['Sahani de Silva','Nurse','clinic','I moved back from the capital when this hospital lost its night team. My father lives nearby, so the late shifts feel less lonely now.','The hospital needs supplies more than it needs another speech.','clinic'],
 ['Ravi Jayawardena','Dock organizer','harbor','My brother and I used to unload fishing boats before sunrise. He left for sea; I stayed to make sure dockworkers are paid on time.','A missing manifest can hide a whole week of stolen wages.','harbor'],
 ['Meena Suresh','Librarian','village','Our village library began with two shelves in my grandmother’s kitchen. I still stamp the books with her old rubber stamp.','Bring back one borrowed book and you have done something useful today.','village'],
 ['Dilan Abeysekera','Courier','tea','I know the lanes by the dogs that sleep in them. I am saving for a quiet electric bike, mostly for the dogs.','Take the north road slowly. The mist hides the bends.','outlook'],
 ['Farah Rahman','Tailor','village','I learned to sew from my aunt at the market. Her scissors are older than I am, and I still use them for every wedding jacket.','A uniform can tell you a job. It cannot tell you the person.','temple'],
 ['Kavin Tharmalingam','Radio technician','garage','The cyclone silenced our village radio. I repaired it with a bus battery and have been chasing clearer signals ever since.','There is an old transmitter near Mistwood. One day I will get it speaking again.','outlook'],
 ['Anjali Dias','Teacher','village','I teach geography in the same room where I once learned it. Half the maps are wrong now; the children are very good at finding the mistakes.','A visit to the harbor teaches more than a diagram of trade routes.','harbor'],
 ['Suresh Kumar','Fisherman','harbor','My boat is named after my late wife, Leela. The sea has changed, but I still know the little inlet where we first met.','The water turns green before heavy rain. Watch it this evening.','tea'],
 ['Malini Wickrama','Florist','temple','I grow temple flowers on the roof because the street gets too little sun. My neighbors complain, then ask for cuttings.','The jasmine opens at dusk. It is the best clock I own.','temple'],
 ['Ishan Senanayake','Paramedic','clinic','I used to race scooters. Now I drive an ambulance and understand why my mother worried every night.','Give an ambulance space. Someone inside is having the longest journey of their life.','clinic'],
 ['Yasmin Ali','Baker','tea','The bread recipe is my grandfather’s. The oven is borrowed, the shop is rented, and the early mornings are entirely mine.','I trade yesterday’s bread for fresh eggs at the cooperative.','farm'],
 ['Pradeep Silva','Electrician','garage','I keep a list of every streetlamp I have repaired. When I cannot sleep, I walk under them and count the ones still shining.','Rain finds the careless connections first.','garage'],
 ['Tharushi Mendis','Musician','tea','I play at Ceylon Social after my day job. My first audience was a bus queue that could not leave until the rain stopped.','The city sounds different at three in the morning. I am trying to write that down.','village'],
 ['Naveen Rodrigo','Architect','village','I came back to restore old houses, then discovered that their residents had better plans than any of my drawings.','A courtyard is not wasted space. It is where a family talks.','village'],
 ['Kumari Rajan','Market gardener','farm','My tomatoes survived last year because the village shared water. I measure a good harvest in the baskets I can give away.','Look at the soil before you look at the sky. Both tell you about tomorrow.','tea'],
 ['Roshan Peiris','Bus dispatcher','garage','My desk faces the bus yard. I have watched people leave for new lives and return carrying more bags than they took.','The last bus waits two extra minutes for the hospital shift. Officially, it does not.','clinic'],
 ['Ayesha Nazeer','Photographer','outlook','I photograph the places people hurry past. My favorite picture is a mechanic laughing beside a completely ruined engine.','Mistwood looks different every hour. There is no perfect time to visit.','outlook'],
 ['Sanjay Wijesinghe','Carpenter','village','My workshop smells of the same timber my father used. I am making new desks for the school from a warehouse’s old beams.','Wood with a history deserves another useful life.','harbor'],
 ['Deepa Gunaratne','Accountant','harbor','I count the harbor’s wages. Numbers are easy; persuading powerful people to leave them alone is the difficult part.','Keep copies. Especially of things someone tells you to throw away.','village'],
 ['Mahesh Balasuriya','Ranger','outlook','The forest station was supposed to be a six-month posting. Twelve years later, I still find paths I have never walked.','The snow stays up here. Down in town they think I make it up.','outlook'],
 ['Nilani Karunaratne','Potter','village','I fire my pots behind the community hall. The rain ruined my first kiln, so the neighbors helped build the second higher up.','Clay remembers every careless touch. Start gently.','temple'],
 ['Fazil Hameed','Shopkeeper','tea','I inherited a shop and three generations of unpaid tabs. I am not sure which part was the real inheritance.','Amma pays every Friday, even when she has to borrow from me first.','tea'],
 ['Chamara Ekanayake','Traffic officer','station','My first posting was the school crossing. I still think keeping one crossing safe matters more than an impressive arrest total.','People in a hurry forget that everyone else is trying to get home too.','station'],
 ['Priya Nadarajah','Doctor','clinic','I started in the hill clinics, carrying supplies through the rain. This hospital has walls, but the work asks the same patience.','Early help makes a difference. Do not leave an injured person alone.','clinic'],
 ['Udara Pathirana','Rice farmer','farm','Our paddy fields belong to four families. We argue about the water gates and then eat lunch together under the same tree.','The cooperative keeps us from having to bargain alone.','farm'],
 ['Hiruni Samarakoon','Pastry cook','tea','My first cake collapsed on the bus to a wedding. The couple still orders from me; they say nobody forgot that dessert.','If a delivery smells of cardamom, do not take the scenic route.','temple'],
 ['Imran Jaleel','Welding foreman','harbor','I build railings and repair fishing gear. My daughter wants me to teach a weekend class, but I am better with steel than speeches.','People remember a railing only when it fails. That is reason enough to make it well.','garage'],
 ['Sanduni Liyanage','Tour guide','temple','I tell visitors the stories my grandmother told me. I also tell them when a story has three different endings.','The temple is still a neighborhood, even when the cameras arrive.','temple'],
 ['Vijay Selvam','Warehouse clerk','harbor','I write poetry on the backs of rejected shipping labels. Nobody at work knows which drawer holds the good ones.','Sometimes a crate travels farther than the person carrying it ever will.','village'],
 ['Ruwani Hettiarachchi','Community organizer','village','After the flood, we made a list of who needed help and who had tools. That list became the community hall.','Choose people who stay after the photographs have been taken.','clinic'],
 ['Kasun Amarasinghe','Apprentice mechanic','garage','Arun gave me a job after I fixed a radio incorrectly three times. He said the fourth attempt proved I would not give up.','I can tune an engine now. The radio is still a problem.','garage'],
 ['Shalini Joseph','Archivist','temple','The temple records used to live in a leaking cupboard. I am drying and copying them one careful page at a time.','Someone wrote these names because they hoped we would remember.','village'],
 ['Nuwan Samarasinghe','Boat builder','harbor','I carve boat ribs by eye. My nephew uses a computer. We argue until the shapes match, which they usually do.','Good work can begin in different ways and still float.','farm'],
 ['Zahra Farook','Veterinarian','farm','Farm animals make excellent neighbors. They are direct about what hurts and rarely pretend to have followed my instructions.','The cooperative is collecting blankets before the cold rains.','clinic'],
 ['Lahiru Dissanayake','Night porter','home','I watch the apartment lobby while the city sleeps. I know who leaves early, who comes home tired, and who needs the lift held.','The quietest hours are full of small kindnesses.','tea'],
 ['Pavithra Gamage','Botanist','outlook','I study the plants that grow between the forest and the farms. Those untidy edges hold more life than most people notice.','Leave the flowers where you find them. A photograph travels better.','outlook'],
 ['Akram Saleem','Spice merchant','tea','My spice stall moved three times as the market grew. The sign still has the address of the first one, painted by my uncle.','You can find me by the cinnamon before you find the sign.','farm'],
 ['Dinithi Ranasinghe','Legal aid worker','village','I help neighbors read contracts before they sign them. Most trouble begins in the sentence nobody thinks matters.','Bring the papers to the hall. We can look at them together.','village'],
];
biographies.push(
 ['Nalin Dias','Dockside lookout','harbor','I repair nets by day and watch the south wharf for the crew at night. My brother wants me to leave before trouble catches up.','Keep your weapon down. I have a shift to finish and a brother to get home to.','harbor'],
 ['Rehana Iqbal','Crew driver','garage','I drove food deliveries before the crew offered better pay. I still take groceries to my mother every Sunday.','My car is my livelihood. We can talk as long as you respect that.','garage'],
 ['Dev Rajan','Dockside guard','harbor','The warehouse hired me after the factory closed. I keep a notebook of every boat that arrives after midnight.','No shooting near these crates. Some of us actually work here.','harbor'],
 ['Milan Costa','Crew fixer','harbor','I find missing spare parts for the docks. My daughter thinks I run an ordinary supply business, and I wish she were entirely right.','If you want trouble, leave my neighbors out of it.','village'],
);
export const RESIDENTS = biographies.map(([name,job,work,story,dialogue,errand],i)=>({
 id:`resident-${i}`,gender:[0,2,4,6,8,10,12,14,16,18,20,22,25,27,29,31,33,35,37,39,41].includes(i)?'woman':'man',variant:i%5,height:.93+(i%4)*.035,hair:['#252323','#48332c','#635144'][i%3],gang:i>=40,shiftOffset:(i%5)*.18,leisure:errand,name,job,work,story,dialogue,errand,age:24+(i*7)%43,
 skin:['#bd8e68','#d7ad87','#966e51','#c89773'][i%4],
 casual:`hsl(${(i*47+13)%360}, ${24+i%4*5}%, ${48+i%5*5}%)`,
 uniform:['#a9c5bd','#bb9570','#899ead','#d2c9aa','#738f87'][i%5],
 outdoor:i>=40||['Courier','Traffic officer','Tour guide','Ranger','Market gardener','Rice farmer','Photographer','Botanist','Fisherman'].includes(job),
 nightShift:['Nurse','Night porter','Musician','Paramedic'].includes(job),
}));
export function routineAt(person,hour) {
 if(person.nightShift) {
   if(hour>=20||hour<5)return 'work';
   if(hour<7)return 'commute-home';
   if(hour<14)return 'sleep';
   if(hour<18)return 'leisure';
   return 'commute-work';
 }
 if(hour<6||hour>=22)return 'sleep';
 if(hour<8)return 'commute-work';
 if(hour<16.5)return 'work';
 if(hour<20)return 'leisure';
 return 'commute-home';
}
export class Population {
 constructor(scene,world,navigator,saved={}) {
  this.scene=scene;this.world=world;this.navigator=navigator;this.pathBudget=0;this.cursor=0;
  const homes=world.buildings.filter(b=>['apartment','house','cabin'].includes(b.kind));
  this.people=RESIDENTS.map((data,i)=>{
   const home=homes[i%homes.length],work=world.buildings.find(b=>b.id===data.work)||world.buildings[i%world.buildings.length];
   const loc=LOCATIONS.find(l=>l.id===data.work)||LOCATIONS[0];
   let spot={x:loc.x+(i%3-1)*2,z:loc.z+4+(i%4)*2};
   if(i<6)spot={x:-8-i*1.7,z:36};
   const onRoad=p=>world.roadSegments.some(r=>segmentDistance(p,{x:r.x1,z:r.z1},{x:r.x2,z:r.z2})<r.width/2+1);
   if(navigator.collision.blocked(spot.x,spot.z,.6)||onRoad(spot)){
    const candidates=[{x:loc.x+10,z:loc.z+10},{x:loc.x-10,z:loc.z+10},{x:loc.x+10,z:loc.z-10},{x:loc.x-10,z:loc.z-10},home.door];
    spot=candidates.find(p=>!navigator.collision.blocked(p.x,p.z,.6)&&!onRoad(p))||{...home.door};
   }
   const memory=saved[data.id]||{};const mesh=createPerson(data.skin,data.casual,data);scene.add(mesh);mesh.position.set(spot.x,.3,spot.z);
   const p={...data,...spot,mesh,home,workBuilding:work,health:memory.health??100,dead:memory.dead??false,relationship:memory.relationship??0,met:memory.met??false,helped:memory.helped??false,helpCount:memory.helpCount??(memory.helped?1:0),cashDropped:memory.cashDropped===true,dropped:memory.dropped===true,routine:'',route:[],routePending:true,destination:spot,inside:null,fleeUntil:0,stun:0,injured:false,removed:memory.dead??false,outfit:'casual',hospitalUntil:0,hitCooldown:0};
   if(p.dead)mesh.visible=false;
   return p;
  });
 }
 setSchedule(p,hour,elapsed) {
  const routine=routineAt(p,(hour+(p.shiftOffset||0))%24);if(routine===p.routine)return;
  p.routine=routine;p.inside=null;p.mesh.visible=!p.dead;p.routePending=true;p.route=[];
  const working=routine==='work'||routine==='commute-work';
  p.outfit=working?'work':'casual';dressPerson(p.mesh,p.outfit,working?p.uniform:p.casual);
  if(working){p.destination={...p.workBuilding.door};p.destinationBuilding=p.outdoor?null:p.workBuilding.id;}
  else if(routine==='sleep'||routine==='commute-home'){p.destination={...p.home.door};p.destinationBuilding=p.home.id;}
  else {
   const n=Number(p.id.split('-')[1]);const place=LOCATIONS.find(l=>l.id===p.leisure)||LOCATIONS[n%LOCATIONS.length];
   p.destination={x:place.x+(n%3-1)*2,z:place.z+4};p.destinationBuilding=null;
   if(this.navigator.collision.blocked(p.destination.x,p.destination.z,.6))p.destination={...p.home.door};
  }
 }
 frighten(origin,elapsed,radius=24) {
  for(const p of this.people)if(!p.gang&&!p.dead&&!p.inside&&distance(p,origin)<radius){
   const dx=p.x-origin.x,dz=p.z-origin.z,len=Math.hypot(dx,dz)||1;
   p.fleeUntil=elapsed+12;p.destination={x:p.x+dx/len*18,z:p.z+dz/len*18};
   if(this.navigator.collision.blocked(p.destination.x,p.destination.z,.6))p.destination={...p.home.door};
   p.routePending=true;p.route=[];p.destinationBuilding=null;
  }
 }
 update(dt,state,cars=[]) {
  this.pathBudget+=dt;
  for(const p of this.people){
   p.hitCooldown=Math.max(0,p.hitCooldown-dt);p.stun=Math.max(0,p.stun-dt);
   if(p.impulse&&!p.vehicle&&!p.inside&&!p.removed){this.navigator.collision.move(p,p.impulse.x*dt,p.impulse.z*dt,.55);p.impulse.x*=Math.exp(-dt*3);p.impulse.z*=Math.exp(-dt*3);p.mesh.position.x=p.x;p.mesh.position.z=p.z;}
   if(p.vehicle||p.dead||p.injured||p.removed||p.medicalHold||p.following)continue;
   if(p.hospitalUntil>state.elapsed)continue;
   if(p.fleeUntil&&p.fleeUntil<=state.elapsed){p.fleeUntil=0;p.routine='';}
   if(!p.fleeUntil)this.setSchedule(p,state.hour,state.elapsed);
   if(p.inside||p.stun>0)continue;
   if(p.routePending&&this.pathBudget>=.08){
    p.route=this.navigator.route(p,p.destination,.58);p.routePending=false;this.pathBudget=0;
   }
   const target=p.route[0];
   if(target){
    const d=distance(p,target);if(d<.6){p.route.shift();continue;}
    const speed=p.fleeUntil?6:state.weather==='rain'?2.5:1.4;
    // Residents look before stepping into a lane; frightened people may run into danger.
    if(!p.fleeUntil&&cars.some(c=>{
      if(Math.abs(c.speed)<3||distance(c,p)>18)return false;
      const dx=Math.sin(c.angle),dz=Math.cos(c.angle),rx=p.x-c.x,rz=p.z-c.z;
      return rx*dx+rz*dz>0&&Math.abs(rx*dz-rz*dx)<3;
    }))continue;
    let dx=(target.x-p.x)/d,dz=(target.z-p.z)/d;
    for(const other of this.people){if(other===p||other.vehicle||other.inside||other.removed||other.dead)continue;const separation=distance(p,other);if(separation>0&&separation<1.15){dx+=(p.x-other.x)/separation*(1.15-separation)*2;dz+=(p.z-other.z)/separation*(1.15-separation)*2;}}
    const directionLength=Math.hypot(dx,dz)||1;dx/=directionLength;dz/=directionLength;
    const hit=this.navigator.collision.move(p,dx*Math.min(d,speed*dt),dz*Math.min(d,speed*dt),.55);
    if(hit){p.routePending=true;p.route=[];}
    p.mesh.rotation.y=Math.atan2(dx,dz);const swing=Math.sin(state.elapsed*speed*6)*.55;
    animatePerson(p.mesh,state.elapsed,speed,!!p.gang);
   }else if(distance(p,p.destination)<2&&p.destinationBuilding){p.inside=p.destinationBuilding;p.mesh.visible=false;}
   p.mesh.position.set(p.x,.3,p.z);
  }
 }
 nearest(position,radius=3.4,interior=null) {
  return this.people.filter(p=>!p.vehicle&&!p.dead&&!p.injured&&!p.removed&&p.inside===interior&&distance(interior?p.interiorPosition||p:p,position)<radius).sort((a,b)=>distance(a,position)-distance(b,position))[0];
 }
 serialize(){return Object.fromEntries(this.people.map(p=>[p.id,{health:p.health,dead:p.dead,relationship:p.relationship,met:p.met,helped:p.helped,helpCount:p.helpCount||0,cashDropped:!!p.cashDropped,dropped:!!p.dropped}]));}
}
