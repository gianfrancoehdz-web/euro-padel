const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const key = 'bluwx_cart_v1';
let saved = JSON.stringify([{id:'SABRE|1', name:'SABRE', variant:'1', qty:2, price:285}]);
const context = {window:{CartStore:{add:()=>{throw new Error('Old implementation');}}, dispatchEvent:()=>{}},
  localStorage:{getItem:()=>saved, setItem:(_,value)=>{saved=value;}}, CustomEvent:class{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../cart-store.js'),'utf8'), context);
assert.equal(context.window.CartStore.VERSION,2);
context.window.CartStore.add({name:'SABRE',variant:'1',productId:10,variantId:42,price:289.75},1);
const line=JSON.parse(saved)[0];
assert.equal(line.productId,10);assert.equal(line.variantId,42);assert.equal(line.qty,3);
assert.equal(line.price,289.75);
console.log('PASS: old cart implementation upgraded; real product and variant IDs persisted.');
