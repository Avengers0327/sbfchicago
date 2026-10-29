// Builds the site: real sbfchicago.org content in the new theme's CSS and JS.
// Simulates the finished content checklist (banners removed, infographics replaced by snippets).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const T = path.join(ROOT, 'sbf-aurav-theme');
const OUT = path.join(__dirname, 'dist');
const IMG = path.join(OUT, 'img');
fs.rmSync(IMG, { recursive: true, force: true });
fs.mkdirSync(IMG, { recursive: true });

// Theme files may have Windows line endings after a git checkout; read them as LF
const readT = (...a) => fs.readFileSync(path.join(T, ...a), 'utf8').replace(/\r\n/g, '\n');
// Theme settings, with the next-event lines written from the packing schedule as of today
function customDefs() {
  const pkg = JSON.parse(readT('package.json'));
  const defs = Object.fromEntries(Object.entries(pkg.config.custom).map(([k, v]) => [k, v.default || '']));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const next = packingEvents(defs).find(e => e.date >= today);
  if (next) Object.assign(defs, nextEventText(next));
  return defs;
}
// packing_dates: "YYYY-MM-DD" entries, each optionally "YYYY-MM-DD 10:00 AM @ Place" (mirrors assets/js/site.js)
function packingEvents(defs) {
  return defs.packing_dates.split(',').map(s => {
    const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+([^@]*?))?\s*(?:@\s*(.+))?$/);
    return m && { date: new Date(+m[1], +m[2] - 1, +m[3]), time: (m[4] || '').trim() || defs.packing_time, place: (m[5] || '').trim() || defs.packing_place };
  }).filter(Boolean);
}
function nextEventText(e) {
  const on = o => e.date.toLocaleDateString('en-US', o);
  const full = on({ month: 'long', day: 'numeric', year: 'numeric' });
  return {
    next_event_title: `Pack with us on ${on({ month: 'long', day: 'numeric' })}`,
    next_event_details: `${on({ weekday: 'long' })}, ${full} · ${e.time} · ${e.place}`,
    next_event_announce: `Next Food Packing Event: ${full} at ${e.time} at ${e.place}`,
  };
}

const snippet = f => readT('content-snippets', f).replace(/<!--[\s\S]*?-->/g, '').trim();

const PAGES = [
  { slug: 'team', title: 'SBF Vision and Team', eyebrow: 'Who we are' },
  { slug: 'where-we-serve', title: 'Where We Serve', layout: 'serve', nocontent: true },
  { slug: 'get-involved', title: 'Get Involved!', layout: 'involved', nocontent: true },
  { slug: 'give', title: 'Give', layout: 'template', nocontent: true },
  { slug: 'news-events', title: 'News &amp; Events', layout: 'template', nocontent: true },
  { slug: 'membership', title: 'Become a member', layout: 'membership', nocontent: true },
  { slug: 'aug-event', title: 'August 9 Chicago Food Packing Event', post: true, band: 'chicago',
    date: 'Aug 10, 2026', readingTime: '3 min read',
    feature: 'https://sbfchicago.org/content/images/2026/08/WhatsApp-Image-2026-08-10-at-1.47.25-PM--2--1.jpeg' },
];
const SLUGS = new Set(PAGES.map(p => p.slug).concat(['home']));

// Pages folded into others: old address -> [page, section]
const MOVED = {
  'who-we-serve-chicago': ['where-we-serve', 'chicago'],
  'who-we-serve-india': ['where-we-serve', 'india'],
  'youth-leaders': ['get-involved', 'youth-leadership'],
  donations: ['give', 'donate'],
  'items-needed': ['give', 'items'],
  'sbf-fundraiser': ['news-events', 'upcoming'],
  'in-the-news': ['news-events', 'news'],
};
// Sections other pages link to, and the page each one lives on
const SECTION_PAGE = {
  chicago: 'where-we-serve', india: 'where-we-serve',
  'youth-leadership': 'get-involved', 'volunteer-hours': 'get-involved', 'sign-up': 'get-involved',
  donate: 'give', items: 'give', 'items-form': 'give',
  upcoming: 'news-events', news: 'news-events',
};

