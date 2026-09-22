export const QUALITY={low:{pixelRatio:1,shadows:false,particles:250,lights:2,distance:190},balanced:{pixelRatio:1.25,shadows:true,particles:550,lights:4,distance:240},high:{pixelRatio:1.5,shadows:true,particles:800,lights:6,distance:290}};
export function readPreferences(storage,coarse=false){
 try{const p=JSON.parse(storage.getItem('maya-preferences'))||{};return {quality:QUALITY[p.quality]?p.quality:coarse?'low':'balanced',sensitivity:Number.isFinite(p.sensitivity)?Math.max(.4,Math.min(2,p.sensitivity)):1};}
 catch{return {quality:coarse?'low':'balanced',sensitivity:1};}
}
