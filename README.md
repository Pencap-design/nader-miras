# نادر · رونمایی کالکشن میراث — invitation microsite

Static HTML + CSS + vanilla JS. No build step, no dependencies. About 250 KB is loaded at runtime. `assets/img/reference-cover.webp` is the original reference and is never loaded.

## Run locally
    python3 -m http.server 5173
Then open http://localhost:5173. To jump straight to a scene while designing, add `?s=reveal`, `?s=details`, or `?s=final`.

## Deploy
Upload the whole folder to any static host (Netlify, Vercel, Cloudflare Pages, or plain nginx).

## Editing
| What | Where |
|---|---|
| Event details, all Persian copy, RSVP and map links | `js/config.js` |
| Logo (transparent) | `assets/img/logo.webp` |
| Logo light-sweep mask (the same shape in white) | `assets/img/logo-mask.webp` |
| Background texture | `assets/img/texture-leather.webp` |
| Fonts (Doran, woff2) | `assets/fonts/` + `@font-face` at the top of `css/style.css` |
| Colors, easing, timings | `:root` in `css/style.css`; scene timelines in `js/app.js` → `scenes` |

- **RSVP:** set `links.rsvp` to a form, WhatsApp, or `tel:` link. When it's empty, the button only shows an in-page thank-you and sends nothing.
- **Map:** `links.map` currently points to a Google Maps search. Replace it with a pinned Neshan, Balad, or Google Maps link for the venue.

## Structure
- `js/motifs.js`: hand-drawn SVG motifs (seal rings, Achaemenid rosette, Persepolis merlon, card frame, glyphs)
- `js/app.js`: the scene director (seal → reveal → details → final)
- `js/dust.js`: gold-dust canvas
- `js/sound.js`: synthesized Web Audio sound. It is off by default and turns on only from the sound button.
