const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'privacy.js'),'utf8');
function setup(blocked=false){
 let now=Date.now();const values=new Map([['bluwx_cart_v1','existing-basket']]);
 const window={dispatchEvent(){}};
 const context={window,document:{readyState:'loading',addEventListener(){}},CustomEvent:class{},
  Date:class extends Date{static now(){return now;}},localStorage:{
   getItem(k){if(blocked===true)throw Error('blocked');return values.get(k)||null;},
   setItem(k,v){if(blocked)throw Error('blocked');values.set(k,v);}
  }};
 vm.runInNewContext(source,context);
 return {api:window.EuroPadelPrivacy,values,advance:ms=>{now+=ms;}};
}
const test=setup();
assert.equal(test.api.read(),null);assert.equal(test.api.allowsMedia(),false);
test.api.save(true);assert.equal(test.api.allowsMedia(),true);
let saved=JSON.parse(test.values.get(test.api.KEY));
assert.deepEqual(Object.keys(saved).sort(),['expiresAt','media','necessary','savedAt','version']);
test.api.save(false);assert.equal(test.api.allowsMedia(),false);
assert.equal(test.values.get('bluwx_cart_v1'),'existing-basket');
test.api.save(true);test.advance(180*86400000+1);
assert.equal(test.api.read(),null);assert.equal(test.api.allowsMedia(),false);
for(const bad of ['broken','null','{}',JSON.stringify({...saved,version:2}),JSON.stringify({...saved,media:'true'})]){
 const fresh=setup();fresh.values.set(fresh.api.KEY,bad);assert.equal(fresh.api.read(),null);
}
const unavailable=setup(true);unavailable.api.save(true);assert.equal(unavailable.api.allowsMedia(),true);
unavailable.api.save(false);assert.equal(unavailable.api.allowsMedia(),false);
const quota=setup('write');quota.values.set(quota.api.KEY,JSON.stringify(saved));
assert.equal(quota.api.allowsMedia(),true);quota.api.save(false);assert.equal(quota.api.allowsMedia(),false);
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.dc.html'))){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 assert.match(html,/src="\.\/privacy.js"/,name);
 assert.doesNotMatch(html,/<link[^>]+fonts\.(googleapis|gstatic)\.com/,name);
 assert.doesNotMatch(html,/<iframe\s+src=/,name);
 assert.doesNotMatch(html,/https:\/\/img.youtube.com/,name);
}
const resourceContext={window:{__resources:{existing:'kept'}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'privacy-resources.js'),'utf8'),resourceContext);
assert.equal(resourceContext.window.__resources.existing,'kept');
for(const [url,target] of Object.entries(resourceContext.window.__resources)){
 if(url==='existing')continue;
 assert.ok(target.startsWith('./assets/vendor/'));assert.ok(fs.existsSync(path.join(root,target)));
}
assert.doesNotMatch(fs.readFileSync(path.join(root,'assets/fonts/fonts.css'),'utf8'),/https?:\/\//);
console.log('PASS: opt-in only, rejection preserves basket, 180-day expiry, malformed/versioned consent, blocked storage, all DC pages gated, local runtime and fonts.');
