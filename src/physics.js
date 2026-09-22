// Shared world-space collision rules for characters, traffic, cameras, and weapons.
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function intersectsCircle(x, z, radius, shape) {
  if (shape.r != null) return Math.hypot(x - shape.x, z - shape.z) < radius + shape.r;
  const nearX = clamp(x, shape.x - shape.w / 2, shape.x + shape.w / 2);
  const nearZ = clamp(z, shape.z - shape.d / 2, shape.z + shape.d / 2);
  return Math.hypot(x - nearX, z - nearZ) < radius;
}
export class CollisionWorld {
  constructor(solids = [], bounds = null) {
    this.solids = solids;
    this.bounds = bounds;
    this.cells = new Map();
    this.cellSize = 16;
    for (const s of solids) this.index(s);
  }
  index(s) {
    const w = s.r ?? s.w / 2, d = s.r ?? s.d / 2;
    for (let x = Math.floor((s.x - w) / 16); x <= Math.floor((s.x + w) / 16); x++) {
      for (let z = Math.floor((s.z - d) / 16); z <= Math.floor((s.z + d) / 16); z++) {
        const key = `${x},${z}`;
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(s);
      }
    }
  }
  add(s) { this.solids.push(s); this.index(s); }
  candidates(x, z, radius) {
    const result = new Set();
    for (let a = Math.floor((x - radius) / 16); a <= Math.floor((x + radius) / 16); a++) {
      for (let b = Math.floor((z - radius) / 16); b <= Math.floor((z + radius) / 16); b++) {
        for (const s of this.cells.get(`${a},${b}`) || []) result.add(s);
      }
    }
    return result;
  }
  blocked(x, z, radius = .55, y = 0) {
    if (this.bounds && (x - radius < this.bounds.minX || x + radius > this.bounds.maxX || z - radius < this.bounds.minZ || z + radius > this.bounds.maxZ)) return true;
    for (const s of this.candidates(x, z, radius)) {
      if ((s.height ?? 100) > y && intersectsCircle(x, z, radius, s)) return true;
    }
    return false;
  }
  move(body, dx, dz, radius, slide = true) {
    // Substeps prevent fast cars/characters passing through thin tree trunks or walls.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.max(.18, radius * .45)));
    const sx = dx / steps, sz = dz / steps;
    let hit = false;
    for (let i = 0; i < steps; i++) {
      if (!this.blocked(body.x + sx, body.z + sz, radius)) { body.x += sx; body.z += sz; }
      else {
        hit = true;
        if (!slide) break;
        if (!this.blocked(body.x + sx, body.z, radius)) body.x += sx;
        if (!this.blocked(body.x, body.z + sz, radius)) body.z += sz;
      }
    }
    return hit;
  }
  lineClear(a, b, radius = .1, y = 1) {
    const len = distance(a, b), n = Math.max(1, Math.ceil(len / .45));
    for (let i = 1; i <= n; i++) if (this.blocked(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, radius, y)) return false;
    return true;
  }
}
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export function stoppingDistance(speed, reaction = .55, braking = 9) {
  return Math.abs(speed) * reaction + speed * speed / (2 * braking);
}
export function impactDamage(speed) { return clamp((Math.abs(speed) - 2) * 5, 0, 100); }
export function approach(value, target, change) {
  return value < target ? Math.min(target, value + change) : Math.max(target, value - change);
}

