import {distance} from './physics.js';
// Routes are verified from the actor's actual position, including the first segment.
export function reachableRoute(nav,start,goal,radius=.6){
 const candidates=[goal,...[2,4,7].flatMap(r=>Array.from({length:8},(_,i)=>({x:goal.x+Math.sin(i*Math.PI/4)*r,z:goal.z+Math.cos(i*Math.PI/4)*r})))];
 let attempts=0;for(const end of candidates){if(nav.collision.blocked(end.x,end.z,radius))continue;if(attempts++>=6)break;const path=nav.route(start,end,radius);if(path.length&&nav.collision.lineClear(start,path[0],radius,0))return path;}return [];
}
export function stepWalker(actor,goal,nav,dt,now,{speed=3.6,radius=.6,stop=1,visible=true}={}){
 const c=nav.collision;
 // Resolve only existing overlaps, never relocate a clear actor through a wall.
 if(c.blocked(actor.x,actor.z,radius)){const candidates=[.3,.6,.9,1.2,1.8].flatMap(r=>Array.from({length:16},(_,i)=>({x:actor.x+Math.sin(i*Math.PI/8)*r,z:actor.z+Math.cos(i*Math.PI/8)*r})));const free=candidates.find(p=>!c.blocked(p.x,p.z,radius));if(free)Object.assign(actor,free);}
 if(distance(actor,goal)<=stop&&visible){actor.navPath=[];actor.navStall=0;return 0;}
 if(now>=(actor.navAt||0)||!actor.navPath||actor.navGoal&&distance(actor.navGoal,goal)>4){actor.navPath=reachableRoute(nav,actor,goal,radius);actor.navGoal={x:goal.x,z:goal.z};actor.navAt=now+1.4;}
 while(actor.navPath?.length&&distance(actor,actor.navPath[0])<.35)actor.navPath.shift();const next=actor.navPath?.[0];if(!next)return 0;
 const before={x:actor.x,z:actor.z},d=distance(actor,next),step=Math.min(d,speed*dt);c.move(actor,(next.x-actor.x)/d*step,(next.z-actor.z)/d*step,radius);const moved=distance(before,actor);actor.navStall=moved<dt*.1?(actor.navStall||0)+dt:0;
 if(actor.navStall>.7){actor.navAt=0;actor.navPath=[];actor.navStall=0;actor.navRecoveries=(actor.navRecoveries||0)+1;}if(moved>.001)actor.facing=Math.atan2(actor.x-before.x,actor.z-before.z);return dt?moved/dt:0;
}
