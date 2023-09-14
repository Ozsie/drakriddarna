var E=Object.defineProperty;var C=(e,t,n)=>t in e?E(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var p=(e,t,n)=>(C(e,typeof t!="symbol"?t+"":t,n),n);import{r as h,n as y,h as w,j,i as S,k as B,l as b,m as L,p as I,q as N,v as M,w as P,x as T}from"./scheduler.ba2ce6c0.js";let $=!1;function q(){$=!0}function H(){$=!1}function O(e,t,n,i){for(;e<t;){const l=e+(t-e>>1);n(l)<=i?e=l+1:t=l}return e}function z(e){if(e.hydrate_init)return;e.hydrate_init=!0;let t=e.childNodes;if(e.nodeName==="HEAD"){const r=[];for(let a=0;a<t.length;a++){const o=t[a];o.claim_order!==void 0&&r.push(o)}t=r}const n=new Int32Array(t.length+1),i=new Int32Array(t.length);n[0]=-1;let l=0;for(let r=0;r<t.length;r++){const a=t[r].claim_order,o=(l>0&&t[n[l]].claim_order<=a?l+1:O(1,l,_=>t[n[_]].claim_order,a))-1;i[r]=n[o]+1;const c=o+1;n[c]=r,l=Math.max(c,l)}const u=[],s=[];let f=t.length-1;for(let r=n[l]+1;r!=0;r=i[r-1]){for(u.push(t[r-1]);f>=r;f--)s.push(t[f]);f--}for(;f>=0;f--)s.push(t[f]);u.reverse(),s.sort((r,a)=>r.claim_order-a.claim_order);for(let r=0,a=0;r<s.length;r++){for(;a<u.length&&s[r].claim_order>=u[a].claim_order;)a++;const o=a<u.length?u[a]:null;e.insertBefore(s[r],o)}}function D(e,t){if($){for(z(e),(e.actual_end_child===void 0||e.actual_end_child!==null&&e.actual_end_child.parentNode!==e)&&(e.actual_end_child=e.firstChild);e.actual_end_child!==null&&e.actual_end_child.claim_order===void 0;)e.actual_end_child=e.actual_end_child.nextSibling;t!==e.actual_end_child?(t.claim_order!==void 0||t.parentNode!==e)&&e.insertBefore(t,e.actual_end_child):e.actual_end_child=t.nextSibling}else(t.parentNode!==e||t.nextSibling!==null)&&e.appendChild(t)}function ee(e,t,n){$&&!n?D(e,t):(t.parentNode!==e||t.nextSibling!=n)&&e.insertBefore(t,n||null)}function R(e){e.parentNode&&e.parentNode.removeChild(e)}function V(e){return document.createElement(e)}function x(e){return document.createTextNode(e)}function te(){return x(" ")}function ne(){return x("")}function ie(e,t,n,i){return e.addEventListener(t,n,i),()=>e.removeEventListener(t,n,i)}function re(e,t,n){n==null?e.removeAttribute(t):e.getAttribute(t)!==n&&e.setAttribute(t,n)}function ae(e){return e.dataset.svelteH}function W(e){return Array.from(e.childNodes)}function F(e){e.claim_info===void 0&&(e.claim_info={last_index:0,total_claimed:0})}function A(e,t,n,i,l=!1){F(e);const u=(()=>{for(let s=e.claim_info.last_index;s<e.length;s++){const f=e[s];if(t(f)){const r=n(f);return r===void 0?e.splice(s,1):e[s]=r,l||(e.claim_info.last_index=s),f}}for(let s=e.claim_info.last_index-1;s>=0;s--){const f=e[s];if(t(f)){const r=n(f);return r===void 0?e.splice(s,1):e[s]=r,l?r===void 0&&e.claim_info.last_index--:e.claim_info.last_index=s,f}}return i()})();return u.claim_order=e.claim_info.total_claimed,e.claim_info.total_claimed+=1,u}function G(e,t,n,i){return A(e,l=>l.nodeName===t,l=>{const u=[];for(let s=0;s<l.attributes.length;s++){const f=l.attributes[s];n[f.name]||u.push(f.name)}u.forEach(s=>l.removeAttribute(s))},()=>i(t))}function se(e,t,n){return G(e,t,n,V)}function J(e,t){return A(e,n=>n.nodeType===3,n=>{const i=""+t;if(n.data.startsWith(i)){if(n.data.length!==i.length)return n.splitText(i.length)}else n.data=i},()=>x(t),!0)}function le(e){return J(e," ")}function fe(e,t){t=""+t,e.data!==t&&(e.data=t)}function ue(e,t,n,i){n==null?e.style.removeProperty(t):e.style.setProperty(t,n,i?"important":"")}function ce(e,t){return new e(t)}const m=new Set;let d;function oe(){d={r:0,c:[],p:d}}function de(){d.r||h(d.c),d=d.p}function K(e,t){e&&e.i&&(m.delete(e),e.i(t))}function _e(e,t,n,i){if(e&&e.o){if(m.has(e))return;m.add(e),d.c.push(()=>{m.delete(e),i&&(n&&e.d(1),i())}),e.o(t)}else i&&i()}function me(e,t,n){const i=e.$$.props[t];i!==void 0&&(e.$$.bound[i]=n,n(e.$$.ctx[i]))}function he(e){e&&e.c()}function $e(e,t){e&&e.l(t)}function Q(e,t,n){const{fragment:i,after_update:l}=e.$$;i&&i.m(t,n),b(()=>{const u=e.$$.on_mount.map(M).filter(S);e.$$.on_destroy?e.$$.on_destroy.push(...u):h(u),e.$$.on_mount=[]}),l.forEach(b)}function U(e,t){const n=e.$$;n.fragment!==null&&(L(n.after_update),h(n.on_destroy),n.fragment&&n.fragment.d(t),n.on_destroy=n.fragment=null,n.ctx=[])}function X(e,t){e.$$.dirty[0]===-1&&(P.push(e),T(),e.$$.dirty.fill(0)),e.$$.dirty[t/31|0]|=1<<t%31}function pe(e,t,n,i,l,u,s,f=[-1]){const r=I;N(e);const a=e.$$={fragment:null,ctx:[],props:u,update:y,not_equal:l,bound:w(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(t.context||(r?r.$$.context:[])),callbacks:w(),dirty:f,skip_bound:!1,root:t.target||r.$$.root};s&&s(a.root);let o=!1;if(a.ctx=n?n(e,t.props||{},(c,_,...g)=>{const v=g.length?g[0]:_;return a.ctx&&l(a.ctx[c],a.ctx[c]=v)&&(!a.skip_bound&&a.bound[c]&&a.bound[c](v),o&&X(e,c)),_}):[],a.update(),o=!0,h(a.before_update),a.fragment=i?i(a.ctx):!1,t.target){if(t.hydrate){q();const c=W(t.target);a.fragment&&a.fragment.l(c),c.forEach(R)}else a.fragment&&a.fragment.c();t.intro&&K(e.$$.fragment),Q(e,t.target,t.anchor),H(),j()}N(r)}class ye{constructor(){p(this,"$$");p(this,"$$set")}$destroy(){U(this,1),this.$destroy=y}$on(t,n){if(!S(n))return y;const i=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return i.push(n),()=>{const l=i.indexOf(n);l!==-1&&i.splice(l,1)}}$set(t){this.$$set&&!B(t)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}const Y="4";typeof window<"u"&&(window.__svelte||(window.__svelte={v:new Set})).v.add(Y);export{ie as A,ye as S,ee as a,de as b,le as c,K as d,ne as e,R as f,V as g,se as h,pe as i,W as j,re as k,ue as l,x as m,J as n,fe as o,oe as p,ce as q,he as r,te as s,_e as t,$e as u,Q as v,U as w,D as x,me as y,ae as z};
