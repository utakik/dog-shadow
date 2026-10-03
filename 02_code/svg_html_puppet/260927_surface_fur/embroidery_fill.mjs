import {REST_POINTS, inside, weightsAt} from './surface_fur.mjs';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const mean=ps=>ps.reduce((s,p)=>({x:s.x+p.x/ps.length,y:s.y+p.y/ps.length}),{x:0,y:0});
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return {x:x/d,y:y/d};};

function mixColor(hex,amount){
  const m=/^#([0-9a-f]{6})$/i.exec(hex||'');
  if(!m)return '#ffffff';
  const n=parseInt(m[1],16),to=amount>=0?255:0,t=Math.abs(amount);
  const c=s=>Math.round(((n>>s)&255)*(1-t)+to*t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

function principal(poly){
  const c=mean(poly);let xx=0,xy=0,yy=0;
  for(const p of poly){const x=p.x-c.x,y=p.y-c.y;xx+=x*x;xy+=x*y;yy+=y*y;}
  const angle=.5*Math.atan2(2*xy,xx-yy);
  let major={x:Math.cos(angle),y:Math.sin(angle)},minor={x:-major.y,y:major.x};
  const majorSpan=Math.max(...poly.map(p=>Math.abs((p.x-c.x)*major.x+(p.y-c.y)*major.y)))||1;
  const minorSpan=Math.max(...poly.map(p=>Math.abs((p.x-c.x)*minor.x+(p.y-c.y)*minor.y)))||1;
  if(minorSpan>majorSpan){const t=major;major=minor;minor=t;}
  return {center:c,major,minor,majorSpan:Math.max(majorSpan,minorSpan),minorSpan:Math.min(majorSpan,minorSpan)};
}

function endpointWeights(center,dir,length,poly){
  let L=length;
  for(let tries=0;tries<8;tries++){
    const a={x:center.x-dir.x*L/2,y:center.y-dir.y*L/2};
    const b={x:center.x+dir.x*L/2,y:center.y+dir.y*L/2};
    if(inside(a,poly)&&inside(b,poly)){
      const wa=weightsAt(a,poly),wb=weightsAt(b,poly);
      if(wa&&wb)return {wa,wb,length:Math.hypot(b.x-a.x,b.y-a.y)};
    }
    L*=.76;
  }
  return null;
}

const TARGETS={
  '鼻':{mode:'swirl',spacing:.043,length:.060,width:.016},
  '白眼_外':{mode:'tangent',spacing:.045,length:.052,width:.014},
  '白眼_内':{mode:'radial',spacing:.048,length:.047,width:.013},
  '黒眼':{mode:'radial',spacing:.040,length:.040,width:.015},
  '舌':{mode:'axis',spacing:.047,length:.072,width:.015},
  '下顎_黒線':{mode:'axis',spacing:.049,length:.061,width:.014},
  '耳':{mode:'ear',spacing:.047,length:.067,width:.014}
};

export class EmbroideryFill {
  constructor(){this.rig=null;this.threads=[];this.time=0;this.motion=0;this.count=0;this.enabled=true;this.glint=.72;this.wriggle=.35;this.density=1;this.lengthScale=.78;this.lodReference=110;this.prevAnchor=null;}
  bind(v,P,sign=1){const a=P[v.a],b=P[v.b],x=b.x-a.x,y=b.y-a.y;return {x:a.x+v.u*x-v.v*y*sign,y:a.y+v.u*y+v.v*x*sign};}
  polygons(P,sign=1){return this.rig.objects.map(o=>o.verts.map(v=>this.bind(v,P,sign)));}
  isStitched(o){return !!TARGETS[o.name]||/^牙\d+$/.test(o.name);}
  replacesFill(o){return this.isStitched(o)&&o.name!=='耳';}
  build(rig){
    this.rig=rig;this.threads=[];
    const polys=this.polygons(REST_POINTS,1);
    const palm=Math.max(1,Math.hypot(REST_POINTS[9].x-REST_POINTS[0].x,REST_POINTS[9].y-REST_POINTS[0].y));
    const eyeIndex=rig.objects.findIndex(o=>o.name==='黒眼');
    const eye=eyeIndex>=0?mean(polys[eyeIndex]):REST_POINTS[5];
    rig.objects.forEach((o,oi)=>{
      const base=TARGETS[o.name]||(/^牙\d+$/.test(o.name)?{mode:'axis',spacing:.043,length:.050,width:.014}:null);
      if(!base||o.verts.length<3)return;
      const poly=polys[oi],shape=principal(poly),spacing=palm*base.spacing*.52;
      const minX=Math.min(...poly.map(p=>p.x)),maxX=Math.max(...poly.map(p=>p.x));
      const minY=Math.min(...poly.map(p=>p.y)),maxY=Math.max(...poly.map(p=>p.y));
      const nx=Math.ceil((maxX-minX)/spacing),ny=Math.ceil((maxY-minY)/spacing);
      const toEye=unit(eye.x-shape.center.x,eye.y-shape.center.y);
      const earExtent=Math.max(...poly.map(p=>(p.x-shape.center.x)*toEye.x+(p.y-shape.center.y)*toEye.y))||1;
      for(let gy=0;gy<=ny;gy++)for(let gx=0;gx<=nx;gx++){
        const seed=oi*100003+gx*409+gy*811;
        const p={x:minX+(gx+.16+.68*rnd(seed))*spacing,y:minY+(gy+.16+.68*rnd(seed+1))*spacing};
        if(!inside(p,poly))continue;
        if(base.mode==='ear'){
          const toward=(p.x-shape.center.x)*toEye.x+(p.y-shape.center.y)*toEye.y;
          if(toward<-.12*earExtent)continue;
        }
        let dir;
        if(base.mode==='axis')dir=shape.major;
        else if(base.mode==='ear')dir=shape.minor;
        else{
          const radial=unit(p.x-shape.center.x,p.y-shape.center.y);
          dir=base.mode==='radial'?radial:{x:-radial.y,y:radial.x};
        }
        const jitter=(rnd(seed+2)-.5)*(base.mode==='swirl'?.40:.24);
        const cs=Math.cos(jitter),sn=Math.sin(jitter);dir={x:dir.x*cs-dir.y*sn,y:dir.x*sn+dir.y*cs};
        const ends=endpointWeights(p,dir,palm*base.length*(.78+.34*rnd(seed+3)),poly);
        if(!ends)continue;
        const wc=weightsAt(p,poly);if(!wc)continue;
        this.threads.push({oi,wa:ends.wa,wb:ends.wb,wc,maxNorm:ends.length/palm,width:base.width*(.82+.34*rnd(seed+4)),phase:rnd(seed+5)*Math.PI*2,
          freq:.62+.55*rnd(seed+6),bend:(rnd(seed+7)-.5)*2,shade:.78+.22*rnd(seed+8),lod:rnd(seed+9),seed});
      }
    });
    this.reset();
  }
  reset(){this.time=0;this.motion=0;this.prevAnchor=null;this.count=0;}
  prepare(P,dt,sign,solo){
    this.ps=this.polygons(P,sign);this.dt=Math.min(.1,dt);this.time+=this.dt;
    this.visible=this.rig.objects.map((o,i)=>o.visible!==false&&(!solo||solo===i+1));
    const anchor=P[9],palm=Math.max(1,Math.hypot(P[9].x-P[0].x,P[9].y-P[0].y));
    let speed=0;
    if(this.prevAnchor&&dt>.001&&dt<.2)speed=Math.hypot(anchor.x-this.prevAnchor.x,anchor.y-this.prevAnchor.y)/palm/dt;
    this.prevAnchor={x:anchor.x,y:anchor.y};
    const a=1-Math.exp(-this.dt/.12);this.motion+=(clamp(speed/2.5,0,1)-this.motion)*a;this.count=0;
    this.palm=palm;
  }
  drawObject(ctx,oi){
    const o=this.rig.objects[oi],poly=this.ps[oi];if(!poly||!this.visible[oi])return;
    const color=o.fill?.color||o.stroke?.color||'#ffffff',opacity=o.fill?.opacity??1;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(const s of this.threads){
      if(s.oi!==oi)continue;
      const scaleBoost=Math.max(1,Math.pow(this.palm/this.lodReference,2));
      const poolRatio=1/Math.pow(.52,2);
      if(s.lod>clamp(this.density/poolRatio*scaleBoost,0,1))continue;
      const a0=s.wa.reduce((p,w,i)=>({x:p.x+w*poly[i].x,y:p.y+w*poly[i].y}),{x:0,y:0});
      const b0=s.wb.reduce((p,w,i)=>({x:p.x+w*poly[i].x,y:p.y+w*poly[i].y}),{x:0,y:0});
      const center=s.wc.reduce((p,w,i)=>({x:p.x+w*poly[i].x,y:p.y+w*poly[i].y}),{x:0,y:0});
      // Keep individual stitches compact at desktop distance while preserving the far view.
      const adaptive=clamp(this.lodReference/this.palm,.50,1);
      const ex=b0.x-a0.x,ey=b0.y-a0.y,deformed=Math.hypot(ex,ey);
      if(!Number.isFinite(deformed)||deformed<1e-4)continue;
      // Mean-value endpoint bindings can stretch on a strongly deformed,
      // concave mouth polygon. Keep the stable center binding and cap length.
      const capped=Math.min(deformed,s.maxNorm*this.palm*1.12)*this.lengthScale*adaptive;
      const ux=ex/deformed,uy=ey/deformed;
      const a={x:center.x-ux*capped/2,y:center.y-uy*capped/2};
      const b={x:center.x+ux*capped/2,y:center.y+uy*capped/2};
      const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
      // Short thread motion stays deliberately below the surface-fur amplitude.
      const calm=Math.sin(this.time*s.freq+s.phase)+.32*Math.sin(this.time*(s.freq*.43)+s.phase*1.71);
      const bend=s.bend+calm*this.wriggle;
      const mx=(a.x+b.x)/2+nx*bend*this.palm*.0032,my=(a.y+b.y)/2+ny*bend*this.palm*.0032;
      ctx.globalAlpha=opacity*s.shade;ctx.strokeStyle=color;ctx.lineWidth=Math.max(.7,s.width*this.palm);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(mx,my,b.x,b.y);ctx.stroke();
      // A narrow moving glint: nearly still at rest, clearer while the embroidery moves.
      const glintWave=.5+.5*Math.sin(this.time*1.8+s.phase+Math.atan2(dy,dx)*1.7);
      ctx.globalAlpha=opacity*(.045+this.motion*.46)*this.glint*(.55+.45*glintWave);
      ctx.strokeStyle=mixColor(color,color.toLowerCase()==='#feffff'?-.18:.60);
      ctx.lineWidth=Math.max(.38,s.width*this.palm*.28);
      const t0=.39,t1=.67,q0=(1-t0)*(1-t0),q1=2*(1-t0)*t0,q2=t0*t0;
      const x0=q0*a.x+q1*mx+q2*b.x,y0=q0*a.y+q1*my+q2*b.y;
      const r0=(1-t1)*(1-t1),r1=2*(1-t1)*t1,r2=t1*t1;
      const x1=r0*a.x+r1*mx+r2*b.x,y1=r0*a.y+r1*my+r2*b.y;
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();this.count++;
    }
    ctx.restore();
  }
}
