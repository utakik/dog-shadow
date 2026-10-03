// Surface hair for the hand-bound dog. Reference pose = editor frame 100.
export const REST_POINTS = [[993.1,1084],[968.2,915.3],[887.3,769.1],[803.3,656.8],[769.7,549.5],[610.6,867.1],[451,844.6],[354.3,841.5],[269,838.6],[585,947.6],[410.9,923.8],[300.8,910.5],[207.7,898.3],[592.2,1026],[424.8,1003.4],[326.3,985.9],[237,968.4],[626.3,1108],[489,1089.5],[405.2,1074.9],[322.5,1056]].map(([x,y])=>({x,y}));
export const REGION_DEFAULTS = {
  muzzle:{label:'鼻筋',length:0.13,angle:-25,density:1,width:0.014},
  forehead:{label:'額',length:0.14,angle:-30,density:1.1,width:0.014},
  cheek:{label:'頬',length:0.17,angle:20,density:1,width:0.014},
  ear:{label:'耳',length:0.14,angle:5,density:0.8,width:0.014},
  jaw:{label:'下顎',length:0.13,angle:25,density:1,width:0.014},
  beard:{label:'顎下の長毛',length:0.25,angle:32,density:0.8,width:0.016},
  rear:{label:'後頭部の長毛',length:0.30,angle:50,density:0.85,width:0.016}
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function inside(p,ps){
  let yes=false;
  for(let i=0,j=ps.length-1;i<ps.length;j=i++){
    const a=ps[i],b=ps[j];
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
  } return yes;
}
// Mean-value coordinates bind each interior root to its polygon's existing vertices.
// No random resampling during tracking, no dependence on resolution or camera size.
export function weightsAt(p,ps){
  const n=ps.length,dx=ps.map(q=>q.x-p.x),dy=ps.map(q=>q.y-p.y),r=dx.map((x,i)=>Math.hypot(x,dy[i]));
  const near=r.findIndex(d=>d<1e-7);
  if(near>=0)return r.map((_,i)=>i===near?1:0);
  const t=r.map((d,i)=>{const j=(i+1)%n;return Math.tan(Math.atan2(dx[i]*dy[j]-dy[i]*dx[j],dx[i]*dx[j]+dy[i]*dy[j])/2);});
  const w=r.map((d,i)=>(t[(i+n-1)%n]+t[i])/d),sum=w.reduce((a,b)=>a+b,0);
  if(!Number.isFinite(sum)||Math.abs(sum)<1e-10)return null;
  const result=w.map(x=>x/sum);
  return result.every(Number.isFinite)?result:null;
}
export class SurfaceCoat {
  constructor(){this.regions=structuredClone(REGION_DEFAULTS);this.density=1;this.strength=0.8;this.color='#e8f4f2';this.hairs=[];this.count=0;this.speed=0;this.warnings=[];this.time=0;this.idleSway=1;this.lodReference=170;}
  isFurry(o){return ['上顎','下顎','耳'].includes(o.name)||/^髭/.test(o.name);}
  bind(v,P,sign=1){const a=P[v.a],b=P[v.b],x=b.x-a.x,y=b.y-a.y;return {x:a.x+v.u*x-v.v*y*sign,y:a.y+v.u*y+v.v*x*sign};}
  polygons(P,sign){return this.rig.objects.map(o=>o.verts.map(v=>this.bind(v,P,sign)));}
  axes(P,ps){
    const center=(name,fallback)=>{const poly=ps[this.rig.objects.findIndex(o=>o.name===name)];return poly?.length?poly.reduce((s,p)=>({x:s.x+p.x/poly.length,y:s.y+p.y/poly.length}),{x:0,y:0}):fallback;};
    const nose=center('鼻',P[8]),eye=center('黒眼',P[5]),back=unit(eye.x-nose.x,eye.y-nose.y);
    let down={x:-back.y,y:back.x};
    if(down.x*(P[0].x-P[9].x)+down.y*(P[0].y-P[9].y)<0)down={x:-down.x,y:-down.y};
    return {eye,back,down,palm:Math.max(1,Math.hypot(P[9].x-P[0].x,P[9].y-P[0].y))};
  }
  region(o,p,ax){
    if(o.name==='耳')return 'ear';
    if(o.name==='下顎')return 'jaw';
    if(/^髭/.test(o.name))return ['髭3','髭4'].includes(o.name)?'rear':'beard';
    const x=((p.x-ax.eye.x)*ax.back.x+(p.y-ax.eye.y)*ax.back.y)/ax.palm;
    const y=((p.x-ax.eye.x)*ax.down.x+(p.y-ax.eye.y)*ax.down.y)/ax.palm;
    return x<-.5?'muzzle':x>.65?'rear':y<-.08?'forehead':'cheek';
  }
  flowConfig(o,p,ax,region){
    if(o.name!=='上顎')return this.regions[region];
    const x=((p.x-ax.eye.x)*ax.back.x+(p.y-ax.eye.y)*ax.back.y)/ax.palm;
    const y=((p.x-ax.eye.x)*ax.down.x+(p.y-ax.eye.y)*ax.down.y)/ax.palm;
    // Blend the four head fields over broad bands. This removes the hard
    // forehead/cheek parting while retaining every area's editable settings.
    const muzzle=1-smoothstep(-.76,-.30,x),rear=smoothstep(.42,.88,x);
    const middle=Math.max(0,1-Math.max(muzzle,rear));
    const lower=smoothstep(-.30,.22,y);
    const weights={muzzle,rear,forehead:middle*(1-lower),cheek:middle*lower};
    const total=Object.values(weights).reduce((a,b)=>a+b,0)||1;
    const mixed={length:0,angle:0,density:0,width:0};
    for(const [name,w] of Object.entries(weights))for(const key of Object.keys(mixed))mixed[key]+=this.regions[name][key]*w/total;
    return mixed;
  }
  build(rig){
    this.rig=rig;this.hairs=[];this.warnings=[];
    const ps=this.polygons(REST_POINTS,1),ax=this.axes(REST_POINTS,ps);
    // Dense fixed candidate grid; density is a deterministic subset of this grid.
    // Build a high-density pool once. Drawing selects a deterministic subset;
    // a larger on-screen hand therefore gains hairs without random popping.
    const spacing=ax.palm*0.040;
    rig.objects.forEach((o,oi)=>{
      if(!this.isFurry(o)||o.verts.length<3)return;
      const poly=ps[oi],minX=Math.min(...poly.map(p=>p.x)),maxX=Math.max(...poly.map(p=>p.x));
      const minY=Math.min(...poly.map(p=>p.y)),maxY=Math.max(...poly.map(p=>p.y));
      const nx=Math.ceil((maxX-minX)/spacing),ny=Math.ceil((maxY-minY)/spacing);
      if(nx*ny>100000){this.warnings.push(o.name+': 頂点の広がりが大きすぎます');return;}
      for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
        const seed=oi*100000+x*137+y*773;
        const p={x:minX+(x+0.18+0.64*rnd(seed))*spacing,y:minY+(y+0.18+0.64*rnd(seed+1))*spacing};
        if(!inside(p,poly))continue;
        const region=this.region(o,p,ax),cfg=this.regions[region];
        const weights=weightsAt(p,poly);if(!weights)continue;
        this.hairs.push({oi,region,weights,lod:rnd(seed+2),length:0.82+0.36*rnd(seed+3),angle:(rnd(seed+4)-.5)*12,
          curve:0.10+0.10*rnd(seed+5),shade:0.72+0.28*rnd(seed+6),phase:rnd(seed+7)*Math.PI*2,
          idleFreq:.42+.48*rnd(seed+8),idleMix:.55+.45*rnd(seed+9),seed});
      }
    });this.reset();
  }
  reset(){for(const h of this.hairs)Object.assign(h,{prev:null,vx:0,vy:0,x:0,y:0,dx:0,dy:0});this.count=0;this.speed=0;}
  prepare(P,dt,sign,solo){
    this.ps=this.polygons(P,sign);this.ax=this.axes(P,this.ps);this.dt=dt;this.time+=Math.min(.1,dt);
    this.visible=this.rig.objects.map((o,i)=>o.visible!==false&&(!solo||solo===i+1));
    this.count=0;this.speed=0;
  }
  drawObject(ctx,oi){
    const ax=this.ax,palm=ax.palm,dt=this.dt,objects=this.rig.objects;
    ctx.save();ctx.lineCap='round';ctx.strokeStyle=this.color;
    for(const h of this.hairs){
      if(h.oi!==oi)continue;
      const densityCfg=this.regions[h.region];
      const scaleBoost=Math.max(1,Math.pow(palm/this.lodReference,2));
      const poolRatio=Math.pow(.070/.040,2);
      const keep=clamp(this.density*densityCfg.density/4/poolRatio*scaleBoost,0,1);
      if(h.lod>keep){h.prev=null;continue;}
      const ps=this.ps[oi],root=h.weights.reduce((p,w,i)=>({x:p.x+w*ps[i].x,y:p.y+w*ps[i].y}),{x:0,y:0});
      // Reserve the head-side half of the ear for short embroidery stitches.
      if(objects[oi].name==='耳'){
        const earCenter=ps.reduce((s,p)=>({x:s.x+p.x/ps.length,y:s.y+p.y/ps.length}),{x:0,y:0});
        const toEye=unit(ax.eye.x-earCenter.x,ax.eye.y-earCenter.y);
        const extent=Math.max(...ps.map(p=>(p.x-earCenter.x)*toEye.x+(p.y-earCenter.y)*toEye.y))||1;
        const toward=(root.x-earCenter.x)*toEye.x+(root.y-earCenter.y)*toEye.y;
        if(toward>=-.12*extent){h.prev=null;continue;}
      }
      // Do not grow through the eye/nose or through a later foreground patch.
      const hidden=this.ps.some((poly,i)=>i>oi&&this.visible[i]&&objects[i].closed&&
        (this.isFurry(objects[i])||objects[i].fill?.on)&&inside(root,poly));
      if(hidden||!inside(root,ps)){h.prev=null;continue;}
      const cfg=this.flowConfig(objects[oi],root,ax,h.region);
      const L=cfg.length*h.length;
      const jump=h.prev?Math.hypot(root.x-h.prev.x,root.y-h.prev.y)/palm:0;
      if(!h.prev||dt>.2||jump>.65){h.vx=h.vy=h.x=h.y=h.dx=h.dy=0;}
      else{
        const alpha=1-Math.exp(-dt/.10);
        let vx=(root.x-h.prev.x)/palm/dt,vy=(root.y-h.prev.y)/palm/dt;
        const f=Math.min(1,6/(Math.hypot(vx,vy)||1));
        h.vx+=(vx*f-h.vx)*alpha;h.vy+=(vy*f-h.vy)*alpha;
      }h.prev=root;
      const speed=Math.hypot(h.vx,h.vy),dead=speed<.06?0:1-.06/speed;
      let tx=-h.vx*dead*this.strength*L*.35,ty=-h.vy*dead*this.strength*L*.35;
      const cap=Math.min(1,L*.8/(Math.hypot(tx,ty)||1));tx*=cap;ty*=cap;
      const elapsed=Math.min(.1,dt),steps=Math.max(1,Math.ceil(elapsed*120)),step=elapsed/steps;
      const omega=16/Math.sqrt(Math.max(.3,L/.14));
      for(let k=0;k<steps;k++){
        h.dx+=((tx-h.x)*omega*omega-1.3*omega*h.dx)*step;
        h.dy+=((ty-h.y)*omega*omega-1.3*omega*h.dy)*step;
        h.x+=h.dx*step;h.y+=h.dy*step;
      }
      const angle=(cfg.angle+h.angle)*Math.PI/180;
      const dir={x:ax.back.x*Math.cos(angle)+ax.down.x*Math.sin(angle),y:ax.back.y*Math.cos(angle)+ax.down.y*Math.sin(angle)};
      const length=L*palm,dx=dir.x*length,dy=dir.y*length;
      const droop=length*h.curve;
      // Independent low-frequency motion keeps the coat breathing even when the hand is still.
      // It is intentionally stronger than the embroidery-thread motion.
      const normal={x:-dir.y,y:dir.x};
      const idle=(Math.sin(this.time*h.idleFreq+h.phase)+.38*Math.sin(this.time*(h.idleFreq*.47)+h.phase*1.63));
      const idleSide=idle*this.idleSway*L*(.085+.035*h.idleMix);
      const idleAlong=Math.sin(this.time*(h.idleFreq*.73)+h.phase*.81)*this.idleSway*L*.025;
      const tipX=(h.x+normal.x*idleSide+dir.x*idleAlong)*palm;
      const tipY=(h.y+normal.y*idleSide+dir.y*idleAlong)*palm;
      ctx.lineWidth=Math.max(.55,cfg.width*palm*(.85+.15*h.length));ctx.globalAlpha=h.shade;
      ctx.beginPath();ctx.moveTo(root.x,root.y);
      ctx.bezierCurveTo(root.x+dx*.32,root.y+dy*.32-droop*.3,
        root.x+dx*.72+tipX*.35,root.y+dy*.72+droop*.4+tipY*.35,
        root.x+dx+tipX,root.y+dy+droop+tipY);
      ctx.stroke();this.count++;this.speed+=speed;
    }ctx.restore();
  }
}
