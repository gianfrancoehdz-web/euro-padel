(function () {
  "use strict";
  if (window.EuroPadelAPI) return;
  const KEY = "europadel_checkout_attempt_v1";
  const config = () => window.EuroPadelConfig || {};
  const enabled = () => config().checkoutEnabled === true;
  function origin() {
    const url = new URL(config().apiOrigin);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    const localPage = ["localhost", "127.0.0.1"].includes(location.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
        (url.protocol !== "https:" && !(url.protocol === "http:" && local && localPage))) {
      throw new Error("The store API is not configured securely.");
    }
    return url.origin;
  }
  async function digest(value) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
    return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
  }
  function cartShape(items) {
    return items.map(item => [item.name, item.variant || "", item.qty]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  function payload(items, contact) {
    if (!items.length) throw new Error("Your cart is empty.");
    const country = window.EuroPadelShipping && window.EuroPadelShipping.countryCode(contact.country);
    if (!country) throw new Error("Select a country in the European Union.");
    return {
      email: contact.email.trim().toLowerCase(),
      promo_code: String(contact.promoCode || "").trim().toUpperCase(),
      items: items.map(item => {
        const id = item.variantId || (config().variantIds || {})[JSON.stringify([item.name, item.variant || ""])];
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error("A cart item is not connected to the current catalog. Remove it from your cart and add it again from the shop. No payment was started.");
        if (!Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 20) throw new Error("Choose between 1 and 20 units per item.");
        return { product_variant_id: id, quantity: item.qty };
      }).sort((a, b) => a.product_variant_id - b.product_variant_id),
      delivery: {
        first_name: contact.firstName.trim(), last_name: contact.lastName.trim(), country,
        city: contact.city.trim(), address: contact.address.trim(), postal_code: contact.postalCode.trim(),
        phone: contact.phone.trim().replace(/[\s().-]/g, ""),
      },
      success_url: location.origin + "/confirmation.dc.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: location.origin + "/Cart.dc.html",
    };
  }
  async function request(path, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(origin() + "/api/v1/" + path, {
        ...options, signal: controller.signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Too many attempts. Wait a minute, then retry the same checkout.");
        throw new Error(response.status >= 500 ? "Payment status could not be verified. Retry with the same details; do not start another purchase." :
          "The request could not be accepted. Check the details or contact the store before starting another purchase.");
      }
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError" || error instanceof TypeError) {
        throw new Error("Connection interrupted. Retry with the same details; your payment status is not yet known.");
      }
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function start(items, contact) {
    if (!enabled()) throw new Error("Online payments are not enabled yet.");
    origin(); // Reject invalid configuration before creating an attempt.
    if (config().requireCheckoutReadiness) {
      const readiness = await request("checkout/start/", { method: "GET" });
      if (readiness.available !== true) throw new Error("Stripe checkout is not configured yet. No payment or order was created.");
      if (["localhost", "127.0.0.1"].includes(location.hostname) && readiness.mode !== "test")
        throw new Error("Local checkout only accepts Stripe test mode.");
    }
    const body = payload(items, contact);
    const hash = await digest(body);
    const cartHash = await digest(cartShape(items));
    let attempt;
    try { attempt = JSON.parse(sessionStorage.getItem(KEY) || "null"); }
    catch (_) { throw new Error("Checkout recovery is unavailable. Contact the store before proceeding."); }
    if (attempt && (attempt.hash !== hash || Date.now() - attempt.createdAt > 23 * 3600000)) {
      throw new Error("A previous checkout needs recovery. Use its original details or contact the store; do not start a second payment.");
    }
    if (!attempt) {
      attempt = { id: crypto.randomUUID(), hash, cartHash, createdAt: Date.now() };
      // Persist only UUID and hashes, never contact details or the confirmation token.
      try { sessionStorage.setItem(KEY, JSON.stringify(attempt)); }
      catch (_) { throw new Error("Enable session storage to safely recover checkout attempts."); }
    }
    const result = await request("checkout/start/", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, request_id: attempt.id }) });
    const target = new URL(result.checkout_url);
    if (target.protocol !== "https:" || target.hostname !== "checkout.stripe.com" || target.username || target.password) {
      throw new Error("The payment redirect could not be verified. Contact the store.");
    }
    if (!Number.isSafeInteger(result.order_id)) throw new Error("The order reference could not be verified.");
    attempt.orderId = result.order_id;
    sessionStorage.setItem(KEY, JSON.stringify(attempt));
    return { ...result, checkout_url: target.href };
  }
  async function confirmation(session, token) {
    if (!enabled() || !session || !token) throw new Error("A valid payment confirmation link is required.");
    const order = await request("orders/by-session/" + encodeURIComponent(session) + "/?token=" + encodeURIComponent(token), {});
    if (!Number.isSafeInteger(order.id) || !Array.isArray(order.items) || !Number.isFinite(Number(order.total_amount)) ||
        !["pending", "paid", "oversold", "cancelled", "refunded", "payment_review"].includes(order.status) ||
        order.items.some(item => !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
      throw new Error("The order response could not be verified.");
    }
    return order;
  }
  async function complete(order) {
    if (order.status !== "paid") return;
    const attempt = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!attempt || attempt.orderId !== order.id) return;
    // Preserve products added after the original checkout.
    if (window.CartStore && attempt.cartHash === await digest(cartShape(window.CartStore.get()))) window.CartStore.clear();
    sessionStorage.removeItem(KEY);
  }
  window.EuroPadelAPI = { enabled, start, confirmation, complete };
})();
