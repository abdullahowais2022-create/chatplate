// Edit decision list: video time V -> scene time (orig), and which scenes may show.
module.exports=[
 {v0:0,    v1:8.2,  only:['s1','s3'], pts:[[0,0],[3,4.18],[4,5.62],[5,6.5],[5.45,7.55],[6,8.2]]},
 {v0:8.2,  v1:10.3, only:['s3','s4'], pts:[[6,8.2],[7.1,8.95],[8.55,10.0],[9.0,10.3]]},
 {v0:10.3, v1:16.4, only:['s4'],      pts:[[9.0,10.3],[9.35,10.5],[10.65,12.3],[12.15,14.45],[13.55,15.85],[14.0,16.4]]},
 {v0:16.4, v1:19.25,only:['s6'],      pts:[[17.9,16.4],[18.7,17.0],[21.0,18.4],[22.4,19.0],[23.0,19.25]]},
 {v0:19.25,v1:20.3, only:['s5'],      pts:[[13.97,19.25],[15.95,20.3]]},
 {v0:20.3, v1:21.9, only:['s5b'],     pts:[[15.95,20.3],[16.6,20.75],[17.7,21.55],[18.15,21.9]]},
 {v0:21.9, v1:26.0, only:['s9'],      pts:[[40.0,21.9],[44.1,26.0]]},
 {v0:26.0, v1:31.25,only:['s8'],      pts:[[26.3,26.0],[31.55,31.25]]},
];
module.exports.map=function(V){const S=module.exports;let s=S.find(x=>V>=x.v0&&V<x.v1)||S[S.length-1];
 const P=s.pts;for(let i=0;i<P.length-1;i++){const [o0,a]=P[i],[o1,b]=P[i+1];if(V<=b||i===P.length-2){const k=(V-a)/(b-a);return {o:o0+(o1-o0)*k,only:s.only}}}};
module.exports.DUR=31.2;
