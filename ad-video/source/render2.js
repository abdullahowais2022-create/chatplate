const {chromium}=require('playwright');const {spawn}=require('child_process');const edl=require('./edl.js');
(async()=>{const [w,h,out,fps='60',mode='video',...times]=process.argv.slice(2);
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:+w,height:+h}});
pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('file://'+__dirname+`/index.html?w=${w}&h=${h}`);await pg.waitForFunction('window.READY');
const frame=async V=>{const m=edl.map(V);await pg.evaluate(([o,only])=>{window.ONLY=only;render(o)},[m.o,m.only]);};
if(mode==='shots'){for(const V of times){await frame(+V);await pg.screenshot({path:`${__dirname}/v_${w}_${V}.png`});}await b.close();return;}
const F=Math.round(edl.DUR*+fps);
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
for(let f=0;f<F;f++){await frame(f/+fps);const buf=await pg.screenshot({type:'jpeg',quality:95});
  if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(f%300===0)console.log(w,f,'/',F);}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',out)})();
