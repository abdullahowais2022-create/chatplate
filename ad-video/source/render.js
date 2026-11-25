const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const [w,h,out,fps='60',dur='30.5',from='0',to]=process.argv.slice(2);
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:+w,height:+h}});
pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('file://'+__dirname+`/index.html?w=${w}&h=${h}`);await pg.waitForFunction('window.READY');
const F=Math.round(+dur*+fps), f0=+from, f1=to?+to:F;
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
const t0=Date.now();
for(let f=f0;f<f1;f++){await pg.evaluate(t=>render(t),f/+fps);
  const buf=await pg.screenshot({type:'jpeg',quality:95});
  if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
  if(f%300===0)console.log(w+'x'+h,f,'/',f1,((Date.now()-t0)/1000).toFixed(0)+'s');}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',out)})();
