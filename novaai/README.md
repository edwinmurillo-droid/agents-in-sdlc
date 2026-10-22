# NovaAI landing page

Dark, cinematic single-page marketing site. React + TypeScript + Vite + Tailwind CSS + lucide-react.

```bash
npm install
npm run dev      # http://localhost:5199
npm run build
```

## Structure

- `src/components/ScrollVideo.tsx` — fixed full-bleed background whose video timeline is driven by page scroll
  (lerped at 0.12/frame). Up to 90 frames are cached as `ImageBitmap`s and drawn to a canvas with object-cover
  math; until the cache is ready, the visible `<video>` is seeked instead. Never autoplays.
- `src/components/Reveal.tsx` — IntersectionObserver fade-up (threshold 0.15, 700 ms, per-element delay).
- `src/components/Navbar.tsx`, `SectionOne.tsx`, `SectionTwo.tsx` — page content. The `h-[80vh]` spacer between
  the sections in `App.tsx` gives the video room to scrub.
- `src/assets.ts` — hero video (CloudFront) and portrait URLs.

`public/hero-poster.jpg` (first frame of the hero video) is optional; the poster layer hides itself if the file is
missing.
