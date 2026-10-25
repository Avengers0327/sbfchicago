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
| **Build tooling** | Node.js + a page-generation script (`build/build.js`) |
| **Theme format** | Also a valid Ghost theme (Handlebars `.hbs`), `gscan`-clean |
| **CSS** | Hand-written, token-based (`assets/css/screen.css`) — colors, type scale, spacing, radius and shadow all defined once at the top |
| **JS** | ~500 lines, dependency-free, progressively enhances content into components (project cards, timelines, leader walls, item tiles) |
| **Fonts** | Bricolage Grotesque (display) + Figtree (body), via Google Fonts |
| **Pages** | 8 (home, Team & Vision, Where We Serve, Get Involved, Give, News & Events, Membership, a sample event post) |
| **Images** | 132, sourced from the live site's real events |
| **Forms** | Google Forms (sign-up) + Zeffy (donations), both embedded, both free, neither requires a backend |
| **Hosting cost** | $0 — any static host works |
| **Dependencies to build** | `jsdom` (dev-only, for the local preview builder) |
| **Browser support** | Any evergreen browser; graceful fallback with JS disabled |
| **License** | — *(fill in if this is going public)* |

## Repo map

| Path | What it is |
| --- | --- |
| `build/dist/` | **The website.** One folder per page plus `img/`, `sitemap.xml` and `robots.txt`. Made by the build; point Cloudflare Pages (or any static host) at this folder. |
| `sbf-aurav-theme/` | Source for the design: templates (`*.hbs`), styles (`assets/css/screen.css`), script (`assets/js/site.js`). Edit these to change the site. Also works as a Ghost theme. |
| `sbf-aurav-theme.zip` | The same theme, zipped for uploading to Ghost (only if you ever use Ghost). |
| `build/build.js` | Builds `build/dist/` from the theme and the page content. |
| `build/template.html` | The page shell: header, footer, and the one-page preview router. |
| `build/content/` | Each page's text and photos, taken from the current sbfchicago.org. |

## Rebuild the site after editing

Needs [Node.js](https://nodejs.org). In a terminal:

```bash
cd build
npm install
node build.js
```

`npm install` is only needed the first time. The rebuilt site lands in `build/dist/`.

## Where to edit common things

- **Homepage copy and stats:** `sbf-aurav-theme/home.hbs` and the defaults in `sbf-aurav-theme/package.json` (`config.custom`)
- **Packing event dates:** `packing_dates` in `sbf-aurav-theme/package.json`, with the usual `packing_time` and `packing_place`. The header bar, "Pack with us" and every next-event line pick the first date that hasn't passed, in the visitor's browser, so nothing needs changing after an event. Add dates ahead of time; a one-off time or place is written `2027-01-17 10:00 AM @ Place`.
- **Colors, fonts, spacing:** top of `sbf-aurav-theme/assets/css/screen.css` (design-system tokens)
- **Page layouts:** `sbf-aurav-theme/page-*.hbs` and `sbf-aurav-theme/partials/`

## Forms and donations

Donations use Zeffy and the sign-up forms use Google Forms. Both are embedded and work on any host. They load live on the deployed site.

## Memberships

Paid memberships (Advocate and Champion, monthly or yearly) run through Zeffy, the same tool used for donations. Members don't log in on this site. Zeffy handles payments, renewals, receipts and cancellations. Every **Join** button opens the link set in `membership_url` (`sbf-aurav-theme/package.json`). Tier copy lives in `sbf-aurav-theme/partials/membership-tiers.hbs`.

## Search (SEO)

Every page is its own real URL (`/team/`, `/get-involved/`, ...) with its own title, description, canonical link, social-share tags, and a `sitemap.xml`. The homepage also carries `NonprofitOrganization` data.

Until the real domain is ready, the build marks every page `noindex` so this preview can't compete with sbfchicago.org. At launch, build with the real address and indexing on:

```bash
cd build
SITE_URL=https://sbfchicago.org INDEXABLE=1 node build.js
```

On Cloudflare Pages, set `SITE_URL` and `INDEXABLE=1` under Settings → Variables and Secrets (build) instead, and redeploy. Page titles and descriptions live in the `SEO` table in `build/build.js`.

## Combined pages

Some old pages now live as sections of one page. Their old addresses forward to the right spot:

| Old page | Now |
| --- | --- |
| `/who-we-serve-chicago/` | Where We Serve → Chicago Projects (`/where-we-serve/#chicago`) |
| `/who-we-serve-india/` | Where We Serve → India Projects (`/where-we-serve/#india`) |
| `/youth-leaders/` | Get Involved → Lead an event (`/get-involved/#youth-leadership`) |
| `/donations/` | Give → Donate (`/give/#donate`) |
| `/items-needed/` | Give → Ship it, or bring it (`/give/#items`) |
| `/sbf-fundraiser/` | News & Events → Upcoming events (`/news-events/#upcoming`) |
| `/in-the-news/` | News & Events → In the news (`/news-events/#news`) |

Their text and photos still come from the same files in `build/content/`, so editing those still updates the site.

## Compare versions (temporary)

Every page has a **Compare versions** button that opens `/versions/`: two versions side by side (desktop or phone size, scrolling together), picked from a timeline that runs from the original sbfchicago.org (shown live) through each milestone to today.

Past versions are rebuilt from git history once:

```bash
cd build
node versions.js
node build.js
```

Milestones are listed at the top of `build/versions.js`. To remove the feature, set `SHOW_VERSIONS = false` in `build/build.js` and rebuild; the button and `/versions/` disappear.
