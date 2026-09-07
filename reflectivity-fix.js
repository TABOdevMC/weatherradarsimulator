// Refined reflectivity renderer: compact, storm-shaped echoes instead of screen-filling bands.
function reflNoise(x,y,s){
  const a=Math.sin((x+s.seed)*17.13+(y-s.seed)*11.71)*43758.5453;
  return a-Math.floor(a);
}
function reflGauss(x,y,sx,sy){
  return Math.exp(-0.5*((x*x)/(sx*sx)+(y*y)/(sy*sy)));
}
function renderReflectivity(){
  const image=rctx.createImageData(GRID,GRID),data=image.data,scale=2.18/GRID;
  for(let j=0;j<GRID;j++) for(let i=0;i<GRID;i++){
    const px=(i+.5-GRID/2)*scale,py=(j+.5-GRID/2)*scale;
    let v=-9;
    for(const s of storms){
      const dx=px-s.x,dy=py-s.y,c=Math.cos(s.tilt),q=Math.sin(s.tilt);
      const x=dx*c+dy*q,y=-dx*q+dy*c,rx=s.r;
      let echo=-20;
      if(s.type==='single'){
        echo=52*reflGauss(x,y,rx*.62,rx*.52);
        echo+=8*reflGauss(x+rx*.22,y-rx*.12,rx*.24,rx*.20);
      }else if(s.type==='multicell'){
        echo=12*reflGauss(x,y,rx*2.1,rx*.55);
        for(let k=0;k<4;k++){
          const cx=(k-1.5)*rx*.70,cy=Math.sin(k*1.7+s.phase)*rx*.16;
          echo=Math.max(echo,48*reflGauss(x-cx,y-cy,rx*.34,rx*.34));
        }
      }else if(s.type==='line'){
        const L=rx*4.5,W=rx*.25;
        echo=38*Math.exp(-Math.pow(x/L,6)-Math.pow(y/W,2));
        for(let k=-3;k<=3;k++) echo=Math.max(echo,48*reflGauss(x-k*rx*.68,y,rx*.22,rx*.20));
      }else if(s.type==='bow'){
        const L=rx*4.4,W=rx*.27,bend=Math.sign(x)*Math.pow(Math.abs(x)/(L+.001),2)*rx*.75;
        const yy=y-bend;
        echo=42*Math.exp(-Math.pow(x/L,6)-Math.pow(yy/W,2));
        echo=Math.max(echo,55*reflGauss(x+rx*.55,y,rx*.48,rx*.22));
        echo*=1-.38*reflGauss(x+rx*.75,y,rx*.42,rx*.18);
      }else if(s.type==='derecho'){
        const L=rx*5.2,W=rx*.31,bend=Math.sin(x/(L+.001)*Math.PI)*rx*.20;
        echo=45*Math.exp(-Math.pow(x/L,6)-Math.pow((y-bend)/W,2));
        echo=Math.max(echo,58*reflGauss(x+rx*.75,y,rx*.85,rx*.25));
      }else{
        // Supercell: compact rotating core + hook / appendage and inflow notch.
        const core=50*reflGauss(x,y,rx*.64,rx*.52);
        const forward=48*reflGauss(x-rx*.58,y+rx*.10,rx*.34,rx*.18);
        const rear=32*reflGauss(x+rx*.42,y-rx*.12,rx*.30,rx*.42);
        const hookCenterX=-rx*.32,hookCenterY=rx*.16;
        const hook=42*reflGauss(x-hookCenterX,y-hookCenterY,rx*.18,rx*.34);
        const notch=28*reflGauss(x+rx*.10,y+rx*.05,rx*.18,rx*.11);
        echo=Math.max(core,forward*.92,rear*.72,hook)-notch;
      }
      if(echo>0){
        const edge=Math.hypot(x/(rx*2.8),y/(rx*2.8));
        echo-=Math.max(0,edge-1)*18;
        echo+=(reflNoise(Math.floor(px*55),Math.floor(py*55),s)-.5)*2.8;
        v=Math.max(v,echo+intensity*.13-2);
      }
    }
    // Weak range falloff and fine speckle, without coherent vertical striping.
    const range=Math.hypot(px,py);
    v-=Math.max(0,range-.72)*4+range*range*.35;
    v+=reflNoise(Math.floor(px*70),Math.floor(py*70),31)*1.1-0.55;
    const c=dbzColor(v),k=(j*GRID+i)*4;
    data[k]=c[0];data[k+1]=c[1];data[k+2]=c[2];data[k+3]=255;
  }
  rctx.putImageData(image,0,0);
}
