import f from'fs';
const{MAKEFUN_INPUT_DIR:I='/input',MAKEFUN_OUTPUT_DIR:O='/output'}=process.env,
F=(A,O,f,t,u,h,B,m=f)=>{u[f]=t;for(let c=4;c--;){const q=f+O[c];if(A[q]&&u[q]!=t&&!B.includes(q)){u[q]=t;if(h)h[q]=h[f]+'udlr'[c];m=Math.min(m,F(A,O,q,t,u,h,B))}}return m},
P=t=>{const w=t.search('\n'),a=[],g=[],b=[];let p=0,i=0;t=t.replace(/\n/g,'');for(const c of t){a[i]=c!='#';if(c>'%'&&c<'/')g.push(i);if(c=='$'||c=='*')b.push(i);if(c=='@'||c=='+')p=i;i++}return{w,a,g,b,o:[-w,w,-1,1],p,Y:p/w|0}},
S=l=>{const{a,g,o,b,p}=l,s=[],k=[],h=[];const B=[[b,p,'']],H={};for(let e=0;e<B.length&&e<2e5;e++){const[b,pp,mm]=B[e];h[pp]='';F(a,o,pp,++t,s,h,b);const u=t;for(const p of b){for(const c in o){const q=o[c],z=p+q;if(s[p-q]!=u||!a[z]||b.includes(z))continue;const N=[...b];N[b.indexOf(p)]=z;N.sort((a,b)=>a-b);const K2=F(a,o,p,++t,k,0,N)+':'+N;if(H[K2])continue;const W=mm+h[p-q]+'UDLR'[c];if(''+N==''+g)return[p,W];H[K2]=B.push([N,p,W]);}}}},
G=l=>{let p=l.p,m='',V2=[];const A=[...l.a];A.fill(0,l.Y*l.w,l.Y*l.w+l.w);for(const b of l.b){if(V2[b])continue;F(A,l.o,b,++t,V2,0,[]);const f=x=>V2[x]==t,B=l.b.filter(f),g=l.g.filter(f),a=[...l.a];l.b.forEach(x=>B.includes(x)||(a[x]=0));const v=S({...l,a,g,b:B,p});if(!v)return'';m+=v[1],p=v[0],l.b=l.b.filter(x=>!B.includes(x)).concat(g)}return m};
let t=0;
for(let k=6;--k;){const i='i00'+k,m=G(P(f.readFileSync(I+'/'+i+'/level.txt')+'')),d=O+'/'+i;f.mkdirSync(d);f.writeFileSync(d+'/solution.txt',m)}
