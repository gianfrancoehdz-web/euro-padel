# Euro Padel — consent and privacy

Updated 27 October 2026. Release prepared; publication state is recorded in the root project report.

Release preparation: full PostgreSQL backend suite 356/356 passes, four frontend
suites pass. Checkout uses the backend readiness capability to roll out email
verification without breaking purchases against an older backend; new backend
still requires proof server-side. The invalid-format tax identifier from the PDF
has been omitted from public Terms/Privacy, pending correction, not guessed or
published as valid. Earlier draft-state notes are historical where superseded.

Latest user correction: no commercial guarantee is offered. Returns and shared
footer now use “Returns & product issues”; removed additional/manufacturer guarantee
explanations and the separate guarantee-duration promotion. Terms retain mandatory
statutory conformity rights under “Statutory rights for faulty goods”. Earlier
photo-reference descriptions below are historical and superseded by this change.
Privacy suite passes; old guarantee heading/anchor search is clear. No new visual
review, commit, push or deployment.

## Seller document update — 27 October

Additional photo reference: expanded Terms statutory conformity section and added
Returns.dc.html. Explains EU minimum two years, three years for new goods under
Spanish consumer law, remedies and the separate withdrawal process. Shared legal
footer and home Shipping & returns now link to help. No photo upload, third-party
badge, commercial guarantee extension or backend refund activation. The pending
tax identifier is not resolved by that photo. Changes remain local.

The user supplied the four-page Italian sales/privacy/cookie PDF as the business
source. Read all pages and rendered them for visual review. Public seller identity,
address and contact are now static in Privacy.dc.html and Terms.dc.html; no
JavaScript is required to display them. Removed the previous privacy-config.js
placeholder and draft contact warning. Updated Cookies date and contact.

Terms include current .eu domain, applicable VAT-inclusive prices, shipping 15 EUR,
the supplied estimate of 2–5 business days and 48-hour service response, withdrawal
information and optional form. Carrier examples are not contractual selections;
payment methods are those actually displayed by Stripe. No payment method, tracker,
newsletter or new territory was activated from statements in the PDF.

Source clauses adjusted against official references: withdrawal refund timing and
reasonable inspection, consumer statutory conformity rights, no blanket one-year
rule based on a tax number, no routine ID-copy requirement, and six-year commercial
document retention rather than six years for every kind of data. International
provider links are informational; account-specific DPAs/transfer safeguards remain
an operational verification, not a claim that contracts were signed in this task.

Publication requires a correction/confirmation: the supplied tax identifier starts
with Z and has ten characters, inconsistent with the current nine-character NIE
format documented by AEAT. Kept the literal source value in local drafts, did not
guess a replacement. Asked the user to confirm the public business identifier.
No source PDF or personal ID image uploaded to hosting/GitHub.

Four Node suites pass again and all four local legal/checkout URLs return HTTP200.
New visual browser review could not be performed: browser inventory unavailable
this session. The local privacy preview was requested in Codex (queued). Prior
26 October desktop/mobile consent evidence remains historical. No commit/push/deploy.

## What is implemented

- Shared banner and native accessible preference dialog on existing HTML pages.
  Accept optional and Reject optional have the same treatment. No preselected
  optional permission, scrolling consent or cookie wall.
- Essential cart/checkout storage remains available after refusal. A first-party
  localStorage receipt holds only version, necessary/media flags and timestamps.
  Consent expires after 180 days; bump VERSION when optional purposes/providers
  materially change. Existing expired data is ignored, not automatically removed.
- The footer reopens preferences. Closing with Escape does not save. Cross-tab
  storage events refresh settings. Storage failures use a page-only choice and
  announce that it was not persisted. No backend consent logging is introduced.
- Existing video iframes use data-ep-media-src, never an initial src. The controller
  accepts only HTTPS YouTube embed paths, changes the host to youtube-nocookie.com
  and loads only after media consent and opening a video. Withdrawal removes src.
  Remote YouTube thumbnail replaced by a local illustration. This does not remove
  third-party cookies already set outside our origin.
- Fonts and pinned React/ReactDOM/Babel assets are served locally. Downloaded
  runtime files match the SHA-384 values in the existing generated support.js.
  privacy-resources.js uses its supported resource map; support.js is unchanged.
  MIT/SIL license texts are included beside the local assets.
- Cookies.dc.html describes local/session storage, lifetimes, Stripe and external
  media. Privacy.dc.html is a draft awaiting confirmed controller/contact details,
  provider transfer safeguards. Public business details were supplied on 27 October;
  the tax identifier still needs correction before publication. Do not put private
  ID documents or credentials in the site.
- Checkout links the privacy notice. Optional media consent is independent of any
  purchase or terms acceptance. No analytics or marketing tags were added.

## Verification performed

Node suites: privacy, store-api, checkout-flow and store-catalog pass. Privacy tests
cover default denial, explicit consent, refusal preserving the basket, expiry,
invalid/versioned records, blocked storage including withdrawal with write failure,
DC page coverage, unloaded initial iframe sources and local assets.

Browser checks: local catalog read via GET-only preview proxy; default unchecked
media, rejection, reopening, granular save, iframe src absent before consent,
youtube-nocookie src after consent, src removed on withdrawal, Escape closure;
desktop and a 390px iframe viewport reviewed. DOM shows local stylesheet/runtime
URLs. This is not a full network/cookie audit or a physical-phone test. No order,
payment or external email was created. Server preview only overrides its own local
config response and proxies public GET catalog data, never POST checkout.

Screenshots in project tmp: privacy-banner-desktop-20261026.png,
privacy-preferences-desktop-20261026.png, privacy-mobile-390-20261026.png.

## Before publication

1. Confirm/correct the tax identifier noted above. The user has supplied seller
   name, address, contact and commercial retention period; mailbox delivery not tested.
2. Verify relevant provider agreements/international transfer safeguards and
   operational retention procedures; no full compliance certification is claimed.
3. Review scope if new tags, embeds or analytics are introduced. A new tracker is
   not automatically gated by this media-only implementation: integrate it before
   loading and revise purposes/version.
4. Commit only this work, preserving pre-existing Cloudflare changes; publish
   separately, then verify the deployed origin, consent persistence, rejection,
   withdrawal and checkout. Preview consent does not carry across browser origins.

Sources consulted: [AEPD guide](https://www.aepd.es/guias/guia-cookies.pdf),
[EDPB cookie banner taskforce report](https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf).
These inform the implementation; no certification or legal approval is claimed.

Additional official sources consulted on 27 October:
[Consumer law, latest consolidated text](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555),
[Commercial Code, Article 30](https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627),
[AEPD identity verification](https://www.aepd.es/preguntas-frecuentes/1-tus-derechos/3-identificacion-con-dni/FAQ-0108-para-el-ejercicio-de-estos-derechos-es-necesario-facilitar-la-copia-del-dni),
[AEAT tax identifier format](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/guia-practica-cumplimentacion-modelo-censal-036/anexos/anexo-01-solicitud-nif-documentacion-aportar/informacion-sobre-numero-identificacion-fiscal/composicion-nif/personas-fisicas.html).