// A* over a cached collision grid. No route is preferred to walking through scenery.
export class Navigator {
  constructor(collision, step = 3) { this.collision = collision; this.step = step; this.walkable = new Map(); this.edges = new Map(); }
  node(x, z) { return { x: Math.round(x / this.step), z: Math.round(z / this.step) }; }
  key(n) { return `${n.x},${n.z}`; }
  free(n, radius) {
    const key = `${this.key(n)},${radius}`;
    if (!this.walkable.has(key)) this.walkable.set(key, !this.collision.blocked(n.x * this.step, n.z * this.step, radius));
    return this.walkable.get(key);
  }
  nearest(p, radius) {
    const origin = this.node(p.x, p.z);
    for (let r = 0; r <= 5; r++) for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      const n = { x: origin.x + x, z: origin.z + z };
      if (this.free(n, radius) && this.collision.lineClear(p, {x:n.x*this.step,z:n.z*this.step}, radius, 0)) return n;
    }
    return null;
  }
  route(start, goal, radius = .6) {
    if (this.collision.lineClear(start, goal, radius, 0)) return [{ x: goal.x, z: goal.z }];
    const a = this.nearest(start, radius), b = this.nearest(goal, radius);
    if (!a || !b) return [];
    const heap = [];
    const push = n => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= n.f) break; heap[i] = heap[p]; i = p; } heap[i] = n; };
    const pop = () => { const first = heap[0], last = heap.pop(); if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++; if (last.f <= heap[c].f) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return first; };
    const score = new Map([[this.key(a), 0]]), previous = new Map(), closed = new Set();
    push({ ...a, g:0, f: Math.hypot(a.x-b.x,a.z-b.z) });
    const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let found = null;
    for (let count = 0; heap.length && count < 16000; count++) {
      const n = pop(), k = this.key(n); if (closed.has(k)) continue; closed.add(k);
      if (n.x === b.x && n.z === b.z) { found = n; break; }
      for (const [dx,dz] of directions) {
        const next = {x:n.x+dx,z:n.z+dz}, nk = this.key(next);
        if (closed.has(nk) || !this.free(next,radius)) continue;
        if (dx && dz && (!this.free({x:n.x+dx,z:n.z},radius) || !this.free({x:n.x,z:n.z+dz},radius))) continue;
        const edge = [k,nk].sort().join('|')+','+radius;
        if (!this.edges.has(edge)) this.edges.set(edge,this.collision.lineClear({x:n.x*this.step,z:n.z*this.step},{x:next.x*this.step,z:next.z*this.step},radius,0));
        if (!this.edges.get(edge)) continue;
        const g = n.g + Math.hypot(dx,dz);
        if (g >= (score.get(nk) ?? Infinity)) continue;
        score.set(nk,g); previous.set(nk,n); push({...next,g,f:g+Math.hypot(next.x-b.x,next.z-b.z)});
      }
    }
    if (!found) return [];
    const path = [{x:goal.x,z:goal.z}];
    for (let n = found; n; n = previous.get(this.key(n))) path.push({x:n.x*this.step,z:n.z*this.step});
    path.reverse();
    // Discard redundant grid corners only when the entire segment is collision-free.
    const smooth = []; let origin = start;
    for (let i = 0; i < path.length;) { let j = Math.min(path.length-1,i+15); while (j>i&&!this.collision.lineClear(origin,path[j],radius,0)) j--; smooth.push(path[j]);origin=path[j];i=j+1; }
    return smooth;
  }
}

