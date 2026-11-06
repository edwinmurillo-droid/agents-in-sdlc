# Tab Commander hub release package

This package is prepared, not deployed. Nothing in this repository publishes it. Do not merge or copy it to `ai-general-stuffs` until Chief of Staff’s review of the landing page is done.

The revised demo video is not in this package. It stays in `landing/video/` until that cut is accepted. The page does not embed it.

## Destination

Replace the contents of `docs/hub/` in `edwinmurillo-droid/ai-general-stuffs`. That folder is what GitHub Pages serves at:

https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/

Do not enable GitHub Pages on `agents-in-sdlc`. Do not edit `.github/workflows/pages.yml` in the workshop repo. Do not replace these files in `ai-general-stuffs`:

- `docs/index.html`
- `docs/privacy.html`
- `docs/signs-moving.mp4`

`docs/privacy.html` is already live and returns 200 at:

https://edwinmurillo-droid.github.io/ai-general-stuffs/privacy.html

## What is there today

`docs/hub/index.html` is a short product index (shop cards, the store link, TikTok). Its footer uses a relative `privacy.html` link. From `/hub/` that request becomes `/hub/privacy.html`, which returns 404. The new `index.html` uses the absolute policy URL above.

Replacing `docs/hub/index.html` removes that short index from `/hub/`. The shop and TikTok links are not part of this package.

## Files that belong in `docs/hub/`

| Package path | Replaces or adds |
| --- | --- |
| `docs/hub/index.html` | replaces the current hub index |
| `docs/hub/styles.css` | add |
| `docs/hub/main.js` | add |
| `docs/hub/config.js` | add |
| `docs/hub/favicon.svg` | add |
| `docs/hub/og.png` | add |
| `docs/hub/robots.txt` | add (served as `/hub/robots.txt`, not the site root) |
| `docs/hub/sitemap.xml` | add (served as `/hub/sitemap.xml`) |
| `docs/hub/fonts/fraunces-latin.woff2` | add |
| `docs/hub/fonts/outfit-latin.woff2` | add |
| `docs/hub/fonts/OFL-fraunces.txt` | add |
| `docs/hub/fonts/OFL-outfit.txt` | add |

Canonical, Open Graph, Twitter image, JSON-LD, and the sitemap already use `https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/`.

`config.js` keeps `PRO_CHECKOUT_URL` on `https://example.com/tab-commander-pro` on purpose. That host is not a checkout. The Pro button stays on the email waitlist. The $3 and $29 figures are suggestions, not an approved paid launch. Do not create a payment account.

`SITE_URL` is the hub address above, not a placeholder. Canonical and share tags already use it. They will 404 for `og.png` until this package replaces `docs/hub/`.

## Chrome Web Store

The live listing already points here. No extension package resubmission is required to publish the website.

- Support / website: `https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/`
- Privacy policy: `https://edwinmurillo-droid.github.io/ai-general-stuffs/privacy.html`

Replacing `docs/hub/` makes that existing website link show this page. Do not upload a new extension zip, and do not change the listing URLs before this page is actually at the hub. After it is there, the listing links are already correct.

## After someone deploys

These should return 200:

- https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/
- https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/styles.css
- https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/og.png
- https://edwinmurillo-droid.github.io/ai-general-stuffs/privacy.html

The hub footer “Privacy policy” link must be the absolute `/privacy.html` URL, not `privacy.html`. The in-page `#privacy` note is additional and does not replace that policy.

This preparation step does not deploy, so those hub asset URLs 404 until the other repository is updated. The policy URL already returns 200.
