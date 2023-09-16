import{s as Le,n as ne,o as qe,b as Ft,f as qt,r as mn,i as Y}from"../chunks/scheduler.ba2ce6c0.js";import{S as We,i as xe,g as p,h,j as y,f as C,k as N,l as Wt,a as V,x as u,y as O,e as Ye,z as Bn,m as pn,n as hn,o as En,A as xt,r as at,s as w,u as lt,c as _,B as P,v as rt,C as Cn,d as At,t as ct,w as dt}from"../chunks/index.92acf144.js";function $t(e){return(e==null?void 0:e.length)!==void 0?e:Array.from(e)}var H=(e=>(e.Red="#CD5C5C",e.Blue="#1E90FF",e.Green="#90EE90",e.Yellow="#FCFF4F",e))(H||{}),S=(e=>(e.ORCH="Orch",e.TROLL="Troll",e.GREEN_DARK_LORD="Green Dark Lord",e.BLUE_DARK_LORD="Blue Dark Lord",e.RED_DARK_LORD="Red Dark Lord",e.YELLOW_DARK_LORD="Yellow Dark Lord",e))(S||{}),W=(e=>(e.APPRENTICE="Apprentice",e.KNIGHT="Knight",e.HERO="Hero",e.LORD="Lord",e.MASTER="Master",e))(W||{}),J=(e=>(e[e.KILL_ALL=0]="KILL_ALL",e[e.KILL_ALL_OF_TYPE=1]="KILL_ALL_OF_TYPE",e[e.REACH_CELL=2]="REACH_CELL",e[e.OPEN_DOOR=3]="OPEN_DOOR",e[e.KILL_AT_LEAST=4]="KILL_AT_LEAST",e))(J||{}),Be=(e=>(e.EQUIPMENT="Equipment",e.MAGIC_ITEM="Magic Item",e.DOOR="Door",e.NOTE="Note",e))(Be||{}),Q=(e=>(e.LEFT="Left",e.RIGHT="Right",e.UP="Up",e.DOWN="Down",e))(Q||{});const Xt=[{name:"Sword",range:1,dice:3,twoHanded:!1,useHearHeroes:!0,amountInDeck:4},{name:"Two-handed Sword",range:1,dice:4,twoHanded:!0,useHearHeroes:!1,amountInDeck:1},{name:"Halberd",range:2,dice:3,twoHanded:!0,useHearHeroes:!0,amountInDeck:1}],Jt=[{name:"Orch Sword/Bow",range:99,dice:3,twoHanded:!1,useHearHeroes:!0,amountInDeck:4},{name:"Troll Club",range:1,dice:3,twoHanded:!1,useHearHeroes:!0,amountInDeck:4}],zt=[{name:"Orch Mail",defense:0,magicProtection:!1,amountInDeck:4},{name:"Troll Skin",defense:1,magicProtection:!1,amountInDeck:4}],vn="0",In="@",Ge=" ",gt="#",kn=(e,t,o,n)=>({type:e,name:t,position:{x:o,y:n},found:!1}),K=(e,t,o)=>({side:e,x:t,y:o,locked:!1,trapped:!1,open:!1,hidden:!1,trapAttacks:0}),Vt=(e,t,o)=>({...K(e,t,o),hidden:!0}),z=(e,t,o,n)=>{const s=Object.values(H).indexOf(t),l=Object.keys(H)[s];let A=W.LORD,B=2,g=2,f=4,v=4,k=4,L=Jt[0],U=zt[0];switch(e){case S.ORCH:{A=W.APPRENTICE,g=0,f=2,v=2,k=1;break}case S.TROLL:{A=W.KNIGHT,g=1,f=3,v=3,k=2,L=Jt[1],U=zt[1];break}}return e===S.YELLOW_DARK_LORD&&(B=3),{type:e,level:A,colour:t,actions:B,defense:g,health:f,maxHealth:v,experience:k,name:e+" ("+l+")",movement:3,position:{x:o,y:n},weapon:L,armour:U}},yn={name:"The Three Gates of Power",beaten:!1,winConditions:[{type:J.KILL_ALL,fulfilled:!1},{type:J.OPEN_DOOR,targetCell:{x:15,y:1},fulfilled:!1}],startingPositions:[{x:1,y:4},{x:0,y:3},{x:0,y:4},{x:0,y:5}],discoveredRooms:["A"],layout:{grid:["            EEEE","            EEEE","         DDDEEEE","AAA   CCCC","AAABBBCCCC   GGG","AAA   CCCCFFFGGG","      CCCC   GGG","      CCCC","      CCCCHHHIII","             III","             III"],doors:[K(Q.RIGHT,2,4),K(Q.RIGHT,5,4),K(Q.RIGHT,9,5),K(Q.RIGHT,12,5),K(Q.RIGHT,9,8),K(Q.RIGHT,12,8),K(Q.RIGHT,11,2),Vt(Q.UP,9,3),Vt(Q.RIGHT,15,1)],monsters:[z(S.ORCH,H.Blue,9,7),z(S.ORCH,H.Red,12,8),z(S.TROLL,H.Red,15,1),z(S.TROLL,H.Yellow,13,6)],secrets:[{type:Be.EQUIPMENT,position:{x:9,y:4},found:!1,name:"Random Equipment"},{type:Be.EQUIPMENT,position:{x:12,y:0},found:!1,name:"Random Equipment"},{type:Be.MAGIC_ITEM,position:{x:15,y:5},found:!1,name:"Random Magic Item",item:{name:"Healing Herbs"}},{type:Be.EQUIPMENT,position:{x:15,y:9},found:!1,name:"Random Equipment"}],notes:[{message:"Beyond stone and fire you shall find the Dread tunnel, the road to the Ice Dragons treasure.",position:{x:2,y:4}},{message:"The Gate of Water. <There is an image of a sea dragon under the text>",position:{x:9,y:8}},{message:"The Gate of Air. <There is an image of a pegasus under the text>",position:{x:9,y:5}},{message:"The Gate of Fire. <There is an image of a hippogriph under the text>",position:{x:9,y:3}}]},killCount:0},Zt={name:"Troll cave",beaten:!1,winConditions:[{type:J.KILL_ALL,fulfilled:!1}],nextDungeon:yn,startingPositions:[{x:2,y:9},{x:1,y:8},{x:1,y:9},{x:1,y:10}],discoveredRooms:["A"],layout:{grid:["     ######","     #CCCC#","     #CCCC#","     #CCCC#","     ##E###","      #E#  ","      #E## ","##### #BB# ","#AAA###BB# ","#AAADDDBB# ","#AAA###BB# ","##### #### "],doors:[K(Q.RIGHT,3,9),K(Q.RIGHT,6,9),K(Q.UP,7,7),K(Q.UP,7,4)],monsters:[z(S.ORCH,H.Green,6,9),z(S.ORCH,H.Yellow,8,10),z(S.ORCH,H.Red,7,5),z(S.ORCH,H.Red,9,3),z(S.TROLL,H.Green,6,1)],secrets:[kn(Be.NOTE,"Welcome to Drakriddarna",2,9)],notes:[]},killCount:0},jt=e=>{I(e,"Game saved."),localStorage.setItem("state",JSON.stringify(e))},Tn=()=>{const e=localStorage.getItem("state");if(e){const t=JSON.parse(e);return t.currentActor=t.heroes.find(o=>{var n;return o.name===((n=t.currentActor)==null?void 0:n.name)}),I(t,"Game loaded."),t}},Qn=()=>{const e=an;return ln(e,Zt),{heroes:e,dungeon:Zt,currentActor:e[0],actionLog:["Game Initialised","Each character has 2 actions. Move, Attack, Search or Pick Lock.","Each character can move 3 steps per action.","If another action is performed before moving 3 steps, the move is finished and both actions are consumed.","The rules of this game are harsh and unfair."]}},Ue=(e,t)=>(Xt[0].amountInDeck--,{name:e,actions:2,movement:3,defense:0,level:W.APPRENTICE,health:7,maxHealth:7,colour:t,experience:0,position:{x:-1,y:-1},weapon:Xt[0]}),an=[Ue("Fearik",H.Yellow),Ue("Helbran",H.Red),Ue("Siedel",H.Green),Ue("Wulf",H.Blue)],ln=(e,t)=>{e.forEach((o,n)=>o.position=t.startingPositions[n])},me=e=>{let t=[];for(let o=0;o<e.length;o++)t.push(e[o]);return t},ft=(e,t,o)=>e.dungeon.layout.monsters.some(n=>n.position.x===t&&n.position.y===o&&n.health>0),mt=(e,t,o)=>e.heroes.some(n=>n.position.x===t&&n.position.y===o),rn=e=>{e.movement===0&&(e.actions--,e.actions!==0&&(e.movement=3)),e.actions==0&&(e.movement=0)},R=(e,t)=>{const o=t.currentActor;if(!o||o.actions===0)return;let n=o.position.x,s=o.position.y;switch(e){case"UL":n=o.position.x-1,s=o.position.y-1;break;case"U":s=o.position.y-1;break;case"UR":n=o.position.x+1,s=o.position.y-1;break;case"L":n=o.position.x-1;break;case"R":n=o.position.x+1;break;case"DL":n=o.position.x-1,s=o.position.y+1;break;case"D":s=o.position.y+1;break;case"DR":n=o.position.x+1,s=o.position.y+1;break}const l=mt(t,n,s),A=!$e(t.dungeon.layout,n,s),B=ft(t,n,s);if(!l&&!A){const g=Bt(t.dungeon,n,s);g?g&&(B?cn(o,t,n,s):An(o,t,n,s,1)):Rn(t,o,n,s)&&De(o,t,n,s)}else I(t,`${o.name} could not make that move`);rn(o)},An=(e,t,o,n,s)=>{e.position.x=o,e.position.y=n;const l=t.dungeon.layout.notes.find(B=>tn(B.position,e.position));l&&(t.dungeon.layout.doors.some(g=>g.hidden&&tn(l.position,{x:g.x,y:g.y}))||I(t,`${e.name} reads: ${l.message}`)),t.dungeon.layout.monsters.some(B=>pt(e.position,B.position.x,B.position.y))?(I(t,`${e.name} walked by a monster and lost the momentum`),e.movement=0):e.movement-=s},De=(e,t,o,n)=>{const s=Xe(t.dungeon.layout.grid,o,n);s&&t.dungeon.discoveredRooms.push(s),An(e,t,e.position.x,e.position.y,1),I(t,`${e.name} opened a door`)},cn=(e,t,o,n)=>{var l;if(e.actions===1&&e.movement!==3){I(t,`${e.name} has no actions left to attack`);return}const s=t.dungeon.layout.monsters.find(A=>A.position.x===o&&A.position.y===n);if(s){const A=((l=s.armour)==null?void 0:l.defense)??s.defense,B=we(e.level,e.weapon.dice),g=Math.max(B-A,0);I(t,`${e.name} attacked ${s.name} with ${e.weapon.name} for ${ht(g,B,s)}`),s.health-=g,s.health<=0&&(t.dungeon.layout.monsters=t.dungeon.layout.monsters.filter(f=>f!=s),I(t,`${e.name} killed ${s.name}`),t.dungeon.killCount++,e.experience+=s.experience),e.actions>1&&e.movement<3?e.actions-=2:e.actions--}},we=(e,t)=>{let o=[];for(let n=0;n<t;n++)o.push(Math.floor(Math.random()*6)+1);switch(e){case W.APPRENTICE:o=o.filter(n=>n===5);break;case W.KNIGHT:case W.HERO:o=o.filter(n=>n>=4);break;case W.LORD:case W.MASTER:o=o.filter(n=>n>=3);break}return o.length},Ke=e=>{const t=e.currentActor;if(!t)return;if(!gn(t)){I(e,`${t.name} has no actions left to pick lock`);return}const o=e.dungeon.layout.doors.find(n=>n.x===t.position.x&&n.y===t.position.y);o&&o.locked&&(we(t.level,1)>=1?(o.locked=!1,I(e,`${t.name} managed to pick the lock`)):I(e,`${t.name} failed to pick the lock`),t.actions>1&&t.movement<3?t.actions-=2:t.actions--,t.movement=3,t.actions==0&&(t.movement=0))},Fe=e=>{const t=e.currentActor;if(!t)return;if(!gn(t)){I(e,`${t.name} has no actions left to search`);return}const o=we(t.level,1);if(o>=1){const n=e.dungeon.layout.doors.find(A=>A.hidden&&A.x===t.position.x&&A.y===t.position.y);n&&(I(e,`${t.name} searched (${o}) and found a hidden door`),n.hidden=!1);const s=e.dungeon.layout.doors.find(A=>A.trapped&&A.x===t.position.x&&t.position.y);s&&!n&&(I(e,`${t.name} searched (${o}) and found a trap in a door`),s.trapped=!1);const l=e.dungeon.layout.secrets.find(A=>pt(A.position,t.position.x,t.position.y));l&&!s&&!n&&I(e,`${t.name} searched (${o}) and found ${l.name}`),!n&&!s&&!l&&I(e,`${t.name} searched but found nothing`)}else I(e,`${t.name} searched but found nothing`);t.actions>1&&t.movement<3?t.actions-=2:t.actions--,t.actions==0&&(t.movement=0)},ut=e=>{if(bn(e),e.currentActor!==void 0){I(e,`${e.currentActor.name} ended their turn`);let o=e.heroes.indexOf(e.currentActor)+1;o===e.heroes.length&&(Ln(e),o=0),e.currentActor.actions=2,e.currentActor.movement=3,e.currentActor=e.heroes[o],I(e,`${e.currentActor.name} started their turn`)}},bn=e=>{e.dungeon.winConditions.forEach(t=>{var o;switch(t.type){case J.KILL_ALL:{const n=e.dungeon.layout.monsters.map(s=>s.health).reduce((s,l)=>s+l,0);t.fulfilled=n<=0;break}case J.REACH_CELL:{t.fulfilled=e.heroes.some(n=>{var s;return n.position.x===((s=t.targetCell)==null?void 0:s.x)&&n.position.y===t.targetCell.y});break}case J.KILL_ALL_OF_TYPE:{t.fulfilled=e.dungeon.layout.monsters.filter(n=>n.type===t.targetMonsterType).some(n=>n.health>0);break}case J.OPEN_DOOR:{t.fulfilled=((o=e.dungeon.layout.doors.find(n=>{var s,l;return n.x===((s=t.targetCell)==null?void 0:s.x)&&n.y===((l=t.targetCell)==null?void 0:l.y)}))==null?void 0:o.open)??!1;break}case J.KILL_AT_LEAST:{t.fulfilled=(t.killMinCount?t.killMinCount:0)<=e.dungeon.killCount;break}}}),e.dungeon.beaten=e.dungeon.winConditions.map(t=>t.fulfilled).reduce((t,o)=>t&&o,!0),e.dungeon.beaten&&(I(e,"All win conditions have been fulfilled"),I(e,`You have cleared ${e.dungeon.name}`))},dn=(e,t,o)=>{const n=we(W.APPRENTICE,e.trapAttacks),s=Math.max(n-t.defense,0);I(o,`Door was trapped. ${t.name} took ${ht(s,n,t)}`),t.health-=s},Rn=(e,t,o,n)=>{const s=e.dungeon.layout.doors.find(l=>l.x===t.position.x&&l.y===t.position.y);if(s&&!s.locked){const l=Dn(t.position.x,t.position.y,o,n);if(s.side===l)return s.open=!0,s.trapped&&dn(s,t,e),!0}return s&&s.locked&&I(e,"Door is locked"),!1},Dn=(e,t,o,n)=>{if(e===o){if(t>n)return Q.UP;if(t<n)return Q.DOWN}if(t===n){if(e>o)return Q.LEFT;if(e<o)return Q.RIGHT}},$e=(e,t,o)=>{let n=!0;if(t<0||t>=e.grid[0].length||o<0||o>=e.grid.length)n=!1;else{const s=Xe(e.grid,t,o);(s===vn||s===In||s===Ge||s===gt)&&(n=!1)}return n},Bt=(e,t,o)=>{const n=Xe(e.layout.grid,t,o);return n?e.discoveredRooms.includes(n):!1},Xe=(e,t,o)=>{let n;return e.forEach((s,l)=>{me(s).forEach((A,B)=>{l===o&&B===t&&(n=A)})}),n},pt=(e,t,o)=>e.x===t&&e.y===o||e.x===t-1&&e.y===o||e.x===t-1&&e.y===o-1||e.x===t&&e.y===o-1||e.x===t+1&&e.y===o-1||e.x===t+1&&e.y===o||e.x===t+1&&e.y===o+1||e.x===t&&e.y===o+1||e.x===t-1&&e.y===o+1,Ln=e=>{const t=e.dungeon.layout.monsters.filter(o=>{const n=Xe(e.dungeon.layout.grid,o.position.x,o.position.y);return n&&e.dungeon.discoveredRooms.includes(n)&&o.health>0});t.length===0&&I(e,"No monsters can act"),t.forEach(o=>{const n=o.actions;for(;o.actions>0;){I(e,`${o.name} acted `);const s=e.heroes.filter(l=>pt(o.position,l.position.x,l.position.y));if(s.length>0){const l=Math.floor(Math.random()*s.length);Hn(e,o,s[l])}else wn(e,o)}o.actions=n})},en=(e,t)=>Math.sqrt(Math.pow(e.x-(t==null?void 0:t.x),2)+Math.pow(e.y-(t==null?void 0:t.y),2)),wn=(e,t)=>{const o=e.heroes.map(s=>({hero:s,dist:en(s.position,t.position)})).sort((s,l)=>s.dist-l.dist)[0],n=_n(e,t.position);if(n.length>0){const s=n.map(l=>({pos:l,dist:en(l,o.hero.position)})).sort((l,A)=>l.dist-A.dist)[0].pos;t.position=s,I(e,`${t.name} moved towards ${o.hero.name} (${s.x},${s.y})`)}else I(e,`${t.name} could not move`);t.actions--};let _n=(e,t)=>{const o=t.x,n=t.y,s=[];for(let l=o-1;l<=o+1;l++)for(let A=n-1;A<=n+1;A++)l===o&&A===n||$e(e.dungeon.layout,l,A)&&Bt(e.dungeon,l,A)&&s.push({x:l,y:A});return s.filter(l=>!e.heroes.find(A=>A.position.x===l.x&&A.position.y===l.y)).filter(l=>!e.dungeon.layout.monsters.find(B=>B.position.x===l.x&&B.position.y===l.y))};const ht=(e,t,o)=>{var s;const n=((s=o.armour)==null?void 0:s.defense)??o.defense;return`${e} damage (${t}-${n}=${e})`},Hn=(e,t,o)=>{if(t.actions===1&&t.movement!==3){I(e,`${o.name} has no actions left to attack`);return}if(o){const n=we(t.level,t.weapon.dice),s=Math.max(n-o.defense,0);I(e,`${t.name} attacked ${o.name} with ${t.weapon.name} for ${ht(s,n,o)}`),o.health-=s,o.health<=0&&(I(e,`${t.name} killed ${o.name}`),e.heroes=e.heroes.filter(l=>l!==o)),(t==null?void 0:t.actions)>1&&(t==null?void 0:t.movement)<3?t.actions-=2:t.actions--}},gn=e=>e.movement<3?e.actions>1:e.actions>0,tn=(e,t)=>e.x===t.x&&e.y===t.y,I=(e,t)=>{e.actionLog=[t,...e.actionLog]},On="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAABAKADAAQAAAABAAABAAAAAABn6hpJAAAGiklEQVR4Ae3dS47iMBAA0DDiDogT9g6JY7ELJ2IJnKKnMxpLSQRRHJzxRPWyCQZ/n1ulFiqT3eVy+W5mXs/nszkcDjNrN01u/dkd/63Y9Z973e/35ng85jb7qP7UmKfTafdR5xoT+EBg37V9PB6zurher83X19dq9WdNolepm0/udbvdmvP53LRtm9t0cf0aYy6erIahBH6FWq3FEiAwEBAABhwKBGIJCACx9ttqCQwEBIABhwKBWAICQKz9tloCAwEBYMChQCCWgAAQa7+tlsBAQAAYcCgQiCUgAMTab6slMBD4kwk4eKdwoUvXXZKxN3caXZZd7tWl5i5plztOv36NMfvje03glcDqAaA7O9ClD69xvTsLMJV7n+bRpQOXvJaO+XMWoOQ09EUgS2D1ANDNZu5Zg6yZ/1R+959Fjdz7GmPmeqlPYCzgO4CxiDKBQAICQKDNtlQCYwEBYCyiTCCQgAAQaLMtlcBYQAAYiygTCCQgAATabEslMBYQAMYiygQCCQgAgTbbUgmMBQSAsYgygUAC+9xc/bXr59q/y+mvkXtfY8xcL/UJ9AV2Oc8F6Dec87oLFms+R+DdWYCpuc3J2Z9qv+SzqTE9F2CJqDalBLKeC5A76NrPEXh3FmBqnjVy9muMOWXgMwJJwHcAScKdQEABASDgplsygSQgACQJdwIBBQSAgJtuyQSSgACQJNwJBBQQAAJuuiUTSAICQJJwJxBQQAAIuOmWTCAJCABJwp1AQIHsswD/m9G7swBT86yRs19jzCkDnxHoBPY1fre/JP3S3/df2q4/96kc/3699PrVmJ4LkHTcawj8k7MAay+sbdu1h3jZvxz/lyze3JCA7wA2tFmmSqC0gABQWlR/BDYkIABsaLNMlUBpAQGgtKj+CGxIQADY0GaZKoHSAgJAaVH9EdiQgACwoc0yVQKlBQSA0qL6I7AhAQFgQ5tlqgRKC6x+FmDt5wjUzrGvPX7pPwj9ESBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAoJTAbwUM8lhPvL+bAAAAAElFTkSuQmCC",Sn="data:image/png;base64,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",Mn=(e,t)=>{const o=Math.abs(t.x-e.x),n=Math.abs(t.y-e.y),s=Math.min(o,n),l=Math.max(o,n),A=s,B=l-s;let g=Math.sqrt(2);return B===0&&(g=1),Math.floor(g*A+B)},Pn=(e,t,o)=>{const n=e.currentActor,s=e.dungeon.layout.doors.find(l=>l.x===n.position.x&&l.y===n.position.y);if(s)if(!s.open&&!s.hidden&&!s.locked)switch(s.open=!0,s.trapped&&dn(s,n,e),s.side){case Q.RIGHT:De(n,e,t+1,o);break;case Q.LEFT:De(n,e,t-1,o);break;case Q.DOWN:De(n,e,t,o+1);break;case Q.UP:De(n,e,t,o-1);break}else s.locked&&!s.hidden&&(I(e,"Door is locked"),Ke(e));else Fe(e)},Nn=(e,t,o)=>{const n=e.currentActor,s=$e(e.dungeon.layout,t,o),l=Mn(n.position,{x:t,y:o});if(console.log("distance: "+l),s){const A=mt(e,t,o),B=ft(e,t,o);!A&&!B&&l<=n.movement?(n.position={x:t,y:o},n.movement-=l):B&&(l<=n.weapon.range?cn(n,e,t,o):I(e,"Monster is out of range"))}},Un=(e,t,o)=>{const n=o.currentActor,s=document.getElementById("gameBoard");if(!s)return;const l=s.getBoundingClientRect(),A=Math.min(Math.floor((e.clientX-l.left)/t),o.dungeon.layout.grid[0].length-1),B=Math.min(Math.floor((e.clientY-l.top)/t),o.dungeon.layout.grid.length-1),g=o.dungeon.layout.grid[B][A];A===n.position.x&&B===n.position.y?Pn(o,A,B):o.dungeon.discoveredRooms.includes(g)&&Nn(o,A,B),rn(n)};function Gn(e){let t,o,n,s;return{c(){t=p("div"),o=p("canvas"),this.h()},l(l){t=h(l,"DIV",{style:!0,class:!0});var A=y(t);o=h(A,"CANVAS",{width:!0,height:!0,id:!0}),y(o).forEach(C),A.forEach(C),this.h()},h(){N(o,"width",i*20),N(o,"height",i*15),N(o,"id","gameBoard"),Wt(t,"max-height",i*20+"px"),Wt(t,"max-width",i*15+"px"),N(t,"class","dungeon svelte-wjhvco")},m(l,A){V(l,t,A),u(t,o),n||(s=O(o,"click",e[0]),n=!0)},p:ne,i:ne,o:ne,d(l){l&&C(t),n=!1,s()}}}const i=48;function Yn(e,t,o){let{state:n}=t,{debugMode:s=!0}=t;qe(()=>{const a=new Image;a.src=On;const r=new Image;r.src=Sn,l(a,r),setInterval(()=>l(a,r),10)});const l=(a,r)=>{if(!n||!document)return;const c=document.getElementById("gameBoard"),d=c.getContext("2d");d.clearRect(0,0,c.width,c.height),d.fillStyle="black",d.fillRect(0,0,c.width,c.height),n.dungeon.layout.grid.forEach((E,T)=>{me(E).forEach((m,b)=>B(d,m,b,T,a))}),n.dungeon.layout.grid.forEach((E,T)=>{me(E).forEach((m,b)=>g(d,m,b,T))}),n.dungeon.layout.grid.forEach((E,T)=>{me(E).forEach((m,b)=>f(d,m,b,T))}),n.dungeon.layout.grid.forEach((E,T)=>{me(E).forEach((m,b)=>oe(d,m,b,T,r))}),pe(d,n.currentActor),_e(d,n.currentActor)},A=(a,r,c)=>{a.beginPath(),a.strokeStyle="black",a.fillStyle="black",a.fillRect(r*i,c*i,i,i),a.stroke()},B=(a,r,c,d,E)=>{He(r)||!n.dungeon.discoveredRooms.includes(r)&&r!==Ge?n.dungeon.discoveredRooms.some(T=>se(c,d,T))?a.drawImage(E,48,0,48,48,c*i,d*i,i,i):A(a,c,d):F(r)?A(a,c,d):a.drawImage(E,0,0,48,48,c*i,d*i,i,i)},g=(a,r,c,d)=>{r===Ge||r===gt||(a.beginPath(),a.strokeStyle="black",a.rect(c*i,d*i,i,i),s&&(a.font="7px Arial",a.fillText(c+","+d,c*i+3,d*i+(i-3))),a.stroke())},f=(a,r,c,d)=>{const E=he(c,d);if(E&&!E.hidden&&!E.open&&!F(r))switch(a.fillStyle="brown",E.side){case Q.RIGHT:{a.fillRect(c*i+(i-2),d*i,4,i),E.locked&&s&&(a.fillStyle="grey",a.fillRect(c*i+(i-4),d*i+(i/2-4),8,8)),E.trapped&&s&&(a.fillStyle="red",a.fillRect(c*i+(i-4),d*i+(i/2-4),4,4));break}case Q.LEFT:{a.fillRect(c*i-2,d*i,4,i),E.locked&&s&&(a.fillStyle="grey",a.fillRect(c*i-4,d*i+(i/2-4),8,8)),E.trapped&&s&&(a.fillStyle="red",a.fillRect(c*i-4,d*i+(i/2-4),4,4));break}case Q.UP:{a.fillRect(c*i,d*i-2,i,4),E.locked&&s&&(a.fillStyle="grey",a.fillRect(c*i+(i/2-4),d*i-4,8,8)),E.trapped&&s&&(a.fillStyle="red",a.fillRect(c*i+(i/2-4),d*i-4,4,4));break}case Q.DOWN:{a.fillRect(c*i,d*i+(i-2),i,4),E.locked&&s&&(a.fillStyle="grey",a.fillRect(c*i+(i/2-4),d*i+(i-4),8,8)),E.trapped&&s&&(a.fillStyle="red",a.fillRect(c*i+(i/2-4),d*i+(i-4),4,4));break}}},v=(a,r,c,d)=>{a.beginPath(),a.strokeStyle=r.colour,a.fillStyle=r.colour,a.fillRect(c*i+4,d*i+(i-6),i-8,4),a.stroke()},k=(a,r,c,d)=>{s&&c.forEach(E=>{const T=r.position.x,m=r.position.y,b=E.position.x,M=E.position.y;a.strokeStyle=r.colour,a.beginPath(),a.moveTo(T*i+i/2,m*i+i/2),a.lineTo(b*i+i/2,M*i+i/2),a.stroke()})},L=(a,r,c,d)=>{a.beginPath(),a.strokeStyle="black",a.fillStyle="red",a.fillRect(c*i+4,d*i,i-8,4),a.fillStyle="green",a.fillRect(c*i+4,d*i,(i-8)*(r.health/r.maxHealth),4),a.rect(c*i+4,d*i,i-8,4),a.stroke()},U=(a,r,c,d)=>{var E=a.fillStyle,T=a.strokeStyle;a.strokeStyle="#080808",a.fillStyle="darkred";for(let m=0;m<r.actions;m++)a.fillRect(c*i+4+6*m,d*i+i-12,5,5),a.rect(c*i+4+6*m,d*i+i-12,5,5),a.stroke();a.fillStyle="blue";for(let m=0;m<r.movement;m++)a.fillRect(c*i+i-22+6*m,d*i+i-12,5,5),a.rect(c*i+i-22+6*m,d*i+i-12,5,5),a.stroke();a.fillStyle=E,a.strokeStyle=T},_e=(a,r)=>{r===n.currentActor&&(a.beginPath(),a.strokeStyle="lightblue",a.lineWidth=2,a.moveTo(r.position.x*i,r.position.y*i),a.lineTo(r.position.x*i+i/3,r.position.y*i),a.moveTo(r.position.x*i,r.position.y*i),a.lineTo(r.position.x*i,r.position.y*i+i/3),a.moveTo(r.position.x*i+i,r.position.y*i),a.lineTo(r.position.x*i+i/3*2,r.position.y*i),a.moveTo(r.position.x*i+i,r.position.y*i),a.lineTo(r.position.x*i+i,r.position.y*i+i/3),a.moveTo(r.position.x*i,r.position.y*i+i),a.lineTo(r.position.x*i,r.position.y*i+i/3*2),a.moveTo(r.position.x*i,r.position.y*i+i),a.lineTo(r.position.x*i+i/3,r.position.y*i+i),a.moveTo(r.position.x*i+i,r.position.y*i+i),a.lineTo(r.position.x*i+i,r.position.y*i+i/3*2),a.moveTo(r.position.x*i+i,r.position.y*i+i),a.lineTo(r.position.x*i+i/3*2,r.position.y*i+i),a.stroke(),a.lineWidth=1)},pe=(a,r)=>{if(r===n.currentActor&&s){for(let c=r.position.x-r.movement;c<=r.position.x+r.movement;c++)for(let d=r.position.y-r.movement;d<=r.position.y+r.movement;d++)if(Bt(n.dungeon,c,d)){const T=ft(n,c,d),m=mt(n,c,d),b=$e(n.dungeon.layout,c,d);!m&&!T&&b&&(a.fillStyle="rgba(50, 50, 255, 0.08)",a.fillRect(c*i,d*i,i,i),a.stroke())}}},oe=(a,r,c,d,E)=>{a.beginPath();const T=n.heroes.find(m=>m.position.x===c&&m.position.y===d);if(T)a.drawImage(E,4*16,0,16,16,c*i,d*i,i,i),U(a,T,c,d),v(a,T,c,d),L(a,T,c,d);else{const m=n.dungeon.layout.monsters.find(b=>b.position.x===c&&b.position.y===d);if(m&&m.health>0&&!F(r)){switch(m.type){case S.ORCH:a.drawImage(E,i,16,16,16,c*i,d*i,i,i);break;case S.TROLL:a.drawImage(E,i,16,16,16,c*i,d*i,i,i);break;default:a.drawImage(E,16,16,16,16,c*i,d*i,i,i);break}v(a,m,c,d),L(a,m,c,d),k(a,m,n.heroes)}}},F=a=>a===Ge||!n.dungeon.discoveredRooms.includes(a),He=a=>a===gt,he=(a,r)=>n.dungeon.layout.doors.find(c=>c.x===a&&c.y===r),se=(a,r,c)=>{if(!n)return;const d=Math.max(a-1,0),E=Math.max(r-1,0),T=Math.min(a+1,n.dungeon.layout.grid.length),m=Math.min(r+1,n.dungeon.layout.grid[0].length);for(let b=d;b<=T;b++)for(let M=E;M<=m;M++){const Oe=n.dungeon.layout.grid[M];if(me(Oe)[b]===c)return!0}return!1},$=a=>{Un(a,i,n)};return e.$$set=a=>{"state"in a&&o(1,n=a.state),"debugMode"in a&&o(2,s=a.debugMode)},[$,n,s]}class Kn extends We{constructor(t){super(),xe(this,t,Yn,Gn,Le,{state:1,debugMode:2})}}function Fn(e){let t;return{c(){t=p("canvas"),this.h()},l(o){t=h(o,"CANVAS",{id:!0,height:!0,width:!0}),y(t).forEach(C),this.h()},h(){N(t,"id","characterBoard"),N(t,"height","750"),N(t,"width","260")},m(o,n){V(o,t,n)},p:ne,i:ne,o:ne,d(o){o&&C(t)}}}const x=180;function qn(e,t,o){let{state:n}=t;qe(()=>{s(),setInterval(s,100)});const s=()=>{if(!n||!document)return;const g=document.getElementById("characterBoard"),f=g.getContext("2d");f.clearRect(0,0,g.width,g.height),f.stroke(),n.heroes.forEach((v,k)=>{l(f,g,v,k),A(f,v,k),B(f,v,k)})},l=(g,f,v,k)=>{g.fillStyle=v.colour,g.fillRect(12,k*x+12,f.width,x-12),g.stroke(),g.fillStyle="black"},A=(g,f,v)=>{const L=(f===n.currentActor?"> "+f.name:f.name)+" - "+f.level+" ("+f.experience+")";g.strokeStyle="black",g.font="18px Arial",g.fillText(L,16,v*x+30),g.fillText("HP: "+f.health,16,v*x+50),g.fillText("Actions: "+f.actions,16,v*x+70),g.fillText("Moves: "+f.movement,16,v*x+90),g.stroke()},B=(g,f,v)=>{g.fillText("Equipment",16,v*x+110),g.font="12px Arial",g.fillText("🗡️ "+f.weapon.name+" ("+f.weapon.dice+")",16,v*x+125);let k="None (0)",L="None (0)";f.armour&&(k=f.armour.name+" ("+f.armour.defense+")"),f.shield&&(L=f.shield.name+" ("+f.armour.dice+")"),g.fillText("🧱 "+k,16,v*x+142),g.fillText("🛡️ "+L,16,v*x+159)};return e.$$set=g=>{"state"in g&&o(0,n=g.state)},[n]}class Wn extends We{constructor(t){super(),xe(this,t,qn,Fn,Le,{state:0})}}function nn(e,t,o){const n=e.slice();return n[2]=t[o],n[4]=o,n}function xn(e){let t,o=e[2]+"",n;return{c(){t=p("p"),n=pn(o),this.h()},l(s){t=h(s,"P",{class:!0});var l=y(t);n=hn(l,o),l.forEach(C),this.h()},h(){N(t,"class","svelte-1xp6uq")},m(s,l){V(s,t,l),u(t,n)},p(s,l){l&1&&o!==(o=s[2]+"")&&En(n,o)},d(s){s&&C(t)}}}function on(e){let t,o=e[4]<25&&xn(e);return{c(){o&&o.c(),t=Ye()},l(n){o&&o.l(n),t=Ye()},m(n,s){o&&o.m(n,s),V(n,t,s)},p(n,s){n[4]<25&&o.p(n,s)},d(n){n&&C(t),o&&o.d(n)}}}function sn(e){let t,o=$t(e[0]),n=[];for(let s=0;s<o.length;s+=1)n[s]=on(nn(e,o,s));return{c(){for(let s=0;s<n.length;s+=1)n[s].c();t=Ye()},l(s){for(let l=0;l<n.length;l+=1)n[l].l(s);t=Ye()},m(s,l){for(let A=0;A<n.length;A+=1)n[A]&&n[A].m(s,l);V(s,t,l)},p(s,l){if(l&1){o=$t(s[0]);let A;for(A=0;A<o.length;A+=1){const B=nn(s,o,A);n[A]?n[A].p(B,l):(n[A]=on(B),n[A].c(),n[A].m(t.parentNode,t))}for(;A<n.length;A+=1)n[A].d(1);n.length=o.length}},d(s){s&&C(t),Bn(n,s)}}}function $n(e){let t,o=e[0],n=sn(e);return{c(){t=p("div"),n.c(),this.h()},l(s){t=h(s,"DIV",{class:!0});var l=y(t);n.l(l),l.forEach(C),this.h()},h(){N(t,"class","log svelte-1xp6uq")},m(s,l){V(s,t,l),n.m(t,null)},p(s,[l]){l&1&&Le(o,o=s[0])?(n.d(1),n=sn(s),n.c(),n.m(t,null)):n.p(s,l)},i:ne,o:ne,d(s){s&&C(t),n.d(s)}}}function Xn(e,t,o){let n=[],{state:s}=t;return qe(()=>{setInterval(()=>{o(0,n=s.actionLog)},1e3)}),e.$$set=l=>{"state"in l&&o(1,s=l.state)},[n,s]}class Jn extends We{constructor(t){super(),xe(this,t,Xn,$n,Le,{state:1})}}function zn(e){let t,o,n,s,l,A,B,g,f,v,k,L,U,_e="UL",pe,oe,F,He="U",he,se,$,a="UR",r,c,d,E="Next",T,m,b,M,Oe="L",Se,Me,Je,Ee,ie,Et="R",ze,Ce,ae,Ct="Search",Ve,q,ve,le,vt="DL",Ze,Ie,re,It="D",je,ke,Ae,kt="DR",et,ye,ce,yt="Pick lock",tt,de,Te,ge,Tt="Save",nt,Qe,ue,Qt="Load",ot,X,st,Pe,it,bt;n=new Wn({props:{state:e[0]}});function un(D){e[2](D)}let Rt={};e[0]!==void 0&&(Rt.state=e[0]),l=new Kn({props:Rt}),Ft.push(()=>xt(l,"state",un));function fn(D){e[4](D)}let Dt={};return e[0]!==void 0&&(Dt.state=e[0]),X=new Jn({props:Dt}),Ft.push(()=>xt(X,"state",fn)),{c(){t=p("div"),o=p("div"),at(n.$$.fragment),s=w(),at(l.$$.fragment),B=w(),g=p("div"),f=p("div"),v=p("table"),k=p("tr"),L=p("td"),U=p("button"),U.textContent=_e,pe=w(),oe=p("td"),F=p("button"),F.textContent=He,he=w(),se=p("td"),$=p("button"),$.textContent=a,r=w(),c=p("td"),d=p("button"),d.textContent=E,T=w(),m=p("tr"),b=p("td"),M=p("button"),M.textContent=Oe,Se=w(),Me=p("td"),Je=w(),Ee=p("td"),ie=p("button"),ie.textContent=Et,ze=w(),Ce=p("td"),ae=p("button"),ae.textContent=Ct,Ve=w(),q=p("tr"),ve=p("td"),le=p("button"),le.textContent=vt,Ze=w(),Ie=p("td"),re=p("button"),re.textContent=It,je=w(),ke=p("td"),Ae=p("button"),Ae.textContent=kt,et=w(),ye=p("td"),ce=p("button"),ce.textContent=yt,tt=w(),de=p("tr"),Te=p("td"),ge=p("button"),ge.textContent=Tt,nt=w(),Qe=p("td"),ue=p("button"),ue.textContent=Qt,ot=w(),at(X.$$.fragment),this.h()},l(D){t=h(D,"DIV",{class:!0});var G=y(t);o=h(G,"DIV",{class:!0});var be=y(o);lt(n.$$.fragment,be),be.forEach(C),s=_(G),lt(l.$$.fragment,G),G.forEach(C),B=_(D),g=h(D,"DIV",{class:!0});var fe=y(g);f=h(fe,"DIV",{class:!0});var Re=y(f);v=h(Re,"TABLE",{});var Z=y(v);k=h(Z,"TR",{});var j=y(k);L=h(j,"TD",{});var Lt=y(L);U=h(Lt,"BUTTON",{"data-svelte-h":!0}),P(U)!=="svelte-fw3uxo"&&(U.textContent=_e),Lt.forEach(C),pe=_(j),oe=h(j,"TD",{});var wt=y(oe);F=h(wt,"BUTTON",{"data-svelte-h":!0}),P(F)!=="svelte-1jeoia6"&&(F.textContent=He),wt.forEach(C),he=_(j),se=h(j,"TD",{});var _t=y(se);$=h(_t,"BUTTON",{"data-svelte-h":!0}),P($)!=="svelte-1p8c8vc"&&($.textContent=a),_t.forEach(C),r=_(j),c=h(j,"TD",{});var Ht=y(c);d=h(Ht,"BUTTON",{"data-svelte-h":!0}),P(d)!=="svelte-1rtxc14"&&(d.textContent=E),Ht.forEach(C),j.forEach(C),T=_(Z),m=h(Z,"TR",{});var ee=y(m);b=h(ee,"TD",{});var Ot=y(b);M=h(Ot,"BUTTON",{"data-svelte-h":!0}),P(M)!=="svelte-10dnpu6"&&(M.textContent=Oe),Ot.forEach(C),Se=_(ee),Me=h(ee,"TD",{}),y(Me).forEach(C),Je=_(ee),Ee=h(ee,"TD",{});var St=y(Ee);ie=h(St,"BUTTON",{"data-svelte-h":!0}),P(ie)!=="svelte-12287ni"&&(ie.textContent=Et),St.forEach(C),ze=_(ee),Ce=h(ee,"TD",{});var Mt=y(Ce);ae=h(Mt,"BUTTON",{"data-svelte-h":!0}),P(ae)!=="svelte-cps1bu"&&(ae.textContent=Ct),Mt.forEach(C),ee.forEach(C),Ve=_(Z),q=h(Z,"TR",{});var te=y(q);ve=h(te,"TD",{});var Pt=y(ve);le=h(Pt,"BUTTON",{"data-svelte-h":!0}),P(le)!=="svelte-1ji074i"&&(le.textContent=vt),Pt.forEach(C),Ze=_(te),Ie=h(te,"TD",{});var Nt=y(Ie);re=h(Nt,"BUTTON",{"data-svelte-h":!0}),P(re)!=="svelte-li5tq6"&&(re.textContent=It),Nt.forEach(C),je=_(te),ke=h(te,"TD",{});var Ut=y(ke);Ae=h(Ut,"BUTTON",{"data-svelte-h":!0}),P(Ae)!=="svelte-3esmwe"&&(Ae.textContent=kt),Ut.forEach(C),et=_(te),ye=h(te,"TD",{});var Gt=y(ye);ce=h(Gt,"BUTTON",{"data-svelte-h":!0}),P(ce)!=="svelte-sacog4"&&(ce.textContent=yt),Gt.forEach(C),te.forEach(C),tt=_(Z),de=h(Z,"TR",{});var Ne=y(de);Te=h(Ne,"TD",{});var Yt=y(Te);ge=h(Yt,"BUTTON",{"data-svelte-h":!0}),P(ge)!=="svelte-1vr5zyk"&&(ge.textContent=Tt),Yt.forEach(C),nt=_(Ne),Qe=h(Ne,"TD",{});var Kt=y(Qe);ue=h(Kt,"BUTTON",{"data-svelte-h":!0}),P(ue)!=="svelte-1m2jkw7"&&(ue.textContent=Qt),Kt.forEach(C),Ne.forEach(C),Z.forEach(C),Re.forEach(C),ot=_(fe),lt(X.$$.fragment,fe),fe.forEach(C),this.h()},h(){N(o,"class","characterSide svelte-kvu9lt"),N(t,"class","container svelte-kvu9lt"),N(f,"class","commands svelte-kvu9lt"),N(g,"class","container svelte-kvu9lt")},m(D,G){V(D,t,G),u(t,o),rt(n,o,null),u(t,s),rt(l,t,null),V(D,B,G),V(D,g,G),u(g,f),u(f,v),u(v,k),u(k,L),u(L,U),u(k,pe),u(k,oe),u(oe,F),u(k,he),u(k,se),u(se,$),u(k,r),u(k,c),u(c,d),u(v,T),u(v,m),u(m,b),u(b,M),u(m,Se),u(m,Me),u(m,Je),u(m,Ee),u(Ee,ie),u(m,ze),u(m,Ce),u(Ce,ae),u(v,Ve),u(v,q),u(q,ve),u(ve,le),u(q,Ze),u(q,Ie),u(Ie,re),u(q,je),u(q,ke),u(ke,Ae),u(q,et),u(q,ye),u(ye,ce),u(v,tt),u(v,de),u(de,Te),u(Te,ge),u(de,nt),u(de,Qe),u(Qe,ue),u(g,ot),rt(X,g,null),Pe=!0,it||(bt=[O(window,"keydown",Cn(e[1])),O(U,"click",function(){Y(R("UL",e[0]))&&R("UL",e[0]).apply(this,arguments)}),O(F,"click",function(){Y(R("U",e[0]))&&R("U",e[0]).apply(this,arguments)}),O($,"click",function(){Y(R("UR",e[0]))&&R("UR",e[0]).apply(this,arguments)}),O(d,"click",function(){Y(ut(e[0]))&&ut(e[0]).apply(this,arguments)}),O(M,"click",function(){Y(R("L",e[0]))&&R("L",e[0]).apply(this,arguments)}),O(ie,"click",function(){Y(R("R",e[0]))&&R("R",e[0]).apply(this,arguments)}),O(ae,"click",function(){Y(Fe(e[0]))&&Fe(e[0]).apply(this,arguments)}),O(le,"click",function(){Y(R("DL",e[0]))&&R("DL",e[0]).apply(this,arguments)}),O(re,"click",function(){Y(R("D",e[0]))&&R("D",e[0]).apply(this,arguments)}),O(Ae,"click",function(){Y(R("DR",e[0]))&&R("DR",e[0]).apply(this,arguments)}),O(ce,"click",function(){Y(Ke(e[0]))&&Ke(e[0]).apply(this,arguments)}),O(ge,"click",function(){Y(jt(e[0]))&&jt(e[0]).apply(this,arguments)}),O(ue,"click",e[3])],it=!0)},p(D,[G]){e=D;const be={};G&1&&(be.state=e[0]),n.$set(be);const fe={};!A&&G&1&&(A=!0,fe.state=e[0],qt(()=>A=!1)),l.$set(fe);const Re={};!st&&G&1&&(st=!0,Re.state=e[0],qt(()=>st=!1)),X.$set(Re)},i(D){Pe||(At(n.$$.fragment,D),At(l.$$.fragment,D),At(X.$$.fragment,D),Pe=!0)},o(D){ct(n.$$.fragment,D),ct(l.$$.fragment,D),ct(X.$$.fragment,D),Pe=!1},d(D){D&&(C(t),C(B),C(g)),dt(n),dt(l),dt(X),it=!1,mn(bt)}}}function Vn(e,t,o){let n=Qn();qe(()=>{setInterval(l,1e3)});function s(f){switch(f.key){case"6":case"d":R("R",n);break;case"9":case"e":R("UR",n);break;case"8":case"w":R("U",n);break;case"7":case"q":R("UL",n);break;case"4":case"a":R("L",n);break;case"1":case"z":R("DL",n);break;case"2":case"x":R("D",n);break;case"3":case"c":R("DR",n);break;case"0":case" ":ut(n);break;case"-":case"r":Ke(n);break;case"+":case"f":Fe(n);break}}const l=()=>{if(n.dungeon.beaten&&n.dungeon.nextDungeon){o(0,n.dungeon=n.dungeon.nextDungeon,n);const f=an.filter(v=>!n.heroes.find(k=>v.name===k.name));n.heroes.push(...f),ln(n.heroes,n.dungeon),o(0,n.actionLog=["You have reached "+n.dungeon.name],n)}};function A(f){n=f,o(0,n)}const B=()=>o(0,n=Tn());function g(f){n=f,o(0,n)}return[n,s,A,B,g]}class eo extends We{constructor(t){super(),xe(this,t,Vn,zn,Le,{})}}export{eo as component};
