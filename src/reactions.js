import {clamp} from './physics.js';
export function react(mesh,kind,now,direction=1){mesh.userData.action={kind,now,direction:direction<0?-1:1};}
export function reactionPose(mesh,now,baseY=.3){const u=mesh.userData,a=u.action;if(!a)return;const t=now-a.now;let p;
 if(a.kind==='down'||a.kind==='death'){p=clamp(t/.85,0,1);p=p*p*(3-2*p);mesh.rotation.z=a.direction*p*1.47;mesh.position.y=baseY+Math.sin(p*Math.PI)*.14;u.left.rotation.x=-.25*p;u.right.rotation.x=.45*p;u.kneeL.rotation.x=.8*p;u.kneeR.rotation.x=.45*p;u.armL.rotation.z=-.7*p;u.armR.rotation.z=.6*p;u.torso.rotation.x=.2*p;return;}
 const duration={punch:.42,shoot:.2,hit:.4,jump:.6,drink:1.4}[a.kind]||.4;if(t>duration){u.action=null;mesh.position.y=baseY;u.torso.rotation.x=u.torso.rotation.y=0;mesh.rotation.z=0;u.armL.rotation.z=u.armR.rotation.z=0;return;}
 p=Math.sin(clamp(t/duration,0,1)*Math.PI);
 if(a.kind==='punch'){u.armR.rotation.x=-1.5*p;u.elbowR.rotation.x=-.8*(1-p);u.armL.rotation.x=-.8;u.torso.rotation.y=-.2*p*a.direction;}
 if(a.kind==='shoot'){u.armR.rotation.x=-1.25-.35*p;u.elbowR.rotation.x=-.4*p;u.torso.rotation.x=-.08*p;}
 if(a.kind==='hit'){mesh.rotation.z=.22*p*a.direction;u.torso.rotation.x=-.25*p;u.armL.rotation.x=-.7*p;u.armR.rotation.x=-.7*p;}
 if(a.kind==='jump'){mesh.position.y=baseY+p*.7;u.kneeL.rotation.x=.9*p;u.kneeR.rotation.x=.7*p;u.armL.rotation.x=-.8*p;u.armR.rotation.x=-.8*p;}
 if(a.kind==='drink'){u.armR.rotation.x=-2.1*p;u.elbowR.rotation.x=-1.1*p;}
}
