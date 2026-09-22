import { clamp } from './physics.js';
export const LEDGER_OUTCOMES={
 union:{name:'Publish with the union',location:'harbor',reward:900,factions:{harbor:12,community:8,dockside:-12},influence:{harbor:25,community:5,dockside:-12},ravi:20,deepa:10,reputation:5,text:'Ravi posts the recovered wage figures where every dockworker can read them. Deepa signs her name beneath the totals. The union now has evidence to challenge the missing payments.'},
 police:{name:'File a police complaint',location:'station',reward:700,factions:{police:14,harbor:-5,dockside:-12},influence:{police:35,dockside:-10},ravi:-5,deepa:8,reputation:3,text:'Chamara registers the ledger as evidence. Deepa gains a formal record of her complaint; Ravi worries that the inquiry will delay the workers’ payments. City Watch influence rises at the harbor.'},
 crew:{name:'Sell it to the Dockside Crew',location:'garage',reward:1500,factions:{dockside:15,harbor:-18,community:-8,police:-10},influence:{dockside:25,harbor:-12,community:-8},ravi:-30,deepa:-25,reputation:-4,text:'The crew buys the ledger and keeps the names private. You receive the larger payment, but Ravi and Deepa learn where their evidence went. They will remember the decision.'},
};
export function normalizeEncounter(raw){return {stage:raw?.stage==='deliver'&&!LEDGER_OUTCOMES[raw?.choice]?'witness':['available','evidence','witness','deliver','resolved'].includes(raw?.stage)?raw.stage:'available',choice:LEDGER_OUTCOMES[raw?.choice]?raw.choice:null,tracking:raw?.tracking===true,missingWitness:raw?.missingWitness===true};}
export function encounterSpeaker(person,state){const q=state.activities.encounter;return person.id==='resident-3'&&(q.stage==='available'||q.stage==='deliver'&&q.choice==='union')||person.id==='resident-20'&&q.stage==='witness';}
export function resolveLedger(state,people,location){
 const q=state.activities.encounter,o=LEDGER_OUTCOMES[q.choice];if(q.stage!=='deliver'||!o||o.location!==location||state.heat>0)return null;
 for(const [f,n] of Object.entries(o.factions))state.factions[f]=clamp(state.factions[f]+n,-100,100);
 for(const [f,n] of Object.entries(o.influence))state.activities.influence.harbor[f]=clamp(state.activities.influence.harbor[f]+n,0,100);
 for(const [id,n] of [['resident-3',o.ravi],['resident-20',o.deepa]]){const p=people.find(p=>p.id===id);if(p)p.relationship=clamp(p.relationship+n,-100,100);}
 state.money+=o.reward;state.reputation=clamp(state.reputation+o.reputation,0,100);q.stage='resolved';q.tracking=false;return o;
}
export function updateLedgerWitness(state,people){
 const q=state.activities.encounter;if(q.stage==='witness'&&people.find(p=>p.id==='resident-20')?.dead){q.stage='deliver';q.choice='police';q.missingWitness=true;return true;}return false;
}
