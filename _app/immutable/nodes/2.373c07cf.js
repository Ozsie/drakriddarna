import{s as He,n as ae,o as qe,b as zt,f as qt,r as Vt,i as N}from"../chunks/scheduler.ba2ce6c0.js";import{S as Ve,i as Xe,g,h as m,j as L,f as p,k as P,a as re,y as Xt,r as bt,s as T,u as yt,c as C,z as H,x as c,v as Dt,A as I,d as Tt,t as Ct,w as Ot}from"../chunks/index.8040907f.js";var U=(e=>(e.Red="#CD5C5C",e.Blue="#1E90FF",e.Green="#90EE90",e.Yellow="#FCFF4F",e))(U||{}),K=(e=>(e.ORCH="Orch",e.TROLL="Troll",e.GREEN_DARK_LORD="Green Dark Lord",e.BLUE_DARK_LORD="Blue Dark Lord",e.RED_DARK_LORD="Red Dark Lord",e.YELLOW_DARK_LORD="Yellow Dark Lord",e))(K||{}),Y=(e=>(e.APPRENTICE="Apprentice",e.KNIGHT="Knight",e.HERO="Hero",e.LORD="Lord",e.MASTER="Master",e))(Y||{}),le=(e=>(e[e.KILL_ALL=0]="KILL_ALL",e[e.KILL_ONE=1]="KILL_ONE",e[e.REACH_CELL=2]="REACH_CELL",e))(le||{}),Pt=(e=>(e.EQUIPMENT="Equipment",e.MAGIC_ITEM="Magic Item",e.DOOR="Door",e.NOTE="Note",e))(Pt||{}),S=(e=>(e.LEFT="Left",e.RIGHT="Right",e.UP="Up",e.DOWN="Down",e))(S||{});const Zt="0",jt="#",Jt=" ",Qt=(e,t,n,o)=>({type:e,name:t,position:{x:n,y:o},found:!1}),Oe=(e,t,n)=>({side:e,x:t,y:n,locked:!1,trapped:!1,open:!1}),Re=(e,t,n,o)=>{const s=Object.values(U).indexOf(t),r=Object.keys(U)[s];let l=Y.LORD,f=2,h=2,v=4,E=4,R=4;switch(e){case K.ORCH:{l=Y.APPRENTICE,h=0,v=2,E=2,R=1;break}case K.TROLL:{l=Y.KNIGHT,h=1,v=3,E=3,R=2;break}}return e===K.YELLOW_DARK_LORD&&(f=3),{type:e,level:l,colour:t,actions:f,defense:h,health:v,maxHealth:E,experience:R,name:e+" ("+r+")",movement:3,position:{x:n,y:o}}},$t={name:"Second cave",beaten:!1,winConditions:[{type:le.REACH_CELL,targetCell:{x:0,y:0},fulfilled:!1}],startingPositions:[{x:0,y:2},{x:0,y:3},{x:0,y:4},{x:1,y:3}],discoveredRooms:["A"],layout:{grid:["AAA","A A","AAA","AAA","AAA"],doors:[],monsters:[],secrets:[]}},_t={name:"Troll cave",beaten:!1,winConditions:[{type:le.KILL_ALL,fulfilled:!1}],nextDungeon:$t,startingPositions:[{x:0,y:7},{x:0,y:8},{x:0,y:9},{x:1,y:8}],discoveredRooms:["A"],layout:{grid:["     CCCC","     CCCC","     CCCC","      E  ","      E  ","      E  ","      BB ","AAA   BB ","AAADDDBB ","AAA   BB "],doors:[Oe(S.RIGHT,2,8),Oe(S.RIGHT,5,8),Oe(S.UP,6,6),Oe(S.UP,6,3)],monsters:[Re(K.ORCH,U.Green,5,8),Re(K.ORCH,U.Yellow,7,9),Re(K.ORCH,U.Red,6,4),Re(K.ORCH,U.Red,8,2),Re(K.TROLL,U.Green,5,0)],secrets:[Qt(Pt.NOTE,"Welcome to Drakriddarna",1,8)]}},Ht=e=>{e.actionLog.push("Game saved."),localStorage.setItem("state",JSON.stringify(e))},en=()=>{const e=localStorage.getItem("state");if(e){const t=JSON.parse(e);return t.currentActor=t.heroes.find(n=>{var o;return n.name===((o=t.currentActor)==null?void 0:o.name)}),t.actionLog.push("Game loaded."),t}},tn=()=>{const e=Ut;return Mt(e,_t),{heroes:e,dungeon:_t,currentActor:e[0],actionLog:["Game Initialised","Each character has 2 actions. Move, Attack, Search or Pick Lock.","Each character can move 3 steps per action.","If another action is performed before moving 3 steps, the move is finished and both actions are consumed.","The rules of this game are harsh and unfair."]}},_e=(e,t)=>({name:e,actions:2,movement:3,defense:0,level:Y.APPRENTICE,health:7,maxHealth:7,colour:t,experience:0}),Ut=[_e("Fearik",U.Yellow),_e("Helbran",U.Red),_e("Siedel",U.Green),_e("Wulf",U.Blue)],Mt=(e,t)=>{e.forEach((n,o)=>n.position=t.startingPositions[o])},be=e=>{let t=[];for(let n=0;n<e.length;n++)t.push(e[n]);return t},nn=(e,t,n)=>e.dungeon.layout.monsters.some(o=>{var s;return o.position.x===t&&((s=o.position)==null?void 0:s.y)===n&&o.health>0}),O=(e,t)=>{const n=t.currentActor;if(n.actions===0)return;let o=n.position.x,s=n.position.y;switch(e){case"UL":o=n.position.x-1,s=n.position.y-1;break;case"U":s=n.position.y-1;break;case"UR":o=n.position.x+1,s=n.position.y-1;break;case"L":o=n.position.x-1;break;case"R":o=n.position.x+1;break;case"DL":o=n.position.x-1,s=n.position.y+1;break;case"D":s=n.position.y+1;break;case"DR":o=n.position.x+1,s=n.position.y+1;break}const r=t.heroes.some(h=>h.position.x===o&&h.position.y===s),l=!Kt(t.dungeon.layout,o,s),f=nn(t,o,s);if(!r&&!l){const h=Yt(t.dungeon,o,s);h?h&&(f?sn(n,t,o,s):xt(n,o,s,1)):rn(t,n,o,s)&&on(n,t,o,s)}else t.actionLog.push(n.name+" could not make that move");n.movement===0&&(n.actions--,n.movement=3)},xt=(e,t,n,o)=>{e.position.x=t,e.position.y=n,e.movement-=o},on=(e,t,n,o)=>{const s=Be(t.dungeon.layout.grid,n,o);s&&t.dungeon.discoveredRooms.push(s),xt(e,e.position.x,e.position.y,1),t.actionLog.push(e.name+" opened a door")},sn=(e,t,n,o)=>{if(e.actions===1&&e.movement!==3){t.actionLog.push(e.name+" has no actions left to attack");return}const s=t.dungeon.layout.monsters.find(r=>{var l;return r.position.x===n&&((l=r.position)==null?void 0:l.y)===o});if(s){const r=we(e.level,3),l=Math.max(r-s.defense,0);t.actionLog.push(e.name+" attacked "+s.name+" for "+l+" damage ("+r+"-"+s.defense+"="+l+")"),s.health-=l,s.health<=0&&(t.dungeon.layout.monsters=t.dungeon.layout.monsters.filter(f=>f!=s),t.actionLog.push(e.name+" killed "+s.name),e.experience+=s.experience),(e==null?void 0:e.actions)>1&&(e==null?void 0:e.movement)<3?e.actions-=2:e.actions--}},we=(e,t)=>{let n=[];for(let o=0;o<t;o++)n.push(Math.floor(Math.random()*6)+1);switch(e){case Y.APPRENTICE:n=n.filter(o=>o===6);break;case Y.KNIGHT:case Y.HERO:n=n.filter(o=>o>=5);break;case Y.LORD:case Y.MASTER:n=n.filter(o=>o>=4);break}return n.length},wt=e=>{const t=e.currentActor;if(!Gt(t)){e.actionLog.push(t.name+" has no actions left to pick lock");return}const n=e.dungeon.layout.doors.find(o=>o.x===t.position.x&&o.y===t.position.y);n&&n.locked&&(we(t.level,1)>=1?(n.locked=!1,e.actionLog.push(t.name+" managed to pick the lock")):e.actionLog.push(t.name+" failed to pick the lock"),(t==null?void 0:t.actions)>1&&(t==null?void 0:t.movement)<3?t.actions-=2:t.actions--,t.movement=3)},Bt=e=>{const t=e.currentActor;if(!Gt(t)){e.actionLog.push(t.name+" has no actions left to search");return}const n=we(t.level,1);if(n>=1){const o=e.dungeon.layout.secrets.find(s=>Ft(s.position,t.position.x,t.position.y));o?e.actionLog.push(t.name+" searched ("+n+") and found "+o.name):(e.actionLog.push(t.name+" searched ("+n+") but found nothing"),console.log("found no secret"))}else e.actionLog.push(t.name+" searched ("+n+") but found nothing");(t==null?void 0:t.actions)>1&&(t==null?void 0:t.movement)<3?t.actions-=2:t.actions--,t.movement=3},It=e=>{if(an(e),e.currentActor!==void 0){e.actionLog.push(e.currentActor.name+" ended their turn");let n=e.heroes.indexOf(e.currentActor)+1;n===e.heroes.length&&(cn(e),n=0),e.currentActor.actions=2,e.currentActor.movement=3,e.currentActor=e.heroes[n],e.actionLog.push(e.currentActor.name+" started their turn")}},an=e=>{e.dungeon.winConditions.forEach(t=>{switch(t.type){case le.KILL_ALL:const n=e.dungeon.layout.monsters.map(s=>s.health).reduce((s,r)=>s+r,0);t.fulfilled=n<=0;break;case le.REACH_CELL:t.fulfilled=e.heroes.some(s=>{var r;s.position.x===((r=t.targetCell)==null?void 0:r.x)&&(s.position.y,t.targetCell.y)});break;case le.KILL_ONE:const o=e.dungeon.layout.monsters.find(s=>s.name===t.targetMonster);t.fulfilled=o.health===0;break}}),e.dungeon.beaten=e.dungeon.winConditions.map(t=>t.fulfilled).reduce((t,n)=>t&&n,!0),e.dungeon.beaten&&(e.actionLog.push("All win conditions have been fulfilled"),e.actionLog.push("You have cleared "+e.dungeon.name))},rn=(e,t,n,o)=>{var r;const s=e.dungeon.layout.doors.find(l=>{var f;return l.x===((f=t.position)==null?void 0:f.x)&&l.y===t.position.y});if(s&&!s.locked){const l=ln(t.position.x,(r=t.position)==null?void 0:r.y,n,o);if(s.side===l)return s.open=!0,!0}return s.locked&&e.actionLog.push("Door is locked"),!1},ln=(e,t,n,o)=>{if(e===n){if(t>o)return S.UP;if(t<o)return S.DOWN}if(t===o){if(e>n)return S.LEFT;if(e<n)return S.RIGHT}},Kt=(e,t,n)=>{let o=!0;if(t<0||t>=e.grid[0].length||n<0||n>=e.grid.length)o=!1;else{const s=Be(e.grid,t,n);(s===Zt||s===jt||s===Jt)&&(o=!1)}return o},Yt=(e,t,n)=>{const o=Be(e.layout.grid,t,n);return o?e.discoveredRooms.includes(o):!1},Be=(e,t,n)=>{let o;return e.forEach((s,r)=>{be(s).forEach((l,f)=>{r===n&&f===t&&(o=l)})}),o},Ft=(e,t,n)=>e.x===t&&e.y===n||e.x===t-1&&e.y===n||e.x===t-1&&e.y===n-1||e.x===t&&e.y===n-1||e.x===t+1&&e.y===n-1||e.x===t+1&&e.y===n||e.x===t+1&&e.y===n+1||e.x===t&&e.y===n+1||e.x===t-1&&e.y===n+1,cn=e=>{const t=e.dungeon.layout.monsters.filter(n=>{var s;const o=Be(e.dungeon.layout.grid,(s=n.position)==null?void 0:s.x,n.position.y);return e.dungeon.discoveredRooms.includes(o)&&n.health>0});t.length===0&&e.actionLog.push("No monsters can act"),t.forEach(n=>{const o=n.actions;for(;n.actions>0;){e.actionLog.push(n.name+" acted ");const s=e.heroes.filter(r=>{var l;return Ft(n.position,(l=r.position)==null?void 0:l.x,r.position.y)});if(s.length>0){const r=Math.floor(Math.random()*s.length);fn(e,n,s[r])}else dn(e,n)}n.actions=o})};function St(e,t){return Math.sqrt(Math.pow(e.x-(t==null?void 0:t.x),2)+Math.pow(e.y-(t==null?void 0:t.y),2))}const dn=(e,t)=>{const n=e.heroes.map(s=>({hero:s,dist:St(s.position,t.position)})).sort((s,r)=>s.dist-r.dist)[0],o=un(e,t.position);if(o.length>0){const s=o.map(r=>({pos:r,dist:St(r,n.hero.position)})).sort((r,l)=>r.dist-l.dist)[0].pos;t.position=s,e.actionLog.push(t.name+" moved towards "+n.hero.name+" ("+s.x+","+s.y+")")}else e.actionLog.push(t.name+" could not move");t.actions--};let un=(e,t)=>{const n=t.x,o=t.y,s=[];for(let r=n-1;r<=n+1;r++)for(let l=o-1;l<=o+1;l++)r===n&&l===o||Kt(e.dungeon.layout,r,l)&&Yt(e.dungeon,r,l)&&s.push({x:r,y:l});return s.filter(r=>!e.heroes.find(l=>l.position.x===r.x&&l.position.y===r.y)).filter(r=>!e.dungeon.layout.monsters.find(f=>f.position.x===r.x&&f.position.y===r.y))};const fn=(e,t,n)=>{if(t.actions===1&&t.movement!==3){e.actionLog.push(n.name+" has no actions left to attack");return}if(n){const o=we(t.level,3),s=Math.max(o-n.defense,0);e.actionLog.push(t.name+" attacked "+n.name+" for "+s+" damage ("+o+"-"+n.defense+"="+s+")"),n.health-=s,n.health<=0&&(e.actionLog.push(t.name+" killed "+n.name),e.heroes=e.heroes.filter(r=>r!==n)),(t==null?void 0:t.actions)>1&&(t==null?void 0:t.movement)<3?t.actions-=2:t.actions--}},Gt=e=>e.movement<3?e.actions>1:e.actions>0,hn=""+new URL("../assets/Dungeon_Tileset.b0da342a.png",import.meta.url).href,gn="data:image/png;base64,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";function mn(e){let t;return{c(){t=g("canvas"),this.h()},l(n){t=m(n,"CANVAS",{width:!0,height:!0,id:!0}),L(t).forEach(p),this.h()},h(){P(t,"width","860"),P(t,"height","750"),P(t,"id","gameBoard")},m(n,o){re(n,t,o)},p:ae,i:ae,o:ae,d(n){n&&p(t)}}}const i=48;function vn(e,t,n){let{state:o}=t;qe(()=>{const a=new Image;a.src=hn;const A=new Image;A.src=gn,s(a,A),setInterval(()=>s(a,A),10)});const s=(a,A)=>{if(!o||!document)return;const d=document.getElementById("gameBoard"),u=d.getContext("2d");u.clearRect(0,0,d.width,d.height),o.dungeon.layout.grid.forEach((k,y)=>{be(k).forEach((D,_)=>r(u,D,_,y,a))}),o.dungeon.layout.grid.forEach((k,y)=>{be(k).forEach((D,_)=>l(u,D,_,y))}),o.dungeon.layout.grid.forEach((k,y)=>{be(k).forEach((D,_)=>f(u,D,_,y))}),o.dungeon.layout.grid.forEach((k,y)=>{be(k).forEach((D,_)=>E(u,D,_,y,A))})},r=(a,A,d,u,k)=>{R(A)?(a.beginPath(),a.strokeStyle="black",a.fillStyle="black",a.fillRect(d*i,u*i,i,i),a.stroke()):a.drawImage(k,0,7*16,16,16,d*i,u*i,i,i)},l=(a,A,d,u)=>{a.beginPath(),a.strokeStyle="black",a.rect(d*i,u*i,i,i),a.font="7px Arial",a.fillText(d+","+u,d*i+3,u*i+(i-3)),a.stroke()},f=(a,A,d,u)=>{const k=w(d,u);if(k&&!k.open&&!R(A))switch(a.fillStyle="brown",k.side){case S.RIGHT:{a.fillRect(d*i+(i-2),u*i,4,i),k.locked&&(a.fillStyle="grey",a.fillRect(d*i+(i-4),u*i+(i/2-4),8,8));break}case S.LEFT:{a.fillRect(d*i-2,u*i,4,i),k.locked&&(a.fillStyle="grey",a.fillRect(d*i-4,u*i+(i/2-4),8,8));break}case S.UP:{a.fillRect(d*i,u*i-2,i,4),k.locked&&(a.fillStyle="grey",a.fillRect(d*i+(i/2-4),u*i-4,8,8));break}case S.DOWN:{a.fillRect(d*i,u*i+(i-2),i,4),k.locked&&(a.fillStyle="grey",a.fillRect(d*i+(i/2-4),u*i+(i-4),8,8));break}}},h=(a,A,d,u)=>{a.beginPath(),a.strokeStyle=A.colour,a.fillStyle=A.colour,a.fillRect(d*i+4,u*i+(i-6),i-8,4),a.stroke()},v=(a,A,d,u)=>{a.beginPath(),a.strokeStyle="black",a.fillStyle="red",a.fillRect(d*i+4,u*i,i-8,4),a.fillStyle="green",a.fillRect(d*i+4,u*i,(i-8)*(A.health/A.maxHealth),4),a.rect(d*i+4,u*i,i-8,4),a.stroke()},E=(a,A,d,u,k)=>{a.beginPath();const y=o.heroes.find(D=>D.position.x===d&&D.position.y===u);if(y)a.drawImage(k,4*16,0,16,16,d*i,u*i,i,i),h(a,y,d,u),v(a,y,d,u),a.stroke();else{const D=o.dungeon.layout.monsters.find(_=>_.position.x===d&&_.position.y===u);if(D&&D.health>0&&!R(A)){switch(D.type){case K.ORCH:a.drawImage(k,i,16,16,16,d*i,u*i,i,i);break;case K.TROLL:a.drawImage(k,i,16,16,16,d*i,u*i,i,i);break;default:a.drawImage(k,16,16,16,16,d*i,u*i,i,i);break}h(a,D,d,u),v(a,D,d,u)}}a.stroke()},R=a=>a===" "||!o.dungeon.discoveredRooms.includes(a),w=(a,A)=>o.dungeon.layout.doors.find(d=>d.x===a&&d.y===A);return e.$$set=a=>{"state"in a&&n(0,o=a.state)},[o]}class pn extends Ve{constructor(t){super(),Xe(this,t,vn,mn,He,{state:0})}}function An(e){let t;return{c(){t=g("canvas"),this.h()},l(n){t=m(n,"CANVAS",{id:!0,height:!0,width:!0}),L(t).forEach(p),this.h()},h(){P(t,"id","characterBoard"),P(t,"height","750"),P(t,"width","260")},m(n,o){re(n,t,o)},p:ae,i:ae,o:ae,d(n){n&&p(t)}}}const ie=180;function kn(e,t,n){let{state:o}=t;qe(()=>{s(),setInterval(s,100)});const s=()=>{if(!o||!document)return;const f=document.getElementById("characterBoard"),h=f.getContext("2d");h.clearRect(0,0,f.width,f.height),h.stroke(),o.heroes.forEach((v,E)=>r(h,f,v,E)),o.heroes.forEach((v,E)=>l(h,v,E))},r=(f,h,v,E)=>{f.fillStyle=v.colour,f.fillRect(12,E*ie+12,h.width,ie-12),f.stroke(),f.fillStyle="black"},l=(f,h,v)=>{const R=(h===o.currentActor?"> "+h.name:h.name)+" - "+h.level+" ("+h.experience+")";f.strokeStyle="black",f.font="18px Arial",f.fillText(R,16,v*ie+30),f.fillText("HP: "+h.health,16,v*ie+50),f.fillText("Actions: "+h.actions,16,v*ie+70),f.fillText("Moves: "+h.movement,16,v*ie+90),f.stroke()};return e.$$set=f=>{"state"in f&&n(0,o=f.state)},[o]}class Ln extends Ve{constructor(t){super(),Xe(this,t,kn,An,He,{state:0})}}function Nt(e){let t,n='<canvas width="860" height="100" id="logs"></canvas>';return{c(){t=g("div"),t.innerHTML=n,this.h()},l(o){t=m(o,"DIV",{class:!0,"data-svelte-h":!0}),H(t)!=="svelte-xcon9n"&&(t.innerHTML=n),this.h()},h(){P(t,"class","log svelte-60nygp")},m(o,s){re(o,t,s)},p:ae,d(o){o&&p(t)}}}function En(e){let t,n,o,s,r,l,f,h,v,E,R,w,a,A,d="UL",u,k,y,D="U",_,ce,V,Ze="UR",Ie,de,X,je="Next",Se,M,ue,Z,Je="L",Ne,ye,Pe,fe,j,Qe="R",Ue,he,J,$e="Search",Me,x,ge,Q,et="DL",xe,me,$,tt="D",Ke,ve,ee,nt="DR",Ye,pe,te,ot="Pick lock",Fe,ne,Ae,oe,st="Save",Ge,ke,se,at="Load",We,it=e[0].actionLog,De,ze,rt;o=new Ln({props:{state:e[0]}});function Wt(b){e[1](b)}let lt={};e[0]!==void 0&&(lt.state=e[0]),l=new pn({props:lt}),zt.push(()=>Xt(l,"state",Wt));let F=Nt();return{c(){t=g("div"),n=g("div"),bt(o.$$.fragment),s=T(),r=g("div"),bt(l.$$.fragment),h=T(),v=g("div"),E=g("div"),R=g("table"),w=g("tr"),a=g("td"),A=g("button"),A.textContent=d,u=T(),k=g("td"),y=g("button"),y.textContent=D,_=T(),ce=g("td"),V=g("button"),V.textContent=Ze,Ie=T(),de=g("td"),X=g("button"),X.textContent=je,Se=T(),M=g("tr"),ue=g("td"),Z=g("button"),Z.textContent=Je,Ne=T(),ye=g("td"),Pe=T(),fe=g("td"),j=g("button"),j.textContent=Qe,Ue=T(),he=g("td"),J=g("button"),J.textContent=$e,Me=T(),x=g("tr"),ge=g("td"),Q=g("button"),Q.textContent=et,xe=T(),me=g("td"),$=g("button"),$.textContent=tt,Ke=T(),ve=g("td"),ee=g("button"),ee.textContent=nt,Ye=T(),pe=g("td"),te=g("button"),te.textContent=ot,Fe=T(),ne=g("tr"),Ae=g("td"),oe=g("button"),oe.textContent=st,Ge=T(),ke=g("td"),se=g("button"),se.textContent=at,We=T(),F.c(),this.h()},l(b){t=m(b,"DIV",{class:!0});var B=L(t);n=m(B,"DIV",{class:!0});var Le=L(n);yt(o.$$.fragment,Le),Le.forEach(p),s=C(B),r=m(B,"DIV",{class:!0});var Ee=L(r);yt(l.$$.fragment,Ee),Ee.forEach(p),B.forEach(p),h=C(b),v=m(b,"DIV",{class:!0});var Te=L(v);E=m(Te,"DIV",{class:!0});var ct=L(E);R=m(ct,"TABLE",{});var G=L(R);w=m(G,"TR",{});var W=L(w);a=m(W,"TD",{});var dt=L(a);A=m(dt,"BUTTON",{"data-svelte-h":!0}),H(A)!=="svelte-fw3uxo"&&(A.textContent=d),dt.forEach(p),u=C(W),k=m(W,"TD",{});var ut=L(k);y=m(ut,"BUTTON",{"data-svelte-h":!0}),H(y)!=="svelte-1jeoia6"&&(y.textContent=D),ut.forEach(p),_=C(W),ce=m(W,"TD",{});var ft=L(ce);V=m(ft,"BUTTON",{"data-svelte-h":!0}),H(V)!=="svelte-1p8c8vc"&&(V.textContent=Ze),ft.forEach(p),Ie=C(W),de=m(W,"TD",{});var ht=L(de);X=m(ht,"BUTTON",{"data-svelte-h":!0}),H(X)!=="svelte-1rtxc14"&&(X.textContent=je),ht.forEach(p),W.forEach(p),Se=C(G),M=m(G,"TR",{});var z=L(M);ue=m(z,"TD",{});var gt=L(ue);Z=m(gt,"BUTTON",{"data-svelte-h":!0}),H(Z)!=="svelte-10dnpu6"&&(Z.textContent=Je),gt.forEach(p),Ne=C(z),ye=m(z,"TD",{}),L(ye).forEach(p),Pe=C(z),fe=m(z,"TD",{});var mt=L(fe);j=m(mt,"BUTTON",{"data-svelte-h":!0}),H(j)!=="svelte-12287ni"&&(j.textContent=Qe),mt.forEach(p),Ue=C(z),he=m(z,"TD",{});var vt=L(he);J=m(vt,"BUTTON",{"data-svelte-h":!0}),H(J)!=="svelte-cps1bu"&&(J.textContent=$e),vt.forEach(p),z.forEach(p),Me=C(G),x=m(G,"TR",{});var q=L(x);ge=m(q,"TD",{});var pt=L(ge);Q=m(pt,"BUTTON",{"data-svelte-h":!0}),H(Q)!=="svelte-1ji074i"&&(Q.textContent=et),pt.forEach(p),xe=C(q),me=m(q,"TD",{});var At=L(me);$=m(At,"BUTTON",{"data-svelte-h":!0}),H($)!=="svelte-li5tq6"&&($.textContent=tt),At.forEach(p),Ke=C(q),ve=m(q,"TD",{});var kt=L(ve);ee=m(kt,"BUTTON",{"data-svelte-h":!0}),H(ee)!=="svelte-3esmwe"&&(ee.textContent=nt),kt.forEach(p),Ye=C(q),pe=m(q,"TD",{});var Lt=L(pe);te=m(Lt,"BUTTON",{"data-svelte-h":!0}),H(te)!=="svelte-sacog4"&&(te.textContent=ot),Lt.forEach(p),q.forEach(p),Fe=C(G),ne=m(G,"TR",{});var Ce=L(ne);Ae=m(Ce,"TD",{});var Et=L(Ae);oe=m(Et,"BUTTON",{"data-svelte-h":!0}),H(oe)!=="svelte-1vr5zyk"&&(oe.textContent=st),Et.forEach(p),Ge=C(Ce),ke=m(Ce,"TD",{});var Rt=L(ke);se=m(Rt,"BUTTON",{"data-svelte-h":!0}),H(se)!=="svelte-1m2jkw7"&&(se.textContent=at),Rt.forEach(p),Ce.forEach(p),G.forEach(p),ct.forEach(p),We=C(Te),F.l(Te),Te.forEach(p),this.h()},h(){P(n,"class","characterSide svelte-60nygp"),P(r,"class","boardSide svelte-60nygp"),P(t,"class","container svelte-60nygp"),P(E,"class","commands svelte-60nygp"),P(v,"class","container svelte-60nygp")},m(b,B){re(b,t,B),c(t,n),Dt(o,n,null),c(t,s),c(t,r),Dt(l,r,null),re(b,h,B),re(b,v,B),c(v,E),c(E,R),c(R,w),c(w,a),c(a,A),c(w,u),c(w,k),c(k,y),c(w,_),c(w,ce),c(ce,V),c(w,Ie),c(w,de),c(de,X),c(R,Se),c(R,M),c(M,ue),c(ue,Z),c(M,Ne),c(M,ye),c(M,Pe),c(M,fe),c(fe,j),c(M,Ue),c(M,he),c(he,J),c(R,Me),c(R,x),c(x,ge),c(ge,Q),c(x,xe),c(x,me),c(me,$),c(x,Ke),c(x,ve),c(ve,ee),c(x,Ye),c(x,pe),c(pe,te),c(R,Fe),c(R,ne),c(ne,Ae),c(Ae,oe),c(ne,Ge),c(ne,ke),c(ke,se),c(v,We),F.m(v,null),De=!0,ze||(rt=[I(A,"click",function(){N(O("UL",e[0]))&&O("UL",e[0]).apply(this,arguments)}),I(y,"click",function(){N(O("U",e[0]))&&O("U",e[0]).apply(this,arguments)}),I(V,"click",function(){N(O("UR",e[0]))&&O("UR",e[0]).apply(this,arguments)}),I(X,"click",function(){N(It(e[0]))&&It(e[0]).apply(this,arguments)}),I(Z,"click",function(){N(O("L",e[0]))&&O("L",e[0]).apply(this,arguments)}),I(j,"click",function(){N(O("R",e[0]))&&O("R",e[0]).apply(this,arguments)}),I(J,"click",function(){N(Bt(e[0]))&&Bt(e[0]).apply(this,arguments)}),I(Q,"click",function(){N(O("DL",e[0]))&&O("DL",e[0]).apply(this,arguments)}),I($,"click",function(){N(O("D",e[0]))&&O("D",e[0]).apply(this,arguments)}),I(ee,"click",function(){N(O("DR",e[0]))&&O("DR",e[0]).apply(this,arguments)}),I(te,"click",function(){N(wt(e[0]))&&wt(e[0]).apply(this,arguments)}),I(oe,"click",function(){N(Ht(e[0]))&&Ht(e[0]).apply(this,arguments)}),I(se,"click",e[2])],ze=!0)},p(b,[B]){e=b;const Le={};B&1&&(Le.state=e[0]),o.$set(Le);const Ee={};!f&&B&1&&(f=!0,Ee.state=e[0],qt(()=>f=!1)),l.$set(Ee),B&1&&He(it,it=e[0].actionLog)?(F.d(1),F=Nt(),F.c(),F.m(v,null)):F.p(e,B)},i(b){De||(Tt(o.$$.fragment,b),Tt(l.$$.fragment,b),De=!0)},o(b){Ct(o.$$.fragment,b),Ct(l.$$.fragment,b),De=!1},d(b){b&&(p(t),p(h),p(v)),Ot(o),Ot(l),F.d(b),ze=!1,Vt(rt)}}}function Rn(e,t,n){let o=tn();qe(()=>{r(),setInterval(r,500),setInterval(s,1e3)});const s=()=>{if(o.dungeon.beaten&&o.dungeon.nextDungeon){n(0,o.dungeon=o.dungeon.nextDungeon,o);const h=Ut.filter(v=>!o.heroes.find(E=>v.name===E.name));o.heroes.push(...h),Mt(o.heroes,o.dungeon),n(0,o.actionLog=[],o),o.actionLog.push("You have reached "+o.dungeon.name)}},r=()=>{if(!o||!document)return;const h=document.getElementById("logs"),v=h.getContext("2d");v.clearRect(0,0,h.width,h.height),o.actionLog.slice(-10).reverse().forEach((E,R)=>{v.font="12px Arial",v.fillStyle="black",v.fillText("> "+E,2,(R+1)*12+2),v.stroke()})};function l(h){o=h,n(0,o)}return[o,l,()=>n(0,o=en())]}class Dn extends Ve{constructor(t){super(),Xe(this,t,Rn,En,He,{})}}export{Dn as component};
