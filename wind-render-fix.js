// Realistic wind raster: a smooth background flow plus localized storm perturbations.
const windScale=[[0,[0,0,0]],[30,[20,45,180]],[60,[35,105,45]],[90,[85,190,70]],[110,[255,235,35]],[135,[255,145,20]],[160,[220,35,30]],[185,[120,35,155]],[215,[245,80,170]],[240,[255,255,255]]];
function windColor(value){
  const v=Math.max(0,Math.min(240,value));
  let i=windScale.length-2;
  for(let n=1;n<windScale.length;n++){
    if(v<=windScale[n][0]){i=n-1;break}
  }
  const a=windScale[i],b=windScale[i+1],q=(v-a[0])/(b[0]-a[0]);
  return [
    a[1][0]+(b[1][0]-a[1][0])*q,
    a[1][1]+(b[1][1]-a[1][1])*q,
    a[1][2]+(b[1][2]-a[1][2])*q
  ];
}
function windPerturbation(s,dx,dy,d,baseSpeed){
  const rad=windInfluenceRadius(s.type);
  if(d>=rad)return[0,0];
  const t=Math.max(0,1-d/rad);
  const inf=t*t*(3-2*t);
  const inv=1/(d+.001),tx=-dy*inv,ty=dx*inv;
  let rot=.05,inflow=.035,along=0;
  if(s.type==='single'){rot=.08;inflow=.05}
  else if(s.type==='multicell'){rot=.13;inflow=.07}
  else if(s.type==='line'){rot=.035;inflow=.035;along=.10}
  else if(s.type==='bow'){rot=.045;inflow=.03;along=.16}
  else if(s.type==='derecho'){rot=.025;inflow=.02;along=.20}
  else if(s.type==='supercell'){rot=.24;inflow=.11}
  const bx=Math.cos(flowAngle()),by=Math.sin(flowAngle());
  let u=tx*rot*inf*baseSpeed-dx*inv*inflow*inf*baseSpeed+bx*along*inf*baseSpeed;
  let v=ty*rot*inf*baseSpeed-dy*inv*inflow*inf*baseSpeed+by*along*inf*baseSpeed;
  if(s.tornado&&d<.03){
    const z=(1-d/.03)*baseSpeed*.8;
    u+=tx*z;v+=ty*z;
  }
  return[u,v];
}
function renderWind(){
  const image=wctx.createImageData(GRID,GRID),data=image.data,scale=2/GRID;
  const base=flowAngle(),bx=Math.cos(base),by=Math.sin(base),baseSpeed=windSpeed();
  for(let j=0;j<GRID;j++)for(let i=0;i<GRID;i++){
    const x=(i+.5-GRID/2)*scale,y=(j+.5-GRID/2)*scale;
    let u=bx*baseSpeed,v=by*baseSpeed;
    for(const s of storms){
      const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy);
      const p=windPerturbation(s,dx,dy,d,baseSpeed);
      u+=p[0];v+=p[1];
    }
    const val=Math.min(240,Math.hypot(u,v)),col=windColor(val),k=(j*GRID+i)*4;
    data[k]=col[0];data[k+1]=col[1];data[k+2]=col[2];data[k+3]=255;
  }
  wctx.putImageData(image,0,0);
}
function windVector(x,y){
  const base=flowAngle(),bx=Math.cos(base),by=Math.sin(base),baseSpeed=windSpeed();
  let u=bx*baseSpeed,v=by*baseSpeed;
  for(const s of storms){
    const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy),p=windPerturbation(s,dx,dy,d,baseSpeed);
    u+=p[0];v+=p[1];
  }
  const m=Math.hypot(u,v)||1;return[u/m,v/m];
}
function drawLegend(x,y){
  const labels=windMap?[30,60,90,110,135,160,185,215,240]:[10,20,30,40,50,60,70];
  ctx.font='9px ui-monospace,monospace';ctx.fillStyle='#9ebdc4';
  ctx.fillText(windMap?'VENT kt':'RÉFLECTIVITÉ dBZ',x,y-6);
  const bw=Math.min(30,(Math.min(canvas.clientWidth,canvas.clientHeight)*.72)/labels.length);
  labels.forEach((v,i)=>{
    const c=windMap?windColor(v):dbzColor(v);
    ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;ctx.fillRect(x+i*bw,y,bw,8);
    ctx.fillStyle='#789ba4';ctx.fillText(v,x+i*bw-2,y+19);
  });
}
