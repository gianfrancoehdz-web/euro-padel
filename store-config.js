// Public configuration only. Never put Stripe keys or database credentials here.
window.EuroPadelConfig = Object.freeze({
  checkoutEnabled: ["localhost", "127.0.0.1", "www.euro-padel.eu", "euro-padel.eu"].includes(window.location?.hostname),
  requireCheckoutReadiness: true,
  // Production checkout also requires live-mode readiness from the backend.
  apiOrigin: ["localhost", "127.0.0.1"].includes(window.location?.hostname)
    ? "http://127.0.0.1:8000" : "https://europadel-api.onrender.com",
  // Populate with real, verified backend variant IDs after loading the catalog.
  // Keys are JSON.stringify([cartItem.name, cartItem.variant || ""]).
  variantIds: Object.freeze({}),
});
