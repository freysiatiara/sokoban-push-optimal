f=require('fs');
({MAKEFUN_INPUT_DIR:I='/input',MAKEFUN_OUTPUT_DIR:O='/output'}=process.env);D='udlr';t=0;mn=1e9;s=[];h=[];
F=(A,x,B,S,P2,m)=>{S[x]=t;x<mn&&(mn=x);for(let c=4;c--;){y=x+(m?-o[c]:o[c]);if(A[y]!='#'&&S[y]!=t&&(m?A[y-o[c]]!='#':!B?.includes(y))){if(P2)P2[y]=P2[x]+D[c];F(A,y,B,S,P2,m)}}};
for(k=6;--k;){T=f.readFileSync(I+'/i00'+k+'/level.txt')+'';w=T.search('\n');W=w+1;o=[-W,W,-1,1];g=[];b=[];for(x=0;x<T.length;x++)c=T[x],c>'%'&&c<'/'&&g.push(x),'$*'.includes(c)&&b.push(x),'@+'.includes(c)&&(p=x);Y=p-p%W;A=[...T].fill('#',Y,Y+w);a='';
for(B0 of b){t++;F(A,B0,null,s,0,0);z=x=>s[x]==t;B=b.filter(z);R=g.filter(z);X=b.filter(x=>!z(x));L=[];t++;for(x of R)F(T,x,null,L,0,1);Q=[[B,p,'']];H={};
for(e=0;Q[e]&&e<9e5;e++){[B,pp,mm]=Q[e];if(B==''+R){a+=mm;p=pp;b=X.concat(R);break}h[pp]='';mn=1e9;t++;F(T,pp,CB=B.concat(X),s,h,0);if(H[V=mn+':'+B])continue;H[V]=1;for(q of B)for(c=4;c--;){y=q+o[c];if(s[q-o[c]]!=t||T[y]=='#'||CB.includes(y)||!L[y])continue;N=[...B];N[B.indexOf(q)]=y;N.sort((x,y)=>x-y);Q.push([N,q,mm+h[q-o[c]]+D[c]])}}}
f.mkdirSync(q=O+'/i00'+k);f.writeFileSync(q+'/solution.txt',a)}
