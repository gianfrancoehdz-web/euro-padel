# Neuron Padel catalogue sources

Updated: 9 October 2026.

## SABRE V1

- Official source: https://www.neuronpadel.com/products/neuronpadel-sabre-v1
- Product information was checked against the manufacturer's page. Description is paraphrased; specifications retain factual values.
- Six official gallery images saved as `uploads/np-sabre-v1-1.png` through `np-sabre-v1-6.png` from the page's `/cdn/shop/files/` URLs.
- Euro Padel provisional price: EUR 285, explicitly requested by the user; not a currency conversion of the manufacturer's price.
- Manufacturer lists pre-order availability. Do not promise their dispatch/delivery times on Euro Padel or treat this as confirmed local inventory.
- Product, gallery and cart remain a visual demo. Provisional shipping: EUR 15 per order, not per item. Backend payment integration remains separate and disabled.
- User requested removal of warranty promotion across the storefront. This is a content edit, not a statement changing statutory consumer rights or a substitute for future legal terms.
- Backend security work and untracked `vercel.json` are unrelated pending changes. No commit/push/deploy requested for this catalogue update.

Run local catalogue regression tests: `node tests/catalog.test.cjs`.

## RONIN V1 / Sakura Edition

- Official pages: https://www.neuronpadel.com/products/neuronpadel-ronin-v1 and https://www.neuronpadel.com/products/neuronpadel-ronin-v1-sakura-edition-2026
- Ten Ronin images imported as `uploads/np-ronin-official-1.jpg` through `-10.jpg`; five Sakura images as `uploads/np-sakura-official-1.jpg` through `-5.jpg`. Assets come from each page's public Shopify product gallery. Older files are preserved, not overwritten/deleted.
- Both descriptions are paraphrased. Corrected the old diamond/soft-core claim: these models are hybrid teardrop, mid balance. Ronin: 360–375 g, Kevlar-reinforced frame and Multi-EVA. Sakura: 350–360 g, Speed Frame and Balance EVA.
- Sakura's FAQ repeats generic Ronin weight/core information that conflicts with its dedicated materials/specification sections; the local Sakura record follows the model-specific sections, not the copied FAQ.
- Model selector now changes name, description, specification list and gallery together. Prices remain EUR 262 / EUR 295. No manufacturer warranty/shipping claims were imported. Do not infer Euro Padel inventory from the manufacturer's stock status.
- Home/Shop 3:4 card scales: Ronin 1.46, Sakura 1, Sabre 1.12, compensating for photo aspect ratio and empty margins. Square detail/cart previews use Ronin 1.07, Sakura/Sabre 1; close-ups are not enlarged. This avoids applying a card-size correction to all gallery shots. Native photo proportions are preserved.
- Local functional tests verify consistent media/scale settings and catalogue-to-cart data. Browser automation remains unavailable, so rendered comparison on desktop/mobile still needs user visual confirmation in localhost.

## Home thumbnail alignment follow-up

- Replaced Home's approximate transform scales with source-photo body bounds: Sabre y137–1001 /1126 px, Ronin y126–1059 /1200 px, Sakura y170–1668 /1800 px.
- Head top and handle end share the same vertical interval: 14%–87.5% of each 3:4 card. Width stays automatic, preserving the real proportions; the strap/shadow are not used to measure racket size. Different head shapes are not stretched to become identical.
- Tests calculate visible body top/bottom at three card heights and verify common alignment. This is geometry verification, not a claimed browser screenshot.
- Both the browser capture runtime and the Windows screenshot runtime failed to initialize in this turn. The user's supplied before screenshot was inspected; no after screenshot has been captured yet. Do not claim visual confirmation until a new screenshot is available.
