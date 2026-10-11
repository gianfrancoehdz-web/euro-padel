// BLUWX cart — localStorage-backed store shared across Product / Cart / header.
// No backend. Items keyed by product + variant.
// Idempotent: guarded so re-evaluation (multiple helmet includes) never re-declares.
if (typeof window !== "undefined" && window.CartStore && window.CartStore.VERSION === 2) {
  // already defined — no-op
} else {
(function () {
const KEY = "bluwx_cart_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  // notify any listeners in this tab
  window.dispatchEvent(new CustomEvent("bluwx:cart", { detail: { items } }));
}

// stable line id from product name + chosen variant
function lineId(name, variant) {
  return (name + "|" + (variant || "")).replace(/\s+/g, "_");
}

const CartStore = {
  VERSION: 2,
  KEY,
  get() { return read(); },
  count() { return read().reduce((n, it) => n + it.qty, 0); },
  subtotal() { return read().reduce((s, it) => s + it.price * it.qty, 0); },

  add(item, qty) {
    qty = Math.max(1, qty || 1);
    const items = read();
    const id = lineId(item.name, item.variant);
    const existing = items.find(x => x.id === id);
    if (existing) { existing.qty += qty; existing.productId = item.productId; existing.variantId = item.variantId; existing.price = item.price; existing.img = item.img; }
    else items.push({ id, name: item.name, brand: item.brand, variant: item.variant || "",
                      variantLabel: item.variantLabel || "", productId: item.productId, variantId: item.variantId, price: item.price, img: item.img, qty });
    write(items);
    return read();
  },

  setQty(id, qty) {
    let items = read();
    if (qty <= 0) items = items.filter(x => x.id !== id);
    else { const it = items.find(x => x.id === id); if (it) it.qty = qty; }
    write(items);
    return read();
  },

  remove(id) {
    const items = read().filter(x => x.id !== id);
    write(items);
    return read();
  },

  clear() { write([]); return []; },

  onChange(fn) {
    const h = (e) => fn(e.detail ? e.detail.items : read());
    window.addEventListener("bluwx:cart", h);
    window.addEventListener("storage", (e) => { if (e.key === KEY) fn(read()); });
    return () => window.removeEventListener("bluwx:cart", h);
  },
};

if (typeof module !== "undefined") module.exports = { CartStore };
if (typeof window !== "undefined") window.CartStore = CartStore;
})();
}
