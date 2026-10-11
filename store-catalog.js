(function () {
  "use strict";
  if (window.EuroPadelCatalog) return;
  const configured = () => Boolean((window.EuroPadelConfig || {}).apiOrigin);
  function origin() {
    const u = new URL(window.EuroPadelConfig.apiOrigin);
    const local = h => ["localhost", "127.0.0.1"].includes(h);
    if (u.username || u.password || u.pathname !== "/" || u.search || u.hash ||
        !(u.protocol === "https:" || u.protocol === "http:" && local(u.hostname) && local(location.hostname)))
      throw new Error("Invalid catalog API configuration.");
    return u.origin;
  }
  function image(value) {
    if (!value) return "";
    const u = new URL(value, origin());
    if (u.username || u.password || !(u.protocol === "https:" || u.protocol === "http:" && u.origin === origin()))
      throw new Error("Invalid catalog image.");
    return u.href;
  }
  function adapt(p) {
    if (!Number.isSafeInteger(p.id) || !p.name || !p.slug) throw new Error("Invalid catalog product.");
    const variants = (p.variants || []).filter(v => v.is_active).map(v => {
      const price = Number(v.price);
      if (!Number.isSafeInteger(v.id) || v.id <= 0 || !Number.isFinite(price) || price < 0 || !Number.isInteger(v.stock) || v.stock < 0)
        throw new Error("Invalid catalog variant.");
      const preorder = p.availability === "preorder" && /^\d{4}-\d{2}-\d{2}$/.test(p.preorder_dispatch_date || "") && p.preorder_dispatch_date >= new Date().toISOString().slice(0, 10);
      return { value: String(v.id), variantId: v.id, label: Object.values(v.attributes || {}).join(" · ") || v.sku,
        price, available: price > 0 && (preorder || p.availability === "stock" && v.stock > 0),
        stock: preorder ? "preorder" : v.stock > 0 ? "in" : "out" };
    });
    const first = variants.find(v => v.available) || variants[0];
    const gallery = (p.gallery || []).map(g => image(g.image)).filter(Boolean);
    if (p.image) gallery.unshift(image(p.image));
    const cat = ({ Raqueta: "Rackets", Ropa: "Apparel", Bolso: "Bags & Gear", Accesorios: "Accessories" })[p.category_detail?.name] || p.category_detail?.name || "Accessories";
    return { productId: p.id, name: p.name, slug: p.slug, brand: "Neuron Padel", cat,
      price: first?.price || 0, available: first?.available || false, stock: first?.stock || "out", new: p.id,
      img: gallery[0] || "", gallery: gallery.length ? gallery : [""], description: p.description || "",
      variant: variants.length ? { label: "Variant", options: variants } : null,
      perks: ["Spain shipping · €15 provisional"], specifications: [], imageScale: 1 };
  }
  async function load() {
    let next = origin() + "/api/v1/products/", rows = [], seen = new Set();
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      while (next) {
        const u = new URL(next, origin());
        if (u.origin !== origin() || u.pathname !== "/api/v1/products/" || seen.has(u.href) || seen.size >= 100)
          throw new Error("Invalid catalog pagination.");
        seen.add(u.href);
        const response = await fetch(u.href, { signal: controller.signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" });
        if (!response.ok) throw new Error("Catalog temporarily unavailable.");
        const data = await response.json(), batch = Array.isArray(data) ? data : data.results;
        if (!Array.isArray(batch)) throw new Error("Invalid catalog response.");
        rows.push(...batch); next = Array.isArray(data) ? null : data.next;
      }
      return rows.filter(p => p.is_active && p.category_detail?.is_active !== false).map(adapt);
    } finally { clearTimeout(timer); }
  }
  window.EuroPadelCatalog = Object.freeze({ configured, load, adapt });
})();