// Vehicle routes follow the road graph. Footpath A* is used only to join the road.
export class RoadNavigator {
  constructor(footNavigator, segments) {
    this.foot = footNavigator;
    this.collision = footNavigator.collision;
    this.segments = segments;
    this.nodes = new Map();
    const add = p => {
      const key = `${Math.round(p.x*100)/100},${Math.round(p.z*100)/100}`;
      if (!this.nodes.has(key)) this.nodes.set(key, {...p,key,links:new Map()});
    };
    for (const s of segments) { add({x:s.x1,z:s.z1}); add({x:s.x2,z:s.z2}); }
    for (const a of segments) for (const b of segments) {
      if (a.x1===a.x2 && b.z1===b.z2) {
        const p={x:a.x1,z:b.z1};
        if(this.contains(a,p)&&this.contains(b,p))add(p);
      }
    }
    for(const s of segments){
      const nodes=[...this.nodes.values()].filter(n=>this.contains(s,n)).sort((a,b)=>s.x1===s.x2?a.z-b.z:a.x-b.x);
      for(let i=1;i<nodes.length;i++){
        const a=nodes[i-1],b=nodes[i];
        if(this.collision.lineClear(a,b,2.5,0)){a.links.set(b.key,distance(a,b));b.links.set(a.key,distance(a,b));}
      }
    }
  }
  contains(s,p){return segmentDistance(p,{x:s.x1,z:s.z1},{x:s.x2,z:s.z2})<.01;}
  project(position){
    let best=null;
    for(const s of this.segments){
      const p={x:clamp(position.x,Math.min(s.x1,s.x2),Math.max(s.x1,s.x2)),z:clamp(position.z,Math.min(s.z1,s.z2),Math.max(s.z1,s.z2))};
      const d=distance(position,p);
      if(!best||d<best.distance)best={...p,segment:s,distance:d};
    }
    return best;
  }
  neighbors(projection){
    const s=projection.segment,axis=s.x1===s.x2?'z':'x';
    const nodes=[...this.nodes.values()].filter(n=>this.contains(s,n)).sort((a,b)=>a[axis]-b[axis]);
    const exact=nodes.find(n=>distance(n,projection)<.01);if(exact)return [exact];
    const before=nodes.filter(n=>n[axis]<projection[axis]).at(-1),after=nodes.find(n=>n[axis]>projection[axis]);
    return [before,after].filter(n=>n&&this.collision.lineClear(projection,n,2.5,0));
  }
  laneRoute(start,goal,radius=2.5,lane=2.8){
    const a=this.project(start),b=this.project(goal);if(!a||!b)return [];
    const center=this.route(a,b,radius),points=[{x:a.x,z:a.z}];
    for(const p of center)if(distance(points.at(-1),p)>.05)points.push(p);
    if(points.length<2)return this.foot.route(start,b,radius);
    const directions=points.slice(1).map((p,i)=>{const d=distance(p,points[i]);return {x:(p.x-points[i].x)/d,z:(p.z-points[i].z)/d};});
    const shifted=points.map((p,i)=>{
      const before=directions[Math.max(0,i-1)],after=directions[Math.min(i,directions.length-1)];
      const turn=Math.abs(before.x*after.z-before.z*after.x)>.5;
      return {x:p.x+lane*(turn?before.z+after.z:after.z),z:p.z-lane*(turn?before.x+after.x:after.x)};
    });
    const join=this.foot.route(start,shifted[0],radius);if(!join.length&&distance(start,shifted[0])>.3)return [];
    for(let i=1;i<shifted.length;i++)if(!this.collision.lineClear(shifted[i-1],shifted[i],radius,0))return [];
    return [...join,...shifted.slice(1)];
  }
  route(start,goal,radius=2.5){
    const a=this.project(start),b=this.project(goal);
    if(!a||!b)return [];
    if(a.segment===b.segment&&this.collision.lineClear(a,b,radius,0)){const join=this.foot.route(start,a,radius);return join.length||distance(start,a)<.3?[...join,{x:b.x,z:b.z}]:[];}
    const startNodes=this.neighbors(a),endNodes=this.neighbors(b),endKeys=new Set(endNodes.map(n=>n.key));
    if(!startNodes.length||!endNodes.length)return [];
    const costs=new Map(),previous=new Map(),open=[];
    for(const n of startNodes){costs.set(n.key,distance(a,n));open.push({key:n.key,cost:distance(a,n)});}
    let best=null,bestCost=Infinity;
    while(open.length){
      open.sort((a,b)=>b.cost-a.cost);const current=open.pop();if(current.cost!==(costs.get(current.key)))continue;
      if(current.cost>bestCost)break;
      const n=this.nodes.get(current.key);
      if(endKeys.has(n.key)&&current.cost+distance(n,b)<bestCost){best=n;bestCost=current.cost+distance(n,b);}
      for(const [key,length] of n.links){const cost=current.cost+length;if(cost>=(costs.get(key)??Infinity))continue;costs.set(key,cost);previous.set(key,n.key);open.push({key,cost});}
    }
    if(!best)return [];
    const path=[];for(let n=best;n;n=this.nodes.get(previous.get(n.key)))path.push({x:n.x,z:n.z});path.reverse();
    const join=this.foot.route(start,a,radius);if(!join.length&&distance(start,a)>.3)return [];
    return [...join,...path,{x:b.x,z:b.z}];
  }
}
