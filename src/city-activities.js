import { normalizeEncounter } from './encounters.js';
import { clamp, distance } from './physics.js';
export const RACE_COURSES = [
 {id:'street',name:'Harbor rivals',description:'Race Ishara and Ruwan over two laps. First place earns the full purse; second earns half.',seconds:180,laps:2,prize:2500,opponents:2,route:[{x:96,z:96},{x:-48,z:96},{x:-48,z:48},{x:96,z:48}]},
 {id:'coast',name:'Coastal sprint',description:'A short checkpoint run along the waterfront.',seconds:95,laps:1,prize:1200,route:[{x:96,z:0},{x:96,z:-96},{x:48,z:-96},{x:48,z:0},{x:48,z:48},{x:96,z:48}]},
 {id:'circuit',name:'Old Town circuit',description:'Two laps around the southern city blocks.',seconds:150,laps:2,prize:1800,route:[{x:96,z:96},{x:-48,z:96},{x:-48,z:48},{x:96,z:48}]},
 {id:'highland',name:'Mistwood rally',description:'A long road run from the coast to the northern pines.',seconds:190,laps:1,prize:2200,route:[{x:96,z:-96},{x:0,z:-96},{x:0,z:-144},{x:-192,z:-144},{x:-192,z:-240},{x:0,z:-240}]},
];
export function raceCourse(race){return RACE_COURSES.find(c=>c.id===race?.course)||RACE_COURSES.find(c=>c.id==='coast');}
export function raceTarget(race){return raceCourse(race).route[race.checkpoint];}
export function startRace(id){const c=RACE_COURSES.find(c=>c.id===id);return c?{course:id,checkpoint:0,lap:1,time:c.seconds,countdown:c.opponents?3:0}:null;}
export function tickRace(race,dt,position,driving){
 if(race.countdown>0){race.countdown=Math.max(0,race.countdown-dt);return null;}
 race.time=Math.max(0,race.time-dt);if(race.time===0)return 'failed';
 if(!driving||distance(position,raceTarget(race))>=8)return null;
 race.checkpoint++;const c=raceCourse(race);
 if(race.checkpoint===c.route.length){if(race.lap>=c.laps)return 'won';race.lap++;race.checkpoint=0;}
 return 'checkpoint';
}
export const FACTIONS={community:{name:'Community',color:'#bed391'},harbor:{name:'Harbor Union',color:'#8ccdc6'},police:{name:'City Watch',color:'#96bce2'},dockside:{name:'Dockside Crew',color:'#d294af'}};
export const TERRITORIES=[
 {id:'oldtown',name:'Old Town',x:-82,z:57,w:64,d:63,initial:{community:45,harbor:10,police:20,dockside:15}},
 {id:'harbor',name:'South Harbor',x:25,z:210,w:140,d:100,initial:{community:15,harbor:45,police:15,dockside:35}},
 {id:'village',name:'Diyara',x:-264,z:63,w:85,d:115,initial:{community:50,harbor:15,police:25,dockside:5}},
];
export const CONTRACTS=[
 {id:'relief',name:'Monsoon relief',faction:'community',territory:'village',reward:650,description:'Collect farm produce, register the load at the community hall, then deliver it to the hospital.',stops:['farm','village','clinic'],verbs:['Collect donated produce','Register the relief shipment','Deliver hospital supplies']},
 {id:'union',name:'An honest manifest',faction:'harbor',territory:'harbor',reward:750,description:'Collect union records, verify transport repairs at the garage, then deposit the wage ledger at the bank.',stops:['harbor','garage','bank'],verbs:['Collect the union records','Verify the vehicle log','Deposit the wage ledger']},
 {id:'watch',name:'The missing wages',faction:'police',territory:'oldtown',reward:800,description:'Check harbor records and a village witness statement, then return the evidence to the station.',stops:['harbor','village','station'],verbs:['Read the loading report','Collect a witness statement','Turn in the evidence']},
 {id:'dockside',name:'After-hours consignment',faction:'dockside',territory:'harbor',reward:1100,description:'Pick up an illicit consignment at the harbor, move it through the farm depot, and deliver it to the garage. A reported pickup can bring police attention; lose any search before delivery.',stops:['harbor','farm','garage'],verbs:['Collect the consignment','Exchange the delivery papers','Deliver after losing the police']},
];
export function normalizeActivities(raw={}){
 const influence={};for(const t of TERRITORIES){influence[t.id]={};for(const f of Object.keys(FACTIONS)){const n=raw?.influence?.[t.id]?.[f];influence[t.id][f]=Number.isFinite(n)?clamp(n,0,100):t.initial[f];}}
 const c=CONTRACTS.find(c=>c.id===raw?.contract?.id),step=raw?.contract?.step;
 return {influence,encounter:normalizeEncounter(raw?.encounter),contract:c&&Number.isInteger(step)&&step>=0&&step<c.stops.length?{id:c.id,step}:null,completed:Math.floor(Number.isFinite(raw?.completed)?clamp(raw.completed,0,99999):0),raceBest:Object.fromEntries(RACE_COURSES.map(c=>[c.id,Number.isFinite(raw?.raceBest?.[c.id])?clamp(raw.raceBest[c.id],.01,c.seconds):null]))};
}
export function territoryOwner(activities,id){const t=TERRITORIES.find(t=>t.id===id);return Object.keys(FACTIONS).sort((a,b)=>(activities.influence[id][b]-activities.influence[id][a])||(t.initial[b]-t.initial[a]))[0];}
export function completeContract(state){
 const c=CONTRACTS.find(c=>c.id===state.activities.contract?.id);if(!c)return null;
 const bonus=territoryOwner(state.activities,c.territory)===c.faction?Math.round(c.reward*.1):0;
 const influence=state.activities.influence[c.territory];for(const f of Object.keys(FACTIONS))influence[f]=clamp(influence[f]+(f===c.faction?18:-6),0,100);
 state.money+=c.reward+bonus;state.factions[c.faction]=clamp(state.factions[c.faction]+8,-100,100);
 state.reputation=clamp(state.reputation+(c.faction==='dockside'?-2:3),0,100);state.activities.completed++;state.activities.contract=null;
 return {contract:c,reward:c.reward+bonus};
}
