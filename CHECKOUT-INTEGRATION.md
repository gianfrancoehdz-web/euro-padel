# Checkout integration — staged, not enabled

Updated 11 October 2026. The public design and demo remain in place. No deployment or live charge has been performed.

## Configuration

`store-config.js` is public and contains NO secrets. Its defaults keep `checkoutEnabled: false`, `apiOrigin: ""` and an empty variant mapping. Do not enable it just to make the button work.

After loading the real backend catalog in staging, map each cart entry with a verified variant ID. Key format: `JSON.stringify([item.name, item.variant || ""])`. IDs are installation-specific; never assume a product name or the legacy seed implies a numeric ID. Items without a mapping are blocked before contacting the API. This is a transitional bridge; storefront catalog synchronization from the admin remains a separate task.

Use a verified HTTPS API origin; HTTP is accepted only for localhost/127.0.0.1 on a local frontend. Configure exact backend CORS and Stripe return origins for the frontend being tested. Prices shown on the review page are estimates from the existing static catalog; Stripe receives server prices and the 15 EUR shipping line.

## Request/recovery

`store-api.js` sends only variant IDs/quantities and contact/delivery fields to `/api/v1/checkout/start/`. It does not send a chosen price. The form requires a five-digit postal code and Spain; payment details are collected on hosted Stripe Checkout, not this site.

Before the request, a UUID and SHA-256 fingerprints are stored in sessionStorage. Contact details and the signed confirmation token are not persisted. Identical retries in the SAME TAB reuse the UUID. A changed or older-than-23-hours attempt is blocked for reconciliation, rather than risking a new payment after an unknown result. Closing the tab or clearing storage loses this recovery reference; do not restart an uncertain purchase in another tab. A durable cross-tab/customer recovery flow is still needed before launch.

Only an HTTPS redirect on the exact hostname `checkout.stripe.com` is accepted. The cart is preserved on errors, on redirect and on pending payment. It is cleared after verified `paid` only if the order ID matches the attempt and the cart still matches the original checkout. Products added since checkout are preserved.

The confirmation page calls `/api/v1/orders/by-session/<session_id>/?token=<signed-token>` with no credentials, no-store and no-referrer. It polls pending orders for a limited period, then offers a manual retry. It never uses the demo summary as payment proof and never invents an order number on a direct visit. Oversold/payment_review states ask the buyer not to pay again. No delivery date or successful email is invented.

## Verification performed

Run `node tests/catalog.test.cjs`, `node tests/store-api.test.cjs` and `node tests/checkout-flow.test.cjs`. These cover pure logic/contract behavior with a mocked API, not actual browser rendering or Stripe settlement.

The browser tool blocked localhost access during this session, so screenshots and visual/end-to-end browser verification remain pending. Refresh the local checkout to review the extra postal-code field manually. No styling system or product-card dimensions were changed in this phase.

## Gates before enabling

Backend staging, database least-privilege roles, photos storage, transactional email, backups/restore, MFA, exact CORS, real catalog IDs/stock/preorder dates and Stripe sandbox webhook configuration. Test real sandbox payments, interrupted replies, duplicate webhooks, asynchronous payment states, refunds and shipping. Confirm taxes/delivery territories and seller identity/legal terms before live mode. No client-side configuration can substitute for these controls.
# Catalog connection

Browser verification 11 October: initial UI reproduced missing variant IDs.
Versioned cart-store (`VERSION=2`) and script loads in head/helmet address stale
implementations and navigation timing. A cache-bypassed product page then reached
actual Stripe TEST Checkout: 2 × Sabre 289.75 + shipping 15 = EUR594.50, test-only
contact data, no payment submitted. Original cart quantity restored to 2.
Use `python dev-server.py` for local previews with Cache-Control no-store.
Payment/webhook/refund completion is not implied by this redirect verification.

Home, Shop and Product now load `/api/v1/products/` through `store-catalog.js`
when `EuroPadelConfig.apiOrigin` is set. An empty origin preserves the existing
demo; a configured API failure does NOT fall back to demo products. All pages
use live product/variant IDs, prices, descriptions, images and availability.
Inactive products/categories are excluded. Pagination stays on the same API
origin; credentials are not sent. Cart persists variant IDs for checkout.

Activation still requires a running backend, allowed CORS origin, populated
catalog and persistent image storage. Set apiOrigin to its verified HTTPS origin
(HTTP loopback allowed only from a local storefront). Keep checkoutEnabled false
until sandbox verification is complete. Existing demo cart lines without variant
IDs must be removed/re-added from the connected catalog, not guessed by name.
No cloud deployment or real database migration was performed for this change.
Catalog adapter and the three existing frontend Node suites pass; visual browser
and actual admin-to-store end-to-end verification remain pending.

