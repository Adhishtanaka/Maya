import {distance} from './physics.js';
import {animatePerson} from './actor-models.js';
import {react,reactionPose} from './reactions.js';
export function canRecruit(p,crew){return !p.dead&&!p.injured&&!p.police&&(p.helpCount||0)>=3&&p.relationship>=30&&crew.length<3&&!crew.includes(p.id);}
export class StreetLife{
 constructor(population,navigator,combat){this.population=population;this.navigator=navigator;this.combat=combat;this.threats=()=>[];}
 rejoin(s,vehicles){s.crew=s.crew.filter(id=>this.population.people.some(p=>p.id===id&&!p.dead&&!p.injured&&p.relationship>=0));for(const [index,id] of s.crew.entries()){const p=this.population.people.find(p=>p.id===id);const spots=Array.from({length:24},(_,i)=>({x:s.x+Math.sin((i+index*7)*Math.PI/12)*5,z:s.z+Math.cos((i+index*7)*Math.PI/12)*5}));const spot=spots.find(v=>!this.navigator.collision.blocked(v.x,v.z,.6)&&vehicles.cars.every(c=>distance(c,v)>3));if(!spot)continue;Object.assign(p,spot,{inside:null,vehicle:null,following:true,route:[]});p.mesh.position.set(p.x,.3,p.z);p.mesh.visible=true;}}
 provoke(p,state,crime){if(!crime||p.dead||p.injured||p.gang)return;p.responseUntil=state.elapsed+15;p.fighting=Number(p.id.split('-')[1])%3===0&&state.weapon==='fists'&&p.health>35;p.fleeUntil=p.fighting?0:state.elapsed+18;p.replyAt=0;if(!p.fighting){const dx=p.x-state.x,dz=p.z-state.z,d=Math.hypot(dx,dz)||1;for(const length of [18,10,5]){const goal={x:p.x+(dx||1)/d*length,z:p.z+dz/d*length};if(!this.navigator.collision.blocked(goal.x,goal.z,.6)){p.destination=goal;p.destinationBuilding=null;p.routePending=true;p.route=[];break;}}}}
 update(dt,s,onDamage){
  for(const p of this.population.people){
   if(!p.injured&&!p.dead&&p.mesh.userData.action?.kind==='down')p.mesh.userData.action=null;const ally=s.crew.includes(p.id);if(ally&&(p.dead||p.injured||p.relationship<0)){s.crew=s.crew.filter(id=>id!==p.id);p.following=false;}
   if(p.ridingWith&&(!s.driving||!ally)){this.population.scene.add(p.mesh);p.mesh.scale.setScalar(p.height||1);p.ridingWith=null;p.vehicle=null;p.x=s.x+3;p.z=s.z;p.mesh.position.set(p.x,.3,p.z);}
   if(p.dead||p.injured||p.removed){reactionPose(p.mesh,s.elapsed);continue;}
   if(ally&&s.driving&&!s.driving.spec.twoWheel&&(p.ridingWith||distance(p,s)<7)){p.ridingWith=s.driving;p.vehicle=s.driving;p.x=s.x;p.z=s.z;s.driving.mesh.add(p.mesh);p.mesh.scale.setScalar(.6);p.mesh.position.set(.5,.4,-.1-s.crew.indexOf(p.id)*.7);p.mesh.rotation.y=0;animatePerson(p.mesh,s.elapsed,0,false,true);p.following=true;continue;}
   if(ally&&(s.interior||s.flightMode)){p.following=true;p.stun=.1;continue;}
   if(p.meeting&&!p.dead&&!p.injured){if(s.elapsed>p.meeting.until){p.meeting=null;p.following=false;}else if(distance(p,p.meeting)<2.5){p.meeting=null;p.following=false;p.stun=10;this.onMeet?.(p);}else{p.following=true;this.move(p,p.meeting,dt,s,4.5);continue;}}
   if(p.vehicle||p.inside)continue;
   if(ally&&!s.interior&&!s.flightMode){p.following=true;p.fleeUntil=0;p.stun=.15;const i=s.crew.indexOf(p.id),goal={x:s.x+Math.cos(s.heading)*(i-1)*2,z:s.z-3};if(distance(p,s)>70){p.following=false;continue;}
    const threat=this.threats(s).filter(t=>distance(t,p)<14).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(threat)this.move(p,threat,dt,s,4);else if(distance(p,goal)>3)this.move(p,goal,dt,s,s.sprinting?7:3.4);
    if(threat&&distance(p,threat)<2.4&&(p.replyAt||0)<s.elapsed){p.replyAt=s.elapsed+1;react(p.mesh,'punch',s.elapsed);this.onDefend?.(threat,14,s);}reactionPose(p.mesh,s.elapsed);continue;
   }
   p.following=false;if(p.fighting&&s.elapsed<p.responseUntil&&!s.interior&&s.altitude<2){p.stun=.15;p.fleeUntil=0;if(distance(p,s)>2)this.move(p,s,dt,s,4.5);if(!p.swingAt&&s.elapsed>(p.replyAt||0)&&distance(p,s)<2.5){p.swingAt=s.elapsed+.23;p.replyAt=s.elapsed+1;react(p.mesh,'punch',s.elapsed);}if(p.swingAt&&s.elapsed>=p.swingAt){if(distance(p,s)<2.6&&s.dodge<=0&&this.navigator.collision.lineClear(p,s,.1,1))onDamage(9);p.swingAt=null;}if(p.health<35||s.weapon!=='fists'){p.fighting=false;p.fleeUntil=s.elapsed+18;}}
   if(p.fleeUntil>s.elapsed&&(p.nextHop||0)<s.elapsed&&p.route.length){p.nextHop=s.elapsed+5+(Number(p.id.split('-')[1])%3);react(p.mesh,'jump',s.elapsed);}
   reactionPose(p.mesh,s.elapsed);
  }
 }
 move(p,goal,dt,s,speed){if(distance(p,goal)<1.6)return;if((p.followRepath||0)<s.elapsed){p.followPath=this.navigator.route(p,goal,.6);p.followRepath=s.elapsed+1;}const next=p.followPath?.[0];if(!next)return;const d=distance(p,next);if(d<.6){p.followPath.shift();return;}this.navigator.collision.move(p,(next.x-p.x)/d*speed*dt,(next.z-p.z)/d*speed*dt,.6);p.mesh.position.set(p.x,.3,p.z);p.mesh.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);animatePerson(p.mesh,s.elapsed,speed);reactionPose(p.mesh,s.elapsed);}
}
