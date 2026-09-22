// Velocity is forward engine motion plus a decaying world-space collision impulse.
export function velocity(car){return {x:Math.sin(car.angle)*car.speed+(car.impulseX||0),z:Math.cos(car.angle)*car.speed+(car.impulseZ||0)};}
export function resolveImpact(a,b,pa=a,pb=b){
 const av=velocity(a),bv=velocity(b);let nx=pb.x-pa.x,nz=pb.z-pa.z,len=Math.hypot(nx,nz);
 if(len<.001){nx=av.x-bv.x;nz=av.z-bv.z;len=Math.hypot(nx,nz)||1;}nx/=len;nz/=len;
 const closing=(av.x-bv.x)*nx+(av.z-bv.z)*nz;if(closing<=0)return 0;
 const ma=a.spec?.mass||1300,mb=b.spec?.mass||1300,j=1.22*closing/(1/ma+1/mb);
 for(const [c,v,sign,mass] of [[a,av,-1,ma],[b,bv,1,mb]]){
  const vx=v.x+sign*j*nx/mass,vz=v.z+sign*j*nz/mass,forwardX=Math.sin(c.angle),forwardZ=Math.cos(c.angle);
  c.speed=vx*forwardX+vz*forwardZ;c.impulseX=vx-forwardX*c.speed;c.impulseZ=vz-forwardZ*c.speed;
  const side=nx*forwardZ-nz*forwardX;c.spin=Math.max(-1.8,Math.min(1.8,(c.spin||0)+sign*side*closing*.06));c.impactTime=.7;
 }
 return closing;
}
