const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

function component(file, hash = '') {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  const added = [];
  const context = {
    DCLogic: class {
      props = {};
      setState(value) { Object.assign(this.state, typeof value === 'function' ? value(this.state) : value); }
    },
    location: { hash, search: '' }, URLSearchParams,
    window: { CartStore: { count: () => 0, onChange: () => () => {}, add: (...args) => added.push(args) } },
    setTimeout: () => 1, clearTimeout: () => {},
  };
  vm.createContext(context);
  vm.runInContext(script + '\nthis.component = new Component();', context);
  return { instance: context.component, added };
}

const product = component('Product.dc.html', '#sabre');
product.instance.componentDidMount();
let values = product.instance.renderVals();
assert.equal(values.name, 'SABRE V1');
assert.equal(values.priceLabel, '€289,75');
assert.equal(values.isProvisionalPrice, false);
assert.equal(values.hasVariants, false);
assert.equal(values.gallery.length, 6);
assert.equal(values.specifications.length, 10);
values.gallery[5].select();
assert.equal(product.instance.renderVals().activeImg, 'uploads/np-sabre-v1-6.png');
values.addToCart();
assert.equal(product.added[0][0].name, 'SABRE V1');
assert.equal(product.added[0][0].price, 289.75);
for (const image of values.gallery) {
  const imageFile = path.join(root, image.img);
  assert.ok(fs.statSync(imageFile).size > 10000);
  assert.equal(fs.readFileSync(imageFile).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
}
const shop = component('Shop.dc.html').instance;
let listing = shop.renderVals();
assert.equal(listing.resultCount, 8);
assert.equal(listing.shownProducts.find(p => p.name === 'SABRE V1').href, 'Product.dc.html#sabre');
assert.equal(listing.categoriesUI.find(c => c.name === 'Rackets').count, 3);
shop.state.cats = ['Rackets'];
assert.equal(shop.renderVals().resultCount, 3);
shop.state.inStock = true;
assert.ok(!shop.renderVals().shownProducts.some(p => p.name === 'SABRE V1'));
const cart = component('Cart.dc.html').instance;
cart.state.items = [{ ...product.added[0][0], qty: 1 }];
assert.equal(cart.renderVals().items[0].href, 'Product.dc.html#sabre');
assert.equal(cart.renderVals().totalLabel, '€304,75');
const checkout = component('Checkout.dc.html').instance;
checkout.state.items = cart.state.items;
assert.equal(checkout.renderVals().totalLabel, '€304,75');
const home = component('index.dc.html').instance.renderVals();
assert.ok(home.shopRows[0].items.some(p => p.name === 'SABRE V1' && p.price === '€289,75'));
// Compare actual body height/alignment instead of the image element dimensions.
for (const cardHeight of [253, 382, 533]) {
  for (const card of home.shopRows[0].items.filter(p => p.code === 'RACKET')) {
    const bounds = card.bodyBounds;
    const imageHeightPercent = Number(card.imageStyle.match(/height:([\d.]+)%/)[1]);
    const imageTopPercent = Number(card.imageStyle.match(/top:([-\d.]+)%/)[1]);
    const visibleTop = (imageTopPercent + imageHeightPercent * bounds.top / bounds.imageHeight) / 100 * cardHeight;
    const visibleBottom = (imageTopPercent + imageHeightPercent * bounds.bottom / bounds.imageHeight) / 100 * cardHeight;
    assert.ok(Math.abs(visibleTop - cardHeight * .14) < .001);
    assert.ok(Math.abs(visibleBottom - cardHeight * .875) < .001);
    assert.match(card.imageStyle, /width:auto/); // Never stretch the source aspect ratio.
  }
}
for (const [hash, name, price, photoCount, weight, firstImage, cardScale] of [
  ['#ronin', 'RONIN V1 2026', '€262,00', 10, '360–375 g', 'uploads/np-ronin-official-1.jpg', 1.46],
  ['#ronin-sakura', 'RONIN V1 Sakura Edition', '€295,00', 5, '350–360 g', 'uploads/np-sakura-official-1.jpg', 1],
]) {
  const racket = component('Product.dc.html', hash);
  racket.instance.componentDidMount();
  const record = racket.instance.renderVals();
  assert.equal(record.name, name);
  assert.equal(record.priceLabel, price);
  assert.equal(record.gallery.length, photoCount);
  assert.equal(record.activeImg, firstImage);
  assert.equal(record.specifications.find(s => s.label === 'Weight').value, weight);
  assert.equal(record.specifications.find(s => s.label === 'Shape').value, 'Hybrid teardrop');
  record.addToCart();
  assert.equal(racket.added[0][0].name, name);
  assert.equal(racket.added[0][0].img, firstImage);
  const homeCard = home.shopRows[0].items.find(p => p.name === name);
  const shopCard = listing.shownProducts.find(p => p.name === name);
  assert.equal(homeCard.img, firstImage);
  assert.equal(shopCard.img, firstImage);
  assert.equal(homeCard.imageScale, cardScale);
  assert.equal(shopCard.imageScale, cardScale);
  for (const image of record.gallery) {
    const data = fs.readFileSync(path.join(root, image.img));
    assert.ok(data.length > 10000);
    assert.equal(data.subarray(0, 2).toString('hex'), 'ffd8');
  }
  record.gallery[1].select();
  assert.equal(racket.instance.renderVals().activeImageScale, 1, 'Do not enlarge close-up images');
}
const variantSwitch = component('Product.dc.html', '#ronin');
variantSwitch.instance.componentDidMount();
variantSwitch.instance.renderVals().variantOptions.find(o => o.label === 'Sakura').select();
assert.equal(variantSwitch.instance.renderVals().name, 'RONIN V1 Sakura Edition');
assert.match(variantSwitch.instance.renderVals().description, /lighter/i);
assert.equal(variantSwitch.instance.renderVals().gallery.length, 5);
variantSwitch.instance.renderVals().addToCart();
cart.state.items = [{ ...variantSwitch.added[0][0], qty: 1 }];
assert.equal(cart.renderVals().items[0].href, 'Product.dc.html#ronin-sakura');
assert.equal(cart.renderVals().items[0].imageScale, 1);
assert.equal(cart.renderVals().totalLabel, '€310,00');
for (const file of fs.readdirSync(root).filter(name => name.endsWith('.dc.html'))) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(!/warranty|\bguarantee\b|garant[ií](?:a|e)/i.test(html), `Warranty copy in ${file}`);
}
console.log('PASS: all three rackets, official galleries, variant descriptions/specs, thumbnail scale consistency, filters, prices, demo cart/checkout and storefront warranty scan.');
