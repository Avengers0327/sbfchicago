# SBF Chicago — Redesign

**Hunger doesn't take weekends off. Neither does this site.**

A from-scratch redesign of sbfchicago.org: a four-act homepage that makes people
*feel* the problem before you ask them to fix it, a design system with one CTA
color per screen, and every page built from the real content already on the
live site — no stock photos, no invented stats.

Static. Fast. Free to host. Zero backend required.

---

## Highlights

- 🎯 **One CTA color, every screen.** Marigold means "act now" and nothing else —
  the design system enforces it page by page.
- 📖 **Homepage as a four-act story.** See the problem → feel it → see the fix →
  feel the fix. Built from partner quotes and real event photos, not filler copy.
- 🧩 **Self-designing pages.** Drop in a bold line + a captioned photo and the
  theme turns it into a project card, a timeline entry, or a leader-wall tile
  automatically — no manual layout work per post.
- ♿ **Accessible by construction.** Every color pair is contrast-checked against
  the token table; keyboard focus rings ship on every interactive element.
- 💸 **Deploys for free.** Static HTML/CSS/JS — Cloudflare Pages, Netlify, GitHub
  Pages, anything. No server, no database, no monthly bill.
- 🔌 **Ghost-optional.** Ships as a full Ghost theme too, if the client ever
  wants a CMS back. Passes Ghost's own theme checker (`gscan`) clean.

---

## Tech specs

| | |
|---|---|
| **Output** | Static HTML + CSS + vanilla JS (no framework, no build step to *view* it) |
| **Build tooling** | Node.js + a page-generation script (`_crawl/build-site-preview.js`) |
| **Theme format** | Also a valid Ghost theme (Handlebars `.hbs`), `gscan`-clean |
| **CSS** | Hand-written, token-based (`assets/css/screen.css`) — colors, type scale, spacing, radius and shadow all defined once at the top |
| **JS** | ~500 lines, dependency-free, progressively enhances content into components (project cards, timelines, leader walls, item tiles) |
| **Fonts** | Bricolage Grotesque (display) + Figtree (body), via Google Fonts |
| **Pages** | 12 (home, 8 nav pages, membership, tag/author archives, error page) |
| **Images** | 132, sourced from the live site's real events |
| **Forms** | Google Forms (sign-up) + Zeffy (donations), both embedded, both free, neither requires a backend |
| **Hosting cost** | $0 — any static host works |
| **Dependencies to build** | `jsdom` (dev-only, for the local preview builder) |
| **Browser support** | Any evergreen browser; graceful fallback with JS disabled |
| **License** | — *(fill in if this is going public)* |

## Repo map

| Path | What it is |
| --- | --- |
| `_crawl/preview-site/` | **The website.** `index.html` + `img/`. Upload this folder to Cloudflare Pages (or any static host) as-is. |
| `sbf-aurav-theme/` | Source for the design: templates (`*.hbs`), styles (`assets/css/screen.css`), script (`assets/js/site.js`). Edit these to change the site. Also works as a Ghost theme. |
| `sbf-aurav-theme.zip` | The same theme, zipped for uploading to Ghost (only if you ever use Ghost). |
| `sbf-chicago-preview.html` | A copy of the built site page. |
| `_crawl/build-site-preview.js` | Builds `preview-site/` from the theme + the site's real content. |
| `_crawl/content/` | Each page's real content, taken from the current sbfchicago.org. |
| `_crawl/*.html`, `*.txt`, `cand/`, `prev/`, `embedtest/` | Research and test files from the redesign. Safe to ignore. |

## Rebuild the site after editing

Needs [Node.js](https://nodejs.org). In a terminal:

```bash
cd _crawl
npm install
node build-site-preview.js
```

`npm install` is only needed the first time. The rebuilt site lands in `_crawl/preview-site/`.

## Where to edit common things

- **Homepage copy, stats, next event:** `sbf-aurav-theme/home.hbs` and the defaults in `sbf-aurav-theme/package.json` (`config.custom`)
- **Colors, fonts, spacing:** top of `sbf-aurav-theme/assets/css/screen.css` (design-system tokens)
- **Page layouts:** `sbf-aurav-theme/page-*.hbs` and `sbf-aurav-theme/partials/`

## Forms and donations

Donations use Zeffy and the sign-up forms use Google Forms. Both are embedded and work on any host. They load live on the deployed site.

## Memberships

Paid memberships (Advocate and Champion, monthly or yearly) run through Zeffy, the same tool used for donations. Members don't log in on this site. Zeffy handles payments, renewals, receipts and cancellations. Every **Join** button opens the link set in `membership_url` (`sbf-aurav-theme/package.json`). Tier copy lives in `sbf-aurav-theme/partials/membership-tiers.hbs`.
