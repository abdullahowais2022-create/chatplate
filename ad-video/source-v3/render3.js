const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{const [w,h,out,fps='60',dur='54']=process.argv.slice(2);
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:+w,height:+h}});
pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('file://'+__dirname+`/ad2.html?w=${w}&h=${h}`);await pg.waitForFunction('window.READY');
const F=Math.round(+dur*+fps);
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
for(let f=0;f<F;f++){await pg.evaluate(t=>render(t),f/+fps);const buf=await pg.screenshot({type:'jpeg',quality:95});
  if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(f%600===0)console.log(w,f,'/',F);}
ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',out)})();
