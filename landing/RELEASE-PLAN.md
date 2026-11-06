# No-cost release plan

Not published. PR 7 is the release candidate. Do not merge it, and do not copy these files, until Chief of Staff’s review is finished.

## Target

https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/

That URL is already a GitHub Pages path. It is served from `docs/hub/` in the repository `edwinmurillo-droid/ai-general-stuffs`. No new host, account, repository, or subscription.

Today that URL returns 200 and still shows the old short product index. This page is not live there.

## Who has to do the copy

Someone with write access to `edwinmurillo-droid/ai-general-stuffs`, not this workshop repo.

1. Take `tab-commander-hub-release.zip`.
2. Replace `docs/hub/` with the `docs/hub/` tree in the zip.
3. Leave `docs/index.html`, `docs/privacy.html`, and `docs/signs-moving.mp4` untouched.
4. Commit and push `main` on `ai-general-stuffs`. GitHub Pages publishes `docs/` at no charge.
5. Confirm these return 200 and the hub HTML is the new page:
   - https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/
   - https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/og.png
   - https://edwinmurillo-droid.github.io/ai-general-stuffs/hub/styles.css
   - https://edwinmurillo-droid.github.io/ai-general-stuffs/privacy.html

Do not enable Pages on `agents-in-sdlc`. Do not edit `.github/workflows/pages.yml` here. That workflow publishes the workshop site.

## What stays unpaid

`PRO_CHECKOUT_URL` stays `https://example.com/tab-commander-pro`. The Pro button opens a waitlist email to Edwin.Murillo@allin1sdm.com. $3 a month and $29 once are suggestions on the page, not a checkout. Do not create a payment account.

## Chrome Web Store

No extension resubmission. The listing already uses the hub URL for support and `privacy.html` for the privacy policy. After step 4, those links show this page and the existing policy. Changing the extension zip would be a separate store review and is not required to publish the site.

## Video

The 45-second recut is in `landing/video/out/` and is not embedded on the page. Leave it off the hub package until that cut is accepted.

## After publication, check

- View source: canonical is the hub URL.
- Footer “Privacy policy” is `https://edwinmurillo-droid.github.io/ai-general-stuffs/privacy.html`, not `privacy.html`.
- “Add to Chrome” opens `https://chromewebstore.google.com/detail/tab-commander/bkeacpglbifipmmkofcjkoligeampnmc`.
- “Join the Pro waitlist” stays on the page.
- Desktop and a phone width: no sideways scroll, install button visible.
