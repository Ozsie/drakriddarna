function x(){}function w(t,n){for(const e in n)t[e]=n[e];return t}function j(t){return t()}function M(){return Object.create(null)}function v(t){t.forEach(j)}function A(t){return typeof t=="function"}function F(t,n){return t!=t?n==n:t!==n||t&&typeof t=="object"||typeof t=="function"}function P(t){return Object.keys(t).length===0}function g(t,...n){if(t==null){for(const o of n)o(void 0);return x}const e=t.subscribe(...n);return e.unsubscribe?()=>e.unsubscribe():e}function S(t){let n;return g(t,e=>n=e)(),n}function U(t,n,e){t.$$.on_destroy.push(g(n,e))}function B(t,n,e,o){if(t){const r=y(t,n,e,o);return t[0](r)}}function y(t,n,e,o){return t[1]&&o?w(e.ctx.slice(),t[1](o(n))):e.ctx}function C(t,n,e,o){if(t[2]&&o){const r=t[2](o(e));if(n.dirty===void 0)return r;if(typeof r=="object"){const a=[],f=Math.max(n.dirty.length,r.length);for(let s=0;s<f;s+=1)a[s]=n.dirty[s]|r[s];return a}return n.dirty|r}return n.dirty}function D(t,n,e,o,r,a){if(r){const f=y(n,e,o,a);t.p(f,r)}}function G(t){if(t.ctx.length>32){const n=[],e=t.ctx.length/32;for(let o=0;o<e;o++)n[o]=-1;return n}return-1}function H(t){return t??""}let i;function _(t){i=t}function m(){if(!i)throw new Error("Function called outside component initialization");return i}function I(t){m().$$.on_mount.push(t)}function J(t){m().$$.after_update.push(t)}const l=[],b=[];let u=[];const h=[],k=Promise.resolve();let p=!1;function E(){p||(p=!0,k.then(q))}function K(){return E(),k}function O(t){u.push(t)}function L(t){h.push(t)}const d=new Set;let c=0;function q(){if(c!==0)return;const t=i;do{try{for(;c<l.length;){const n=l[c];c++,_(n),z(n.$$)}}catch(n){throw l.length=0,c=0,n}for(_(null),l.length=0,c=0;b.length;)b.pop()();for(let n=0;n<u.length;n+=1){const e=u[n];d.has(e)||(d.add(e),e())}u.length=0}while(l.length);for(;h.length;)h.pop()();p=!1,d.clear(),_(t)}function z(t){if(t.fragment!==null){t.update(),v(t.before_update);const n=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,n),t.after_update.forEach(O)}}function N(t){const n=[],e=[];u.forEach(o=>t.indexOf(o)===-1?n.push(o):e.push(o)),e.forEach(o=>o()),u=n}export{E as A,J as a,b,B as c,C as d,U as e,H as f,G as g,L as h,A as i,S as j,g as k,M as l,q as m,x as n,I as o,P as p,O as q,v as r,F as s,K as t,D as u,N as v,i as w,_ as x,j as y,l as z};
