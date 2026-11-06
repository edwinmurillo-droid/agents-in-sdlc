# Tab Commander landing page

Static marketing site for the [Tab Commander](https://chromewebstore.google.com/detail/bkeacpglbifipmmkofcjkoligeampnmc) Chrome extension (v1.0.0). No build step is required. The page does not create a payment account or charge a card.

## Preview locally

From the repository root:

```bash
cd landing
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/>.

## Pro checkout link

`PRO_CHECKOUT_URL` lives in [`config.js`](config.js). The default is a placeholder (`https://example.com/tab-commander-pro`).

While the value is a placeholder (`example.com`, `example.org`, `*.invalid`, localhost, or a host containing `placeholder`), **Get Pro** stays on this page and opens an email to Edwin.Murillo@allin1sdm.com. Nothing is stored on the site.

When you have a real HTTPS checkout page that offers both the monthly and lifetime plans, set:

```js
PRO_CHECKOUT_URL: "https://your-checkout.example/tab-commander"
```

Or, from the `landing` directory, before you deploy:

```bash
PRO_CHECKOUT_URL="https://your-checkout.example/tab-commander" \
SITE_URL="https://your-domain.example/" \
node scripts/apply-env.js
```

`SITE_URL` must be the public origin of this folder, with a trailing slash (include `/landing/` if that is the path). It rewrites the canonical URL, Open Graph and Twitter image URLs, `robots.txt`, and `sitemap.xml`.

Do not put payment secrets in this project. The checkout URL is a public link.

Suggested Pro prices, shown on the page and not charged here: **$3 per month** or **$29 once**.

## Release destination

The public page is meant to replace the product hub, not a new site:

`https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/`

`agents-in-sdlc` does not have GitHub Pages (`has_pages` is false). `https://edwinmurillo-droid.github.io/agents-in-sdlc/landing/` returns 404. Do not turn on Pages for this workshop repository, and do not change `.github/workflows/pages.yml`.

The hub is published from `docs/` in `edwinmurillo-droid/ai-general-stuffs`. Today `docs/hub/index.html` is a short product index. Its footer links to `privacy.html`, which the browser resolves to `/hub/privacy.html` and that URL 404s. The policy that returns 200 is:

`https://edwinmurillo-droid.github.io/ai-general-stuffs/privacy.html`

This landing page links to that absolute URL. A packaged copy and a file-by-file manifest live in the release zip described in `DEPLOYMENT.md` after packaging. Preparing the package does not deploy it.

## Deploy

### Vercel

1. Import the repository.
2. Set the root directory to `landing`.
3. Framework preset: Other.
4. Build command: `node scripts/apply-env.js` if you set `PRO_CHECKOUT_URL` or `SITE_URL`. Otherwise leave the build command empty.
5. Output directory: the `landing` folder itself (`.` from that root).

`vercel.json` only adds basic response headers.

### GitHub Pages

This repository already publishes a different site from `website/`. Do not point that workflow at `landing/`.

To publish this page on its own:

1. Use a separate Pages site, or a branch whose root is the contents of `landing/` (`index.html` at `/`).
2. Set `SITE_URL` to that public URL.
3. Enable Pages for that site.

Relative paths (`styles.css`, `config.js`, `og.png`) work from whatever directory you serve.

### Netlify

Base directory `landing`, publish directory `landing`, build command empty or `node scripts/apply-env.js`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page, SEO, and Open Graph tags |
| `styles.css` | Layout and theme |
| `main.js` | Menu, FAQ, checkout-or-waitlist behavior |
| `config.js` | `PRO_CHECKOUT_URL`, `SITE_URL`, contact email |
| `og.png` | Share image for X and LinkedIn (1200×630) |
| `social-posts.md` | Draft posts. Not published anywhere by this repo. |

Copy on the page matches the extension in `tab-commander/` at v1.0.0. Pro items are marked coming soon.
