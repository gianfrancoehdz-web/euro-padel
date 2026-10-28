const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'Cart.dc.html'), 'utf8');
const helmet = html.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
assert.match(helmet, /<script src="\.\/store-config\.js"><\/script>/);
const logic = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
for (const hostname of ['www.euro-padel.eu', 'euro-padel.eu', '127.0.0.1']) {
  const context = {window: {location: {hostname}}, location: {href: ''}, DCLogic: class {}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'store-config.js'), 'utf8'), context);
  vm.runInContext(logic + '\nnew Component().renderVals().checkout();', context);
  assert.equal(context.location.href, 'Checkout.dc.html', hostname);
}
console.log('PASS: cart loads configuration and Checkout navigates on both official hosts and localhost.');
