// Tests for the licence verification endpoint. Run: node functions/api/verify.test.mjs
// Exercise the verify function with a stubbed Stripe API
const mod = await import(new URL('./verify.js', import.meta.url).href);

const cases = [
  { name:'active subscription',  key:'sub_1P4xyzABC123', stripe:{ok:true, body:{status:'active', items:{data:[{price:{nickname:'Pro'}}]}}}, want:true },
  { name:'trialing subscription',key:'sub_1P4xyzABC123', stripe:{ok:true, body:{status:'trialing', items:{data:[]}}},  want:true },
  { name:'cancelled',            key:'sub_1P4xyzABC123', stripe:{ok:true, body:{status:'canceled', items:{data:[]}}},  want:false },
  { name:'past_due',             key:'sub_1P4xyzABC123', stripe:{ok:true, body:{status:'past_due', items:{data:[]}}},  want:false },
  { name:'unknown key',          key:'sub_totallyfake99',stripe:{ok:false},                                            want:false },
  { name:'malformed key',        key:'CP-12345',         stripe:null,                                                  want:false },
  { name:'empty key',            key:'',                 stripe:null,                                                  want:false },
  { name:'injection attempt',    key:'sub_x/../../charges', stripe:{ok:false},                                         want:false },
];

let pass=0, fail=0;
for (const c of cases) {
  globalThis.fetch = async () => ({ ok: c.stripe?.ok ?? false, json: async () => c.stripe?.body ?? {} });
  const req = new Request('https://certpay.net/api/verify', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key:c.key})
  });
  const res = await mod.onRequestPost({ request:req, env:{STRIPE_SECRET_KEY:'sk_test_x'} });
  const j = await res.json();
  const ok = j.ok === c.want;
  ok?pass++:fail++;
  console.log((ok?'  ok  ':' FAIL ')+c.name.padEnd(24)+' -> ok='+j.ok+' reason='+j.reason);
}

// missing config
globalThis.fetch = async () => ({ok:false, json:async()=>({})});
const r2 = await mod.onRequestPost({
  request:new Request('https://x/api/verify',{method:'POST',body:JSON.stringify({key:'sub_abc123'})}),
  env:{}
});
const j2 = await r2.json();
const ok2 = r2.status===503 && j2.reason==='not_configured';
ok2?pass++:fail++;
console.log((ok2?'  ok  ':' FAIL ')+'missing STRIPE_SECRET_KEY'.padEnd(24)+' -> '+r2.status+' '+j2.reason);

// GET rejected
const r3 = await mod.onRequestGet();
const ok3 = r3.status===405;
ok3?pass++:fail++;
console.log((ok3?'  ok  ':' FAIL ')+'GET rejected'.padEnd(24)+' -> '+r3.status);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