/* ---------- image localisation ---------- */
const imgMap = new Map();
let imgCount = 0;
// Wide images (full-width cards) are fetched at 1000px so they stay sharp; everything else at 600px
function localImg(src, wide) {
  if (!src || !/sbfchicago\.org\/content\/(images|media)\//.test(src)) return null;
  if (/\.ico$/i.test(src)) return null;
  let url = src.replace(/\/content\/images\/size\/w\d+\//, '/content/images/');
  if (/\/content\/images\/20\d\d\//.test(url)) url = url.replace('/content/images/', `/content/images/size/${wide ? 'w1000' : 'w600'}/`);
  if (imgMap.has(url)) return imgMap.get(url);
  const ext = (url.match(/\.(jpe?g|png|gif|webp)$/i) || [, 'jpg'])[1].toLowerCase().replace('jpeg', 'jpg');
  const name = `img/${String(++imgCount).padStart(3, '0')}.${ext}`;
  imgMap.set(url, name);
  return name;
}

function decodeCf(hx) {
  const k = parseInt(hx.substr(0, 2), 16); let o = '';
  for (let j = 2; j < hx.length; j += 2) o += String.fromCharCode(parseInt(hx.substr(j, 2), 16) ^ k);
  return o;
}

/* ---------- content transform ---------- */
function transform(html, doc) {
  const box = doc.createElement('div');
  box.innerHTML = html;
  const figOf = sel => Array.from(box.querySelectorAll(`figure.kg-image-card img[src*="${sel}"]`)).map(i => i.closest('figure'));
  const replaceWith = (node, markup) => { const t = doc.createElement('template'); t.innerHTML = markup; node.replaceWith(t.content); };

  // checklist: banners with baked-in text are deleted
  ['_cropped', '1-team-and-vision', '9-sbf-items-needed', 'banner-test-16by9'].forEach(k => figOf(k).forEach(f => f.remove()));
  // checklist: swap infographics for live HTML snippets
  figOf('chicago-sept.jpg').forEach(f => replaceWith(f, snippet('chicago-impact.html')));
  figOf('our_partners-grid').forEach(f => replaceWith(f, snippet('chicago-partners.html')));
  figOf('India-top.png').forEach(f => replaceWith(f, snippet('india-impact.html')));
  figOf('india-middle-sept').forEach(f => f.remove());
  figOf('india-bottom-sept').forEach(f => replaceWith(f, snippet('india-drives.html')));

  // Decode Cloudflare-obfuscated emails to plain text
  box.querySelectorAll('[data-cfemail]').forEach(n => {
    const a = n.closest('a[href*="email-protection"]') || n;
    a.replaceWith(doc.createTextNode(decodeCf(n.getAttribute('data-cfemail'))));
  });

  // Live embeds: Zeffy's script-based embed becomes a plain iframe; Google Forms and Facebook iframes stay
  box.querySelectorAll('[data-zeffy-embed]').forEach(n => {
    replaceWith(n.parentElement, '<div class="form-embed form-embed-zeffy"><iframe src="https://www.zeffy.com/embed/donation-form/sbf-chicago-donation" title="Donation form powered by Zeffy" allowpaymentrequest allowtransparency="true" loading="lazy"></iframe></div>');
  });
  box.querySelectorAll('iframe[src*="docs.google.com/forms"]').forEach(f => {
    f.removeAttribute('width'); f.removeAttribute('height'); f.setAttribute('title', 'Item sign-up form'); f.setAttribute('loading', 'lazy');
    const w = doc.createElement('div'); w.className = 'form-embed'; f.replaceWith(w); w.appendChild(f);
  });
  box.querySelectorAll('.kg-video-card').forEach(v => {
    const thumb = v.getAttribute('data-kg-thumbnail');
    const cap = v.querySelector('figcaption');
    const local = localImg(thumb);
    replaceWith(v, `<figure class="kg-card kg-image-card kg-card-hascaption">${local ? `<img class="kg-image" src="${local}" alt="Video thumbnail">` : ''}<figcaption>Video plays on sbfchicago.org${cap ? ': ' + cap.textContent.trim() : ''}</figcaption></figure>`);
  });
  box.querySelectorAll('.kg-bookmark-icon, .kg-bookmark-publisher').forEach(n => n.remove());
  box.querySelectorAll('script').forEach(n => n.remove());

  // Point images at local copies
  box.querySelectorAll('img').forEach(img => {
    img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.removeAttribute('onerror');
    const src = img.getAttribute('src');
    if (/meet_our_/.test(src)) return; // theme JS swaps these for live headings
    const local = localImg(src, !!img.closest('.kg-image-card.kg-width-wide, .kg-image-card.kg-width-full'));
    if (local) img.setAttribute('src', local); else if (/sbfchicago\.org/.test(src)) img.remove();
    img.setAttribute('loading', 'lazy');
  });
  box.querySelectorAll('[style*="white-space"]').forEach(n => n.removeAttribute('style'));
  return box.innerHTML;
}

// A page's content, ready to drop into a template
const contentOf = slug => transform(fs.readFileSync(path.join(__dirname, 'content', slug + '.html'), 'utf8'), doc);

// Keep only the top-level blocks of some content that pass a test
function blocks(html, keep) {
  const box = doc.createElement('div');
  box.innerHTML = html;
  Array.from(box.children).forEach(c => { if (!keep(c)) c.remove(); });
  return box.innerHTML;
}

/* ---------- page shells (mirror the Handlebars templates) ---------- */
const donatePanel = `
<section class="post-cta" aria-label="Donate">
  <div class="container">
    <div class="cta-panel band-navy on-navy">
      <div class="stack">
        <h2 class="t-h2">Can't make it but still want to help?</h2>
        <p class="t-body">Want to impact lives of people by helping us provide them meals? Donate money and the SBF team can buy items on your behalf.</p>
        <p class="t-small zelle">We also accept Zelle at sbfchicago@gmail.com</p>
      </div>
      <div class="cta-actions"><a class="btn btn-primary" href="/give/#donate">Donate</a></div>
    </div>
  </div>
</section>`;

const STATS = [['6,100+', 'Meals from our Chicago food drives'], ['18,500+', 'Meals from our India food drives'], ['5,100+', 'Peanut butter sandwiches packed, Jan to Sept 2026']];

// Minimal Handlebars for the static build. Pages have no excerpt or feature image, so every
// {{#if x}}a{{else}}b{{/if}} takes its else branch, and {{#get ... slug:x}} blocks get page x's content
// (or gets[x] when the caller passes a trimmed version).
function fillHbs(h, params, gets, name) {
  const defs = customDefs();
  h = h.replace(/\{\{!<[^}]*\}\}/g, '').replace(/\{\{!--[\s\S]*?--\}\}/g, '');
  while (/\{\{> "[\w-]+"\}\}/.test(h)) h = h.replace(/\{\{> "([\w-]+)"\}\}/g, (m, n) => readT('partials', n + '.hbs').replace(/\{\{!--[\s\S]*?--\}\}\n?/g, '').trim());
  h = h.replace(/\{\{#get "\w+" filter="slug:([\w-]+)"[^}]*\}\}([\s\S]*?)\{\{\/get\}\}/g, (m, slug, inner) => {
    const body = gets && gets[slug] != null ? gets[slug] : contentOf(slug);
    return inner.replace(/\{\{#foreach \w+\}\}|\{\{\/foreach\}\}/g, '').replace('{{content}}', () => body);
  });
  h = h.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  h = h.replace(/\{\{@custom\.(\w+)\}\}/g, (m, k) => defs[k] || '');
  h = h.split('{{@site.url}}').join('https://sbfchicago.org');
  h = h.replace(/\{\{(\w+)\}\}/g, (m, k) => params[k] != null ? params[k] : '');
  h = h.replace(/src="(https:\/\/sbfchicago\.org\/content\/images\/[^"]+)"/g, (m, u) => 'src="' + localImg(u) + '"');
  if (h.includes('{{')) throw new Error('Unrendered Handlebars in ' + name + ': ' + h.slice(h.indexOf('{{'), h.indexOf('{{') + 60));
  return h;
}

function renderPartial(name, params, gets) {
  return fillHbs(readT('partials', name + '.hbs'), params, gets, name);
}

// key="value" and key=@custom.x pairs from a partial call
function hbsParams(args) {
  const defs = customDefs();
  const out = {};
  for (const m of args.matchAll(/(\w+)=(?:"([^"]*)"|@custom\.(\w+))/g)) out[m[1]] = m[2] != null ? m[2] : defs[m[3]];
  return out;
}

// Params a page template passes to one of its partials
function partialParams(slug, name) {
  const m = readT(`page-${slug}.hbs`).match(new RegExp('\\{\\{> "' + name + '"([^}]*)\\}\\}'));
  return m ? hbsParams(m[1]) : null;
}
const splitParams = slug => partialParams(slug, 'page-hero-split');

// Where We Serve: Chicago and India built the same way, then one shared "want to help?" ending.
// Chicago's help block (CTA + links to the wish list, items, donations, get involved) becomes that
// ending; India's shorter copy of it (CTA + donations link) is dropped as a duplicate.
function servePage(p) {
  const chicago = contentOf('who-we-serve-chicago');
  const help = chicago.indexOf('<div class="kg-card kg-cta-card');
  const past = chicago.indexOf('<h2 id="details-of-our-past-events');
  const india = contentOf('who-we-serve-india');
  const indiaHelp = india.indexOf('<div class="kg-card kg-cta-card');
  if (help < 0 || past < help || indiaHelp < 0) throw new Error('Where We Serve: help or past-events block not found');
  // Hero and city headings come straight from the template, so the two can't drift apart
  const tpl = readT('page-where-we-serve.hbs');
  const between = (from, to) => { const i = tpl.indexOf(from); return tpl.slice(i, tpl.indexOf(to, i)); };
  const fill = h => fillHbs(h.replace('{{> "serve-cities"}}', readT('partials', 'serve-cities.hbs')), {}, null, 'page-where-we-serve');
  const head = city => fill(between('<div class="serve-city-head band-' + city + '">', '        {{#get'));
  return `<article class="band-page-plain">${fill(between('<header class="page-hero">', '    <section'))}
    <section class="page-section serve-city band-page-chicago" id="chicago" aria-labelledby="chicago-title">${head('chicago')}
      <div class="gh-canvas gh-content">${chicago.slice(0, help)}</div>
      ${renderPartial('weekend-gap', {})}
      <div class="gh-canvas gh-content">${chicago.slice(past)}</div>
    </section>
    <section class="page-section serve-city band-page-india page-who-we-serve-india" id="india" aria-labelledby="india-title">${head('india')}
      <div class="gh-canvas gh-content">${india.slice(0, indiaHelp)}</div>
    </section>
    <section class="page-section serve-help" aria-label="Help with our mission">
      <div class="gh-canvas gh-content">${chicago.slice(help, past)}</div>
    </section></article>${donatePanel}`;
}

// A whole page template: its partials, then its {{#get}} content blocks
function renderTemplate(p) {
  let h = readT(`page-${p.slug}.hbs`).replace(/\{\{!--[\s\S]*?--\}\}/g, '').replace(/\{\{[#/]post\}\}/g, '');
  h = h.replace(/\{\{> "([\w-]+)"([^}]*)\}\}/g, (m, name, args) => renderPartial(name, Object.assign({ title: p.title }, hbsParams(args))));
  return fillHbs(h, {}, null, 'page-' + p.slug);
}

// Get Involved, from showing up to leading. Partners move below youth leadership, and only
// the leader photos come over from the Youth Leaders page (its hours and roles have their own sections).
function involvedPage(p) {
  const gi = contentOf('get-involved');
  const cut = gi.indexOf('<h2 id="collaborative-partners-sponsors"');
  if (cut < 0) throw new Error('Get Involved: partners heading not found');
  const leaders = blocks(contentOf('youth-leaders'), c => !/^(P|UL)$/.test(c.tagName) && !c.classList.contains('kg-button-card'));
  return renderPartial('page-hero-split', Object.assign({ title: p.title }, splitParams(p.slug)))
    + renderPartial('packing-day', {})
    + `<article class="band-page-plain"><div class="gh-canvas gh-content">${gi.slice(0, cut)}${renderPartial('more-ways', {})}</div></article>`
    + renderPartial('volunteer-hours', {})
    + renderPartial('youth-lead', {}, { 'youth-leaders': leaders })
    + `<article class="band-page-plain page-partners"><div class="gh-canvas gh-content">${gi.slice(cut)}</div></article>`
    + signupSection(p.slug);
}

// The page's embedded sign-up form, with the heading and note its template passes
function signupSection(slug) {
  const params = partialParams(slug, 'signup-form');
  if (!params) return '';
  return renderPartial('signup-form', params);
}

function shell(p, content, doc) {
  if (p.layout === 'template') return renderTemplate(p);
  if (p.layout === 'involved') return involvedPage(p);
  if (p.layout === 'serve') return servePage(p);
  const band = p.band || '';
  const hero = (extra = '') => `
    <header class="page-hero${band ? ' band-' + band : ''}">
      <div class="container">
        <p class="t-eyebrow">${p.post ? `<time>${p.date}</time> &middot; Chicago food packing` : (p.eyebrow || '')}</p>
        <h1 class="t-h1">${p.title}</h1>${extra}
      </div>
    </header>`;

  if (p.layout === 'membership') {
    return `<article class="band-page-plain">${hero().replace('<p class="t-eyebrow"></p>', '<p class="t-eyebrow">Membership</p>')}${renderPartial('membership-tiers', {})}</article>`;
  }
  const meta = p.post ? `
        <p class="t-small page-hero-meta"><span>By Anuj Saxena</span><span>${p.readingTime}</span></p>
        <figure class="page-hero-feature"><img src="${localImg(p.feature)}" alt="Volunteers packing food at the August 9 event"></figure>` : '';
  return `<article class="band-page-${band || 'plain'}">${hero(meta)}
    <div class="gh-canvas gh-content">${content}</div></article>${p.donate || p.post ? donatePanel : ''}`;
}


// Homepage: render the real home.hbs with the theme's default settings
function renderHome() {
  const defs = customDefs();
  const partial = n => readT('partials', n + '.hbs').replace(/\{\{!--[\s\S]*?--\}\}\n?/g, '').trim();
  let h = readT('home.hbs');
  h = h.replace(/\{\{!<[^}]*\}\}/g, '').replace(/\{\{!--[\s\S]*?--\}\}/g, '');
  h = h.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  while (/\{\{> "[\w-]+"\}\}/.test(h)) h = h.replace(/\{\{> "([\w-]+)"\}\}/g, (m, n) => partial(n));
  h = h.replace(/\{\{@custom\.(\w+)\}\}/g, (m, k) => defs[k] != null ? defs[k] : '');
  h = h.split('{{@site.url}}').join('https://sbfchicago.org');
  h = h.replace(/src="(https:\/\/sbfchicago\.org\/content\/images\/[^"]+)"/g, (m, u) => 'src="' + localImg(u) + '"');
  if (h.includes('{{')) throw new Error('Unrendered Handlebars in home: ' + h.slice(h.indexOf('{{'), h.indexOf('{{') + 60));
  return h;
}

/* ---------- build ---------- */
const src = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const dom = new JSDOM('<!doctype html><body></body>');
const doc = dom.window.document;

let pagesHtml = '';
for (const p of PAGES) {
  const raw = p.nocontent ? '' : fs.readFileSync(path.join(__dirname, 'content', p.slug + '.html'), 'utf8');
  const cls = p.post ? 'post-template' : `page-template page-${p.slug}`;
  pagesHtml += `\n<div data-page="${p.slug}" data-bodyclass="${cls}" class="${cls}" hidden>${shell(p, transform(raw, doc), doc)}</div>`;
}

let html = src
  .replace('/*CARDS_CSS*/', () => fs.readFileSync(path.join(__dirname, 'ghost', 'cards.min.css'), 'utf8'))
  .replace('/*CSS*/', () => readT('assets/css/screen.css'))
  .replace('/*JS*/', () => readT('assets/js/site.js'))
  .replace('<!--HOME-->', () => renderHome())
  .replace('<!--PAGES-->', () => pagesHtml)
  .replace(/\{\{IMG:logo\}\}/g, 'img/logo.jpg');

// Header bar: the same schedule, so it moves to the next event on its own
{
  const defs = customDefs();
  const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  html = html.replace('{{PACKING_DATES}}', attr(defs.packing_dates)).replace('{{PACKING_TIME}}', attr(defs.packing_time))
    .replace('{{PACKING_PLACE}}', attr(defs.packing_place)).replace('{{NEXT_ANNOUNCE}}', attr(defs.next_event_announce || ''));
}

// Point internal links at the site's own routes
html = html.replace(/href="(?:https?:\/\/sbfchicago\.org)?\/+([a-z0-9-]*)\/?(?:\?[^"#]*)?(?:#([a-z0-9-]+))?"/g, (m, slug, hash) => {
  if (MOVED[slug]) return `href="#${MOVED[slug][1]}"`;
  if (slug === '') return `href="#${hash || 'home'}"`;
  if (SLUGS.has(slug)) return `href="#${hash || slug}"`;
  return `href="https://sbfchicago.org/${slug}/${hash ? '#' + hash : ''}"`;
});

// Outputs: one real HTML file per page in dist/ (SEO block below), plus ../sbf-chicago-preview.html,
// the bare one-page fragment for the Claude artifact viewer, which adds its own <!doctype>, <head>
// and viewport tag and must not get a second set.
/* ---------- SEO: one real URL per page ----------
   SITE_URL and INDEXABLE are the only things to change at launch:
     SITE_URL=https://sbfchicago.org INDEXABLE=1 node build.js
   Until then every page says noindex, so the preview domain can't compete with the live site. */
const SITE_URL = (process.env.SITE_URL || 'https://sbfchicago.pages.dev').replace(/\/+$/, '');
const INDEXABLE = process.env.INDEXABLE === '1';
// Version history for previewing with the client: a "Compare versions" button on every page and
// the compare page at /versions/ (snapshots made by `node versions.js`). Set to false to remove it all.
const SHOW_VERSIONS = true;
// Headline font switch for the client review (Bricolage Grotesque or Schibsted Grotesk), remembered
// across pages in the visitor's browser. Set to false once a font is chosen.
const SHOW_FONT_TOGGLE = true;
const SEO = {
  home: ['SBF Chicago: Youth-led hunger relief in Chicagoland & India', 'SBF Chicago: a youth-led nonprofit packing meals for neighbors facing hunger in Chicagoland and India.'],
  team: ['Team & Vision | SBF Chicago', "Meet the founders, junior board and executive team of SBF Chicago, a youth-led nonprofit in Chicago's Northwest suburbs fighting hunger."],
  'where-we-serve': ['Where We Serve | SBF Chicago', 'Monthly food packing events in Chicagoland for people facing homelessness and students in need, and seven feeding projects across India.'],
  'get-involved': ['Get Involved | SBF Chicago', "Volunteer at SBF Chicago's monthly food packing event, or lead one as a student youth leader. Students, families and groups welcome; volunteer hours available."],
  give: ['Give | SBF Chicago', 'Donate to SBF Chicago through Zeffy or Zelle, or give food items from our Amazon Wishlist. Zeffy is 100% free to the organization.'],
  'news-events': ['News & Events | SBF Chicago', 'Upcoming SBF Chicago packing events and fundraisers, plus milestones, press and words from our partners.'],
  membership: ['Become a Member | SBF Chicago', 'Become an SBF Chicago member with Advocate and Champion plans: coaching, recognition and mentorship for youth leaders.'],
  'aug-event': ['August 9 Food Packing Event | SBF Chicago', 'We packed 1,200+ sandwiches and 650 brown bags at our August 9 food packing event. Thanks to National India Hub for hosting.'],
};
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const ogImage = SITE_URL + '/' + imgMap.get('https://sbfchicago.org/content/images/size/w600/2026/09/IMG_6248-2.JPEG');
const urlFor = slug => SITE_URL + (slug === 'home' ? '/' : `/${slug}/`);

const orgJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'NonprofitOrganization',
  name: 'SBF Chicago',
  url: SITE_URL + '/',
  logo: SITE_URL + '/img/logo.jpg',
  description: SEO.home[1],
  email: 'sbfchicago@gmail.com',
  sameAs: ['https://www.instagram.com/sbfchicago', 'https://www.facebook.com/profile.php?id=61592796391174', 'https://www.linkedin.com/company/sbf-chicago/'],
});

function pageDoc(slug) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  const d = dom.window.document;
  let bodyClass = '';
  d.querySelectorAll('[data-page]').forEach(p => {
    if (p.getAttribute('data-page') === slug) { p.removeAttribute('hidden'); bodyClass = p.getAttribute('data-bodyclass') || ''; }
    else p.remove();
  });
  // Empty alt text on real photos: use the caption, or the person's name on team cards
  const clip = t => t.replace(/\s+/g, ' ').trim().slice(0, 125);
  d.querySelectorAll('img[alt=""]').forEach(img => {
    if (img.classList.contains('brand-mark')) return;
    const card = img.closest('.kg-header-card');
    const fig = img.closest('figure');
    const cap = fig && fig.querySelector('figcaption');
    const head = card && card.querySelector('.kg-header-card-heading');
    if (head) img.setAttribute('alt', clip(head.textContent.split(',')[0]));
    else if (cap && cap.textContent.trim()) img.setAttribute('alt', clip(cap.textContent));
  });
  let body = d.body.innerHTML.replace(/<title>[\s\S]*?<\/title>/, '');
  // Hash routes become real URLs; a section that lives on another page gets that page's address
  body = body.replace(/href="#([a-z0-9-]+)"/g, (m, id) => {
    if (id === 'home') return 'href="/"';
    if (SLUGS.has(id)) return `href="/${id}/"`;
    const owner = SECTION_PAGE[id];
    return owner && owner !== slug ? `href="/${owner}/#${id}"` : m;
  });
  body = body.replace(/(src|href)="img\//g, '$1="/img/');
  const [title, desc] = SEO[slug];
  const url = urlFor(slug);
  // Old #team style links (shared before real URLs existed), including pages that have since moved
  const oldHash = Object.fromEntries([...SLUGS].filter(x => x !== 'home').map(s => [s, `/${s}/`])
    .concat(Object.entries(MOVED).map(([old, [pg, sec]]) => [old, `/${pg}/#${sec}`])));
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    INDEXABLE ? '' : '<meta name="robots" content="noindex,nofollow">',
    '<link rel="icon" href="/img/logo.jpg">',
    '<link rel="apple-touch-icon" href="/img/logo.jpg">',
    `<meta property="og:type" content="${slug === 'aug-event' ? 'article' : 'website'}">`,
    '<meta property="og:site_name" content="SBF Chicago">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${ogImage}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${ogImage}">`,
    slug === 'home' ? `<script type="application/ld+json">${orgJsonLd}</script>` : '',
    slug === 'home' ? `<script>(function(){var m=${JSON.stringify(oldHash)},h=location.hash.slice(1);if(m[h])location.replace(m[h]);})();</script>` : '',
    '<style>[hidden]{display:none!important}</style>',
  ].filter(Boolean).join('\n');
  return `<!doctype html>\n<html lang="en">\n<head>\n${head}${SHOW_FONT_TOGGLE ? fontToggleHead() : ''}\n</head>\n<body class="${bodyClass}">\n${body}${SHOW_VERSIONS ? versionsButton(slug) : ''}${SHOW_FONT_TOGGLE ? fontToggle() : ''}\n</body>\n</html>\n`;
}

// "Compare versions" button on every page while the version history is on (not inside the compare page's frames)
// Applied in <head> so the chosen font shows from the first paint (also inside the compare page's frames)
function fontToggleHead() {
  return `
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@700;800&display=swap">
<style>html[data-headline="schibsted"]{--font-display:"Schibsted Grotesk","Figtree",system-ui,sans-serif}</style>
<script>try{if(localStorage.getItem('sbf-headline')==='schibsted')document.documentElement.setAttribute('data-headline','schibsted')}catch(e){}</script>`;
}
function fontToggle() {
  return `
<div class="font-pill" role="group" aria-label="Headline font">
  <span class="font-pill-label">Headline font</span>
  <button type="button" data-font="bricolage">Bricolage</button>
  <button type="button" data-font="schibsted">Schibsted</button>
</div>
<style>.font-pill{position:fixed;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;align-items:center;gap:4px;padding:4px 4px 4px 14px;border-radius:999px;background:var(--navy-900);color:var(--white);font:500 13px/20px var(--font-sans);box-shadow:var(--shadow-md)}.font-pill button{padding:6px 12px;border:0;border-radius:999px;background:transparent;color:var(--white);font:700 13px/20px var(--font-sans);cursor:pointer}.font-pill button[data-font="bricolage"]{font-family:"Bricolage Grotesque",var(--font-sans)}.font-pill button[data-font="schibsted"]{font-family:"Schibsted Grotesk",var(--font-sans)}.font-pill button[aria-pressed="true"]{background:var(--white);color:var(--navy-900)}.font-pill button:focus-visible{outline:none;box-shadow:var(--shadow-focus)}@media (max-width:599px){.font-pill{right:12px;padding-left:4px;font-size:12px}.font-pill-label{display:none}.font-pill button{padding:4px 10px;font-size:12px}}</style>
<script>(function(){var pill=document.querySelector('.font-pill');if(window.top!==window.self){pill.remove();return;}
var root=document.documentElement,btns=pill.querySelectorAll('button');
function show(){var f=root.getAttribute('data-headline')==='schibsted'?'schibsted':'bricolage';btns.forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-font')===f))})}
btns.forEach(function(b){b.addEventListener('click',function(){var f=b.getAttribute('data-font');if(f==='schibsted')root.setAttribute('data-headline','schibsted');else root.removeAttribute('data-headline');try{localStorage.setItem('sbf-headline',f)}catch(e){}show()})});show();})();</script>`;
}

function versionsButton(slug) {
  return `
<a class="versions-pill" href="/versions/?page=${slug}">Compare versions</a>
<style>.versions-pill{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;padding:10px 16px;border-radius:999px;background:var(--navy-900);color:var(--white);font:700 14px/20px var(--font-sans);text-decoration:none;box-shadow:var(--shadow-md)}.versions-pill:hover{background:var(--navy-700)}.versions-pill:focus-visible{outline:none;box-shadow:var(--shadow-focus)}@media (max-width:599px){.versions-pill{left:12px;padding:6px 12px;font-size:12px;line-height:16px;opacity:.92}}</style>
<script>if (window.top !== window.self) document.querySelector('.versions-pill').remove();</script>`;
}

const pageSlugs = ['home'].concat(PAGES.map(p => p.slug));
for (const e of fs.readdirSync(OUT, { withFileTypes: true })) {
  if (e.isDirectory() && e.name !== 'img' && !(e.name === 'versions' && SHOW_VERSIONS)) fs.rmSync(path.join(OUT, e.name), { recursive: true, force: true });
}
for (const slug of pageSlugs) {
  if (!SEO[slug]) throw new Error('No SEO entry for ' + slug);
  const dest = slug === 'home' ? OUT : path.join(OUT, slug);
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'index.html'), pageDoc(slug));
}
// Old addresses of pages folded into others forward to the right section
for (const [old, [pg, sec]] of Object.entries(MOVED)) {
  const to = `/${pg}/#${sec}`;
  const name = SEO[pg][0].split(' | ')[0];
  fs.mkdirSync(path.join(OUT, old), { recursive: true });
  fs.writeFileSync(path.join(OUT, old, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(SEO[pg][0])}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${urlFor(pg)}">
<meta http-equiv="refresh" content="0; url=${to}">
<script>location.replace('${to}');</script>
</head>
<body><p>This page is now part of <a href="${to}">${esc(name)}</a>.</p></body>
</html>
`);
}

fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pageSlugs.map(s => `  <url><loc>${urlFor(s)}</loc></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), INDEXABLE
  ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  : 'User-agent: *\nAllow: /\n');
console.log(`seo: ${pageSlugs.length} pages, ${INDEXABLE ? 'INDEXABLE' : 'noindex'}, ${SITE_URL}`);

// Compare versions page: the original site (live), each saved snapshot, and today's site
if (SHOW_VERSIONS) {
  const snapsFile = path.join(OUT, 'versions', 'versions.json');
  if (!fs.existsSync(snapsFile)) {
    console.warn('versions: no snapshots yet; run `node versions.js` once to add the compare page');
  } else {
    const snaps = JSON.parse(fs.readFileSync(snapsFile, 'utf8'));
    const versions = [
      { id: 'before', type: 'live', origin: 'https://sbfchicago.org', date: 'Original', label: 'Before the redesign',
        note: 'sbfchicago.org as it was, shown live.',
        pages: ['home', 'team', 'who-we-serve-chicago', 'who-we-serve-india', 'get-involved', 'youth-leaders', 'items-needed', 'donations', 'sbf-fundraiser', 'in-the-news', 'aug-event'] },
      ...snaps.map(s => Object.assign({ base: `/versions/${s.id}/` }, s)),
      { id: 'today', type: 'pages', base: '/', date: 'Now', label: 'Today', note: 'The site as it is now.', pages: pageSlugs },
    ];
    // Pages to compare; each lists where it lives, oldest address first
    const pages = [
      ['home', 'Home', ['home']],
      ['team', 'Team & Vision', ['team']],
      ['chicago', 'Chicago projects', ['who-we-serve-chicago', 'where-we-serve#chicago']],
      ['india', 'India projects', ['who-we-serve-india', 'where-we-serve#india']],
      ['get-involved', 'Get Involved', ['get-involved']],
      ['youth', 'Youth leadership', ['youth-leaders', 'get-involved#youth-leadership']],
      ['donate', 'Donate', ['donations', 'give#donate']],
      ['items', 'Items needed', ['items-needed', 'give#items']],
      ['fundraisers', 'Fundraisers', ['sbf-fundraiser', 'news-events#upcoming']],
      ['news', 'In the news', ['in-the-news', 'news-events#news']],
      ['membership', 'Membership', ['membership']],
      ['aug-event', 'August 9 event post', ['aug-event']],
    ].map(([key, label, tries]) => ({ key, label, try: tries }));
    const tokens = readT('assets/css/screen.css').match(/:root \{[\s\S]*?\n\}/)[0];
    const page = fs.readFileSync(path.join(__dirname, 'versions.html'), 'utf8')
      .replace('/*TOKENS*/', () => tokens)
      .replace('/*DATA*/', () => JSON.stringify({ versions, pages }).replace(/</g, '\\u003c'));
    fs.writeFileSync(path.join(OUT, 'versions', 'index.html'), page);
    console.log(`versions: compare page with ${versions.length} versions`);
  }
} else {
  fs.rmSync(path.join(OUT, 'versions'), { recursive: true, force: true });
}

// The Claude preview can't frame other sites, so its copy shows placeholders instead of the forms
const holder = (name, href) => `<div class="embed-placeholder"><p>I need the ${name} embed code, so I cannot display the form right now.</p><a class="btn btn-secondary btn-sm" href="${href}">Open the form</a></div>`;
const previewHtml = html.replace(/<iframe[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/iframe>/g, (m, src) => {
  if (src.includes('docs.google.com/forms')) return holder('Google Forms', src.replace(/[?&]embedded=true/, ''));
  if (src.includes('zeffy.com')) return holder('Zeffy', 'https://www.zeffy.com/en-US/donation-form/sbf-chicago-donation');
  if (src.includes('facebook.com')) return '<div class="embed-placeholder"><p class="t-eyebrow">Embedded post</p><p>The Facebook post embed loads here on the live site.</p></div>';
  return m;
});
fs.writeFileSync(path.join(ROOT, 'sbf-chicago-preview.html'), previewHtml);
fs.copyFileSync(path.join(T, 'assets/images/sbf-logo.jpg'), path.join(IMG, 'logo.jpg'));

// Download images
let got = 0;
for (const [url, name] of imgMap) {
  const dest = path.join(OUT, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { got++; continue; }
  const u = name === imgMap.get('https://sbfchicago.org/content/images/size/w600/2026/09/IMG_6248-2.JPEG') ? url.replace('w600', 'w1000') : url;
  try { execFileSync('curl', ['-sfL', u, '-o', dest]); got++; } catch (e) { console.warn('FAILED', u); }
}
const files = fs.readdirSync(IMG);
const bytes = files.reduce((s, f) => s + fs.statSync(path.join(IMG, f)).size, 0);
console.log(`pages: ${PAGES.length + 1}, images: ${files.length} (${(bytes / 1048576).toFixed(1)} MB), html: ${(html.length / 1024).toFixed(0)} KB`);
