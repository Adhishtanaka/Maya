export const PROFILE_KEY='maya-player-profile';
export function normalizeProfile(raw){if(!raw||typeof raw.name!=='string'||!Number.isInteger(raw.age)||raw.age<1||raw.age>120)return null;const name=raw.name.trim().replace(/[<>\x00-\x1f]/g,'').slice(0,24);return name?{name,age:raw.age}:null;}
export function canEnterClub(profile){return !!profile&&profile.age>=18;}
export function readProfile(storage){try{return normalizeProfile(JSON.parse(storage.getItem(PROFILE_KEY)));}catch{return null;}}
