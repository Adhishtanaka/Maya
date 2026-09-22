import { SAVE_KEY, readSave } from './systems.js';
export const MANUAL_SLOTS=[1,2,3];
export const slotKey=slot=>{if(!MANUAL_SLOTS.includes(slot))throw new Error('Unknown save slot');return `maya-manual-${slot}`;};
export function writeSlot(storage,slot,save){storage.setItem(slotKey(slot),JSON.stringify({...save,savedAt:new Date().toISOString()}));}
export function listSlots(storage){return MANUAL_SLOTS.map(slot=>({slot,save:readSave(storage,slotKey(slot))}));}
export function restoreSlot(storage,slot){
 const save=readSave(storage,slotKey(slot));if(!save)return false;
 const current=storage.getItem(SAVE_KEY);if(current)storage.setItem('maya-before-load',current);
 storage.setItem(SAVE_KEY,JSON.stringify(save));return true;
}
