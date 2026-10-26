// Pure component-logic checks; not a browser/rendering test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function component(file, api) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  const storage = new Map();
  const context = {URLSearchParams, location:{search:'', href:''},
    localStorage:{removeItem:() => {}},
    sessionStorage:{getItem:key => storage.get(key) || null, setItem:(key,value) => storage.set(key,value), removeItem:key => storage.delete(key)},
    window:{EuroPadelAPI:api}, setTimeout:() => 1, clearTimeout:() => {},
    DCLogic:class {setState(value) {Object.assign(this.state, typeof value === 'function' ? value(this.state) : value);}},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'shipping-countries.js'), 'utf8'), context);
  vm.runInContext(script + '\nthis.instance = new Component();', context);
  return {instance:context.instance, context, storage};
}
async function run() {
  const checkout = component('Checkout.dc.html', {enabled:() => false}).instance;
  checkout.state.items = [{name:'Ronin', qty:1, price:262}];
  Object.assign(checkout.state, {email:'buyer@example.com', firstName:'Example', lastName:'Buyer', city:'Madrid',
    address:'Example 1', phone:'+34 600 123 456'});
  assert.equal(checkout._validateContact(), false);
  assert.ok(checkout.state.errors.postalCode);
  checkout.state.postalCode = '28001';
  assert.equal(checkout._validateContact(), true);
  checkout.state.country = 'France';
  assert.equal(checkout._validateContact(), true);
  checkout.state.country = 'Italy';
  assert.equal(checkout._validateContact(), true);
  checkout.state.country = 'GB';
  assert.equal(checkout._validateContact(), false);
  checkout.state.country = 'Spain';
  checkout.renderVals().onPromoInput({target:{value:' carchia5 '}});
  checkout.renderVals().applyPromo();
  assert.equal(checkout.state.promoCode, 'CARCHIA5');
  assert.equal(checkout.renderVals().hasDiscount, true);
  assert.equal(checkout.renderVals().discountLabel, '€13,10');
  assert.equal(checkout.renderVals().shippingLabel, '€15,00');
  assert.equal(checkout.renderVals().totalLabel, '€263,90');
  checkout.renderVals().onPromoInput({target:{value:'FAKE'}});
  checkout.renderVals().applyPromo();
  assert.equal(checkout.renderVals().hasDiscount, false);
  checkout.renderVals().goStep2();
  assert.equal(checkout.state.step, 1);
  assert.equal(checkout.renderVals().checkoutUnavailable, true);
  await checkout.renderVals().payNow();
  assert.match(checkout.state.paymentError, /not open yet/);
  assert.equal(checkout.state.items.length, 1);
  const failed = component('Checkout.dc.html', {enabled:() => true, start:async () => {throw new Error('Retry same details');}});
  Object.assign(failed.instance.state, checkout.state);
  await failed.instance.renderVals().payNow();
  assert.equal(failed.instance.state.paying, false);
  assert.equal(failed.instance.renderVals().paymentError, 'Retry same details');
  assert.equal(failed.context.location.href, '');
  assert.equal(failed.instance.state.items.length, 1);

  const direct = component('confirmation.dc.html', {enabled:() => false});
  direct.instance.componentDidMount();
  assert.equal(direct.instance.renderVals().orderNumber, '—');
  assert.equal(direct.instance.renderVals().showCheck, false); // No invented order on direct visits.
  direct.storage.set('europadel_demo_order', JSON.stringify({number:'EP-DEMO-OLD', total:16}));
  direct.instance.componentDidMount();
  assert.equal(direct.instance.renderVals().showCheck, false);
  assert.equal(direct.instance.renderVals().heading, 'No verified order');
  assert.equal(direct.storage.has('europadel_demo_order'), false);
  let completed = 0;
  const verified = component('confirmation.dc.html', {enabled:() => true,
    confirmation:async () => ({id:7, status:'pending', total_amount:'277.00', items:[{quantity:1}]}),
    complete:async () => {completed++;}});
  verified.instance._mounted = true;
  verified.instance.state.real = true;
  await verified.instance._load();
  assert.equal(verified.instance.renderVals().showCheck, false);
  assert.match(verified.instance.renderVals().message, /pending/);
  assert.equal(completed, 0);
  verified.context.window.EuroPadelAPI.confirmation = async () => ({id:7, status:'paid', total_amount:'277.00', items:[{quantity:1}]});
  await verified.instance._load();
  assert.equal(verified.instance.renderVals().showCheck, true);
  assert.equal(verified.instance.renderVals().heading, 'Payment confirmed');
  assert.equal(verified.instance.renderVals().totalLabel, '€277,00');
  assert.equal(completed, 1);
  verified.context.window.EuroPadelAPI.confirmation = async () => ({id:7, status:'oversold', total_amount:'277.00', items:[{quantity:1}]});
  await verified.instance._load();
  assert.equal(verified.instance.renderVals().showCheck, false);
  assert.match(verified.instance.renderVals().message, /do not pay again/);
  assert.equal(completed, 1);
  console.log('PASS: postal code, EU validation, recoverable checkout errors, no invented orders, pending/paid/review confirmation states.');
}
run().catch(error => {console.error(error); process.exitCode = 1;});
