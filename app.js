const canvas=document.getElementById('radar'),ctx=canvas.getContext('2d');
const raster=document.createElement('canvas'),rctx=raster.getContext('2d',{alpha:false});
const windRaster=document.createElement('canvas'),wctx=windRaster.getContext('2d',{alpha:false});
let paused=false,last=0,simTime=0,renderClock=0,windMap=false;
let speed=1,intensity=70,wind=70,storms=[];
const GRID=96,TAU=Math.PI*2,RADAR_MS=90,RADAR_KM=120;
const el=id=>document.getElementById(id);
const profiles={single:{r:.11,cells:1,rot:.05,tornado:false},multicell:{r:.13,cells:4,rot:.22,tornado:false},line:{r:.10,cells:8,rot:.08,tornado:false},supercell:{r:.20,cells:2,rot:.8,tornado:true},bow:{r:.13,cells:8,rot:.12,tornado:false},derecho:{r:.15,cells:11,rot:.06,tornado:false}};
function flowAngle(){return (wind-90)*Math.PI/180}
function makeStorm(i=0,type=el('stormType')?.value||'supercell'){
 const p=profiles[type]||profiles.supercell,a=i*1.73+.4,rad=.25+Math.random()*.62,fa=flowAngle();
 const structure=(type==='supercell'?fa+(Math.random()-.5)*.25:fa+(Math.random()-.5)*.08);
 return{x:Math.cos(a)*rad,y:Math.sin(a)*rad,r:p.r*(.9+Math.random()*.22),cells:p.cells,rot:(Math.random()>.5?1:-1)*p.rot,age:Math.random()*20,phase:Math.random()*TAU,seed:Math.random()*1000,tilt:structure,type,tornado:type==='supercell'&&Math.random()<.7};
}
function seed(){const type=el('stormType')?.value||'supercell';storms=Array.from({length:5},(_,i)=>makeStorm(i,type));renderClock=RADAR_MS}
seed();
function resize(){const d=devicePixelRatio||1,r=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));ctx.setTransform(d,0,0,d,0,0);raster.width=GRID;raster.height=GRID;windRaster.width=GRID;windRaster.height=GRID}addEventListener('resize',resize);resize();
function compass(d){return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'][Math.round(d/22.5)%16]}
function windSpeed(){return Math.round(35+intensity*.5+speed*4)}
function hash(x,y,s=0){const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)}
el('speed').oninput=e=>{speed=+e.target.value;el('speedOut').textContent=speed.toFixed(2)+'×'};
el('intensity').oninput=e=>{intensity=+e.target.value;el('intensityOut').textContent=intensity+'%';renderClock=RADAR_MS};
el('wind').oninput=e=>{wind=+e.target.value;el('windOut').textContent=compass(wind)+' · '+wind+'°';el('windSpeedMap').textContent=windSpeed()+' kt';renderClock=RADAR_MS};
el('stormType').onchange=()=>seed();
el('windToggle').onclick=()=>{windMap=!windMap;el('windToggle').textContent=windMap?'🌬️ Afficher : VENTS':'🌩️ Afficher : RADAR';el('windToggle').classList.toggle('active',windMap);renderClock=RADAR_MS};
el('toggle').onclick=()=>{paused=!paused;el('toggle').textContent=paused?'▶ Reprendre':'❚❚ Pause';renderClock=RADAR_MS};
el('reset').onclick=()=>{seed();simTime=0};
el('add').onclick=()=>{const type=el('stormType').value,s=makeStorm(storms.length,type);s.x=(Math.random()-.5)*1.65;s.y=(Math.random()-.5)*1.65;storms.push(s);renderClock=RADAR_MS};
const palette=[[-5,[7,15,20]],[5,[11,47,58]],[15,[22,126,139]],[20,[40,190,177]],[25,[67,198,79]],[30,[139,216,48]],[35,[221,226,43]],[40,[255,211,39]],[45,[255,151,35]],[50,[239,65,43]],[55,[196,35,70]],[60,[158,35,139]],[65,[112,72,190]],[70,[226,226,236]],[75,[255,255,255]]];
const lut=new Uint8Array(86*3);for(let v=-5;v<=80;v++){let c=palette.at(-1)[1];if(v<=-5)c=palette[0][1];else for(let n=1;n<palette.length;n++){const a=palette[n-1],b=palette[n];if(v<=b[0]){const q=(v-a[0])/(b[0]-a[0]);c=[a[1][0]+(b[1][0]-a[1][0])*q,a[1][1]+(b[1][1]-a[1][1])*q,a[1][2]+(b[1][2]-a[1][2])*q];break}}lut[(v+5)*3]=c[0];lut[(v+5)*3+1]=c[1];lut[(v+5)*3+2]=c[2]}
function dbzColor(v){v=Math.max(-5,Math.min(80,Math.round(v)));const k=(v+5)*3;return[lut[k],lut[k+1],lut[k+2]]}
function gauss(x,y,sx,sy){return Math.exp(-((x*x)/(sx*sx)+(y*y)/(sy*sy))*2)}
function stormReflectivity(px,py,s){
 const dx=px-s.x,dy=py-s.y,c=Math.cos(s.tilt),q=Math.sin(s.tilt),x=dx*c+dy*q,y=-dx*q+dy*c;let d=-9,type=s.type,rx=s.r*(1+.04*Math.sin(s.age*.3+s.seed));
 if(type==='single'){
  const core=gauss(x,y,rx*.72,rx*.62);d=-8+core*(48+intensity*.25);d-=gauss(x+rx*.15,y-rx*.08,rx*.24,rx*.18)*12;
 }else if(type==='multicell'){
  d=-9+gauss(x,y,rx*2.0,rx*.72)*(24+intensity*.2);
  for(let k=0;k<4;k++){const u=(k-1.5)*rx*.72,cx=u+Math.sin(s.phase+k)*rx*.12,cy=Math.cos(k*2.1+s.phase)*rx*.16;d+=gauss(x-cx,y-cy,rx*.42,rx*.38)*(25+intensity*.12)}
 }else if(type==='line'){
  const L=rx*5.2,W=rx*.24;d=-8+Math.exp(-Math.pow(x/L,4)-Math.pow(y/W,2))*(35+intensity*.22);
  for(let k=-4;k<=4;k++)d+=gauss(x-k*rx*.62,y,rx*.20,rx*.20)*14;
 }else if(type==='bow'){
  const L=rx*4.7,W=rx*.28,bend=Math.pow(Math.abs(x)/(L+.001),2)*rx*.7,yy=y-Math.sign(x)*bend;d=-9+Math.exp(-Math.pow(x/L,4)-Math.pow(yy/W,2))*(40+intensity*.25);d+=gauss(x+rx*.5,y,rx*.75,rx*.16)*20;d-=gauss(x-rx*.3,y,rx*.5,rx*.18)*12;
 }else if(type==='derecho'){
  const L=rx*6.0,W=rx*.34,bend=Math.sin(x/(L+.001)*Math.PI)*rx*.25,yy=y-bend;d=-8+Math.exp(-Math.pow(x/L,6)-Math.pow(yy/W,2))*(43+intensity*.3);d+=gauss(x+rx*.8,y,rx*1.5,rx*.20)*18;
 }else{
  const core=gauss(x,y,rx*.72,rx*.62);d=-8+core*(42+intensity*.28);
  const a=s.rot*.8+s.phase*.12,ox=Math.cos(a)*rx*.42,oy=Math.sin(a)*rx*.42;d+=gauss(x-ox,y-oy,rx*.28,rx*.2)*18;
  const rearX=-rx*.42,rearY=rx*.08;d+=gauss(x-rearX,y-rearY,rx*.34,rx*.52)*13;
  const pa=s.rot+.65,cp=Math.cos(pa),sp=Math.sin(pa),tx=x*cp+y*sp,ty=-x*sp+y*cp;
  d+=gauss(tx-rx*.78,ty+rx*.18,rx*.38,rx*.17)*26;
  d-=gauss(tx-rx*.28,ty+rx*.12,rx*.13,rx*.09)*24;
  if(s.tornado)d-=gauss(x-rx*.35,y+rx*.1,rx*.035,rx*.028)*28;
 }
 const range=Math.hypot(px,py);return d-Math.max(0,range-.55)*7-range*range*.55+hash(Math.floor((px+1)*40),Math.floor((py+1)*40),s.seed)*1.8;
}
function renderReflectivity(){const image=rctx.createImageData(GRID,GRID),data=image.data,scale=2.35/GRID;for(let j=0;j<GRID;j++)for(let i=0;i<GRID;i++){const px=(i+.5-GRID/2)*scale,py=(j+.5-GRID/2)*scale;let v=-9;for(const s of storms)v=Math.max(v,stormReflectivity(px,py,s));const c=dbzColor(v),k=(j*GRID+i)*4;data[k]=c[0];data[k+1]=c[1];data[k+2]=c[2];data[k+3]=255}rctx.putImageData(image,0,0)}
const windPalette=[[0,0,0],[20,45,180],[40,105,40],[85,190,70],[255,235,35],[255,145,20],[220,35,30],[120,35,155],[245,80,170],[255,255,255]];
function windColor(value){const v=Math.max(0,Math.min(160,value)),p=v/160*(windPalette.length-1),i=Math.min(windPalette.length-2,Math.floor(p)),q=p-i,a=windPalette[i],b=windPalette[i+1];return[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q,a[2]+(b[2]-a[2])*q]}
function renderWind(){const image=wctx.createImageData(GRID,GRID),data=image.data,scale=2/GRID,base=flowAngle(),bx=Math.cos(base),by=Math.sin(base);for(let j=0;j<GRID;j++)for(let i=0;i<GRID;i++){const x=(i+.5-GRID/2)*scale,y=(j+.5-GRID/2)*scale;let u=bx*windSpeed(),v=by*windSpeed();for(const s of storms){const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy)+.001,rad=windInfluenceRadius(s.type);if(d<rad){const inf=Math.exp(-(d*d)/(rad*rad*.30)),tx=-dy/d,ty=dx/d;let rot=.12,conv=.08,out=0;if(s.type==='supercell'){rot=.72;conv=.35}if(s.type==='multicell'){rot=.24;conv=.18}if(s.type==='single'){rot=.08;conv=.10}if(s.type==='line'){rot=.05;conv=.08;out=.55}if(s.type==='bow'){rot=.06;conv=.06;out=.9}if(s.type==='derecho'){rot=.03;conv=.04;out=1.25}u+=tx*rot*inf*windSpeed()+(-dx/d)*conv*inf*windSpeed()+bx*out*inf*windSpeed();v+=ty*rot*inf*windSpeed()+(-dy/d)*conv*inf*windSpeed()+by*out*inf*windSpeed();if(s.tornado&&d<.06){const z=(1-d/.06)*windSpeed()*1.25;u+=tx*z;v+=ty*z}}}const val=Math.min(160,Math.hypot(u,v)),col=windColor(val),k=(j*GRID+i)*4;data[k]=col[0];data[k+1]=col[1];data[k+2]=col[2];data[k+3]=255}wctx.putImageData(image,0,0)}
function windVector(x,y){const base=flowAngle();let vx=Math.cos(base),vy=Math.sin(base);for(const s of storms){const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy)+.001,rad=windInfluenceRadius(s.type);if(d<rad){const inf=(rad-d)/rad,tx=-dy/d,ty=dx/d;let rot=s.type==='supercell'?.8:s.type==='multicell'?.25:s.type==='single'?.08:s.type==='line'?.04:s.type==='bow'?.05:.025;vx+=tx*inf*rot*(s.rot<0?-1:1)-dx/d*inf*.12;vy+=ty*inf*rot*(s.rot<0?-1:1)-dy/d*inf*.12}}const m=Math.hypot(vx,vy)||1;return[vx/m,vy/m]}
function drawWindVectors(R){ctx.save();ctx.strokeStyle='rgba(245,252,255,.78)';ctx.lineWidth=1;const sp=Math.max(38,R*.15),ext=R*.98,len=13+wind*.045;for(let y=-ext;y<=ext;y+=sp)for(let x=-ext;x<=ext;x+=sp){const p=windVector(x/R*1.18,y/R*1.18),dx=p[0]*len,dy=p[1]*len;ctx.beginPath();ctx.moveTo(x-dx*.5,y-dy*.5);ctx.lineTo(x+dx*.5,y+dy*.5);ctx.stroke();const ax=x+dx*.5,ay=y+dy*.5;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-dx*.25-dy*.18,ay-dy*.25+dx*.18);ctx.moveTo(ax,ay);ctx.lineTo(ax-dx*.25+dy*.18,ay-dy*.25-dx*.18);ctx.stroke()}ctx.restore()}
function drawLegend(x,y){const labels=windMap?[20,40,60,80,100,120,140]:[10,20,30,40,50,60,70];ctx.font='9px ui-monospace,monospace';ctx.fillStyle='#9ebdc4';ctx.fillText(windMap?'VENT kt':'RÉFLECTIVITÉ dBZ',x,y-6);const bw=Math.min(30,(Math.min(canvas.clientWidth,canvas.clientHeight)*.72)/labels.length);labels.forEach((v,i)=>{const c=windMap?windColor(v):dbzColor(v);ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;ctx.fillRect(x+i*bw,y,bw,8);ctx.fillStyle='#789ba4';ctx.fillText(v,x+i*bw-2,y+19)})}
function drawRadar(){const w=canvas.clientWidth,h=canvas.clientHeight,cx=w/2,cy=h/2,R=Math.min(w,h)*.46;ctx.clearRect(0,0,w,h);ctx.fillStyle='#040b10';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(cx,cy);ctx.imageSmoothingEnabled=true;if(windMap){ctx.drawImage(windRaster,-R,-R,R*2,R*2);drawWindVectors(R)}else ctx.drawImage(raster,-R,-R,R*2,R*2);for(let r=.2;r<=1;r+=.2){ctx.beginPath();ctx.arc(0,0,R*r,0,TAU);ctx.strokeStyle=r===1?'rgba(83,147,158,.65)':'rgba(55,105,115,.38)';ctx.lineWidth=r===1?1.4:1;ctx.stroke()}for(let a=0;a<TAU;a+=Math.PI/12){ctx.beginPath();ctx.moveTo(-R*Math.cos(a),-R*Math.sin(a));ctx.lineTo(R*Math.cos(a),R*Math.sin(a));ctx.strokeStyle='rgba(49,91,100,.28)';ctx.stroke()}const sweep=(simTime*.00055*speed+flowAngle())%TAU;ctx.save();ctx.globalCompositeOperation='screen';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,sweep-.018,sweep+.018);ctx.closePath();ctx.fillStyle='rgba(120,225,255,.12)';ctx.fill();ctx.restore();ctx.beginPath();ctx.arc(0,0,3,0,TAU);ctx.fillStyle='#d9faff';ctx.fill();ctx.restore();ctx.fillStyle='#8db3bd';ctx.font='10px ui-monospace,monospace';ctx.fillText('N',cx-4,cy-R-10);ctx.fillText('S',cx-4,cy+R+18);ctx.fillText('O',cx-R-18,cy+3);ctx.fillText('E',cx+R+8,cy+3);drawLegend(cx-R,cy+R+30)}
function updateStorms(dt){const f=dt*.00005*speed,a=flowAngle(),dx=Math.cos(a)*f,dy=Math.sin(a)*f;for(const s of storms){s.x+=dx;s.y+=dy;s.age+=dt*.001*speed;s.phase+=dt*.00045*speed;s.rot+=Math.sin(s.age*.08+s.seed)*dt*.000015*speed;if(s.type==='supercell')s.tilt=flowAngle()+Math.sin(s.age*.05+s.seed)*.12;if(s.type!=='supercell')s.tilt=flowAngle();if(s.x>1.7)s.x=-1.7;if(s.x<-1.7)s.x=1.7;if(s.y>1.7)s.y=-1.7;if(s.y<-1.7)s.y=1.7}}
function tick(now){const dt=Math.min(100,now-last||16);last=now;if(!paused){simTime+=dt*speed;updateStorms(dt)}renderClock+=dt;if(renderClock>=RADAR_MS||paused){if(windMap)renderWind();else renderReflectivity();renderClock=0}el('windSpeedMap').textContent=windSpeed()+' kt';el('clock').textContent=new Date(0,0,0,12,0,Math.floor(simTime/1000)%60).toTimeString().slice(0,8);el('stormCount').textContent=storms.length;el('cellCount').textContent=storms.reduce((n,s)=>n+(s.cells||1),0);el('maxIntensity').textContent=Math.round(35+intensity*.48)+' dBZ';drawRadar();requestAnimationFrame(tick)}
requestAnimationFrame(tick);