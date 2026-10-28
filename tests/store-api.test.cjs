const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const KEY = 'europadel_checkout_attempt_v1';
const contact = { email:' BUYER@example.com ', firstName:'Example', lastName:'Buyer', country:'Spain',
  city:'Madrid', address:'Example 1', postalCode:'28001', phone:'+34 600 123 456' };
const items = [{ name:'RONIN V1 2026', variant:'onyx', qty:1, price:1 }];
function setup() {
  const storage = new Map();
  const calls = [];
  let cart = items;
  const context = {
    URL, TextEncoder, Uint8Array, crypto:webcrypto, AbortController, setTimeout, clearTimeout,
    location:{origin:'http://127.0.0.1:4173', hostname:'127.0.0.1'},
    sessionStorage:{ getItem:k => storage.get(k) || null, setItem:(k,v) => storage.set(k,v), removeItem:k => storage.delete(k) },
    window:{ EuroPadelConfig:{checkoutEnabled:true, apiOrigin:'http://127.0.0.1:8000',
      variantIds:{[JSON.stringify(['RONIN V1 2026','onyx'])]:42}},
      CartStore:{get:() => cart, clear:() => { cart = []; }} },
    fetch: async (url, options) => {
      calls.push({url, options});
      return {ok:true, json:async () => ({order_id:7, checkout_url:'https://checkout.stripe.com/c/pay/cs_test'})};
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'shipping-countries.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'store-api.js'), 'utf8'), context);
  return {context, api:context.window.EuroPadelAPI, storage, calls, cart:() => cart};
}
async function run() {
  const proof = setup();
  proof.context.window.EuroPadelConfig.requireCheckoutReadiness = true;
  const proofPosts=[];
  proof.context.fetch = async (url,options) => {
    if(options.method==='GET') return {ok:true,json:async()=>({available:true,mode:'test',email_verification_required:true})};
    proofPosts.push(JSON.parse(options.body));
    return {ok:true,json:async()=>({order_id:7,checkout_url:'https://checkout.stripe.com/c/pay/cs_test'})};
  };
  await assert.rejects(proof.api.start(items,contact),/Verify your email/);
  assert.equal(proof.storage.size,0);assert.equal(proofPosts.length,0);
  await proof.api.start(items,{...contact,verificationId:'challenge-one',verificationToken:'private-proof-one'});
  await proof.api.start(items,{...contact,verificationId:'challenge-two',verificationToken:'private-proof-two'});
  assert.equal(proofPosts[0].request_id,proofPosts[1].request_id);
  assert.equal(proofPosts[1].verification_token,'private-proof-two');
  assert.ok(!proof.storage.get(KEY).includes('private-proof'));
  const staged=setup();staged.context.window.EuroPadelConfig.requireCheckoutReadiness=true;
  staged.context.fetch=async (url,options)=>({ok:true,json:async()=>options.method==='GET'
    ? {available:true,mode:'test'} : {order_id:7,checkout_url:'https://checkout.stripe.com/c/pay/cs_test'}});
  assert.equal(await staged.api.emailVerificationRequired(),false);
  await staged.api.start(items,contact);
  staged.context.fetch=async()=>({ok:true,json:async()=>({available:true,mode:'test',email_verification_required:true})});
  await assert.rejects(staged.api.start(items,contact),error=>error.code==='email_verification_required');
  const unavailable = setup();
  unavailable.context.window.EuroPadelConfig.requireCheckoutReadiness = true;
  unavailable.context.fetch = async () => ({ ok: true, json: async () => ({ available: false, mode: 'disabled' }) });
  await assert.rejects(unavailable.api.start(items, contact), /not configured/);
  assert.equal(unavailable.storage.size, 0);
  unavailable.context.fetch = async () => ({ ok: true, json: async () => ({ available: true, mode: 'live' }) });
  await assert.rejects(unavailable.api.start(items, contact), /only accepts Stripe test/);
  assert.equal(unavailable.storage.size, 0);
  const test = setup();
  const online = setup();
  online.context.location = {origin:'https://www.euro-padel.eu', hostname:'www.euro-padel.eu'};
  online.context.window.EuroPadelConfig.requireCheckoutReadiness = true;
  online.context.window.EuroPadelConfig.apiOrigin = 'https://europadel-api.onrender.com';
  online.context.fetch = async () => ({ok:true, json:async () => ({available:true, mode:'test'})});
  await assert.rejects(online.api.start(items, contact), /not ready for live payments/);
  assert.equal(online.storage.size, 0);
  const promo = setup();
  await promo.api.start(items, {...contact, promoCode:' carchia5 '});
  assert.equal(JSON.parse(promo.calls[0].options.body).promo_code, 'CARCHIA5');
  await test.api.start(items, contact);
  const body = JSON.parse(test.calls[0].options.body);
  assert.equal(body.items[0].product_variant_id, 42);
  assert.equal(body.delivery.country, 'ES');
  assert.equal(body.delivery.postal_code, '28001');
  assert.equal(body.delivery.phone, '+34600123456');
  assert.equal(body.email, 'buyer@example.com');
  assert.ok(!('price' in body.items[0]));
  assert.ok(!('total_amount' in body));
  assert.equal(test.calls[0].options.credentials, 'omit');
  const stored = test.storage.get(KEY);
  assert.ok(!stored.includes('buyer@example.com') && !stored.includes('Example') && !stored.includes('28001'));
  await test.api.start(items, contact);
  assert.equal(body.request_id, JSON.parse(test.calls[1].options.body).request_id);
  await assert.rejects(test.api.start(items, {...contact, city:'Barcelona'}), /previous checkout/);
  assert.equal(test.calls.length, 2);
  await test.api.complete({id:7, status:'pending'});
  assert.equal(test.cart().length, 1);
  await test.api.complete({id:8, status:'paid'});
  assert.equal(test.cart().length, 1); // Older paid order cannot clear a different purchase.
  await test.api.complete({id:7, status:'paid'});
  assert.equal(test.cart().length, 0);
  assert.equal(test.storage.has(KEY), false);

  const network = setup();
  network.context.fetch = async () => { throw Object.assign(new Error('timeout'), {name:'AbortError'}); };
  await assert.rejects(network.api.start(items, contact), /Connection interrupted/);
  const interrupted = network.storage.get(KEY);
  network.context.fetch = test.context.fetch;
  await network.api.start(items, contact);
  assert.equal(JSON.parse(interrupted).id, JSON.parse(network.storage.get(KEY)).id);

  const off = setup();
  off.context.window.EuroPadelConfig.checkoutEnabled = false;
  await assert.rejects(off.api.start(items, contact), /not enabled/);
  assert.equal(off.calls.length, 0);

  const unlinked = setup();
  unlinked.context.window.EuroPadelConfig.variantIds = {};
  await assert.rejects(unlinked.api.start(items, contact), /not connected/);
  assert.equal(unlinked.calls.length, 0);

  const malicious = setup();
  malicious.context.fetch = async () => ({ok:true, json:async () => ({order_id:7, checkout_url:'https://checkout.stripe.com.evil.example/pay'})});
  await assert.rejects(malicious.api.start(items, contact), /redirect could not be verified/);

  const expire = setup();
  await expire.api.start(items, contact);
  const attempt = JSON.parse(expire.storage.get(KEY));
  attempt.createdAt -= 24 * 3600000;
  expire.storage.set(KEY, JSON.stringify(attempt));
  await assert.rejects(expire.api.start(items, contact), /previous checkout/);
  assert.equal(expire.calls.length, 1);

  const confirmation = setup();
  await assert.rejects(confirmation.api.confirmation('cs_test', ''), /valid payment confirmation/);
  confirmation.context.fetch = async (url, options) => {
    assert.ok(url.includes('cs_test/?token=signature'));
    assert.equal(options.referrerPolicy, 'no-referrer');
    return {ok:true, json:async () => ({id:7, status:'pending', total_amount:'277.00', items:[]})};
  };
  assert.equal((await confirmation.api.confirmation('cs_test','signature')).status, 'pending');
  const config = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'store-config.js'), 'utf8'), {window:config});
  assert.equal(config.EuroPadelConfig.checkoutEnabled, false);
  assert.equal(config.EuroPadelConfig.apiOrigin, 'https://europadel-api.onrender.com');
  const publicConfig = {location:{hostname:'www.euro-padel.eu'}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'store-config.js'), 'utf8'), {window:publicConfig});
  assert.equal(publicConfig.EuroPadelConfig.checkoutEnabled, true);
  assert.equal(publicConfig.EuroPadelConfig.maintenance, false);
  assert.equal(publicConfig.EuroPadelConfig.apiOrigin, 'https://europadel-api.onrender.com');
  console.log('PASS: server-only prices, contact mapping, stable retries, private storage, disabled payments, redirects, expiry and verified confirmation.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
