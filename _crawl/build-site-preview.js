// Multi-page preview: real sbfchicago.org content → new theme CSS/JS.
// Simulates the finished content checklist (banners removed, infographics → snippets).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const T = path.join(ROOT, 'sbf-aurav-theme');
const OUT = path.join(__dirname, 'preview-site');
const IMG = path.join(OUT, 'img');
fs.rmSync(IMG, { recursive: true, force: true });
fs.mkdirSync(IMG, { recursive: true });

// Theme files may have Windows line endings after a git checkout; read them as LF
const readT = (...a) => fs.readFileSync(path.join(T, ...a), 'utf8').replace(/\r\n/g, '\n');
const snippet = f => readT('content-snippets', f).replace(/<!--[\s\S]*?-->/g, '').trim();

const PAGES = [
  { slug: 'team', title: 'SBF Vision and Team', eyebrow: 'Who we are' },
  { slug: 'who-we-serve-chicago', title: 'Chicago Projects', eyebrow: 'Chicagoland', band: 'chicago', donate: true },
  { slug: 'who-we-serve-india', title: 'India Projects', eyebrow: 'India', band: 'india' },
  { slug: 'items-needed', title: 'Items Needed', layout: 'items' },
  { slug: 'get-involved', title: 'Get Involved!', split: true, packing: true },
  { slug: 'in-the-news', title: 'In the news...', eyebrow: 'Milestones and press' },
  { slug: 'youth-leaders', title: 'Youth Leaders', split: true },
  { slug: 'sbf-fundraiser', title: 'SBF Fundraiser', eyebrow: 'Fundraisers' },
  { slug: 'membership', title: 'Become a member', layout: 'membership', nocontent: true },
  { slug: 'donations', title: 'Donations', layout: 'donations' },
  { slug: 'aug-event', title: 'August 9 Chicago Food Packing Event', post: true, band: 'chicago',
    date: 'Aug 10, 2026', readingTime: '3 min read',
    feature: 'https://sbfchicago.org/content/images/2026/08/WhatsApp-Image-2026-08-10-at-1.47.25-PM--2--1.jpeg' },
];
const SLUGS = new Set(PAGES.map(p => p.slug).concat(['home']));

/* ---------- image localisation ---------- */
const imgMap = new Map();
let imgCount = 0;
function localImg(src) {
  if (!src || !/sbfchicago\.org\/content\/(images|media)\//.test(src)) return null;
  if (/\.ico$/i.test(src)) return null;
  let url = src.replace(/\/content\/images\/size\/w\d+\//, '/content/images/');
  if (/\/content\/images\/20\d\d\//.test(url)) url = url.replace('/content/images/', '/content/images/size/w600/');
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
  // checklist: infographics → live HTML snippets
  figOf('chicago-sept.jpg').forEach(f => replaceWith(f, snippet('chicago-impact.html')));
  figOf('our_partners-grid').forEach(f => replaceWith(f, snippet('chicago-partners.html')));
  figOf('India-top.png').forEach(f => replaceWith(f, snippet('india-impact.html')));
  figOf('india-middle-sept').forEach(f => f.remove());
  figOf('india-bottom-sept').forEach(f => replaceWith(f, snippet('india-drives.html')));

  // Cloudflare-obfuscated emails → plain text
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

  // Images → local files
  box.querySelectorAll('img').forEach(img => {
    img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.removeAttribute('onerror');
    const src = img.getAttribute('src');
    if (/meet_our_/.test(src)) return; // theme JS swaps these for live headings
    const local = localImg(src);
    if (local) img.setAttribute('src', local); else if (/sbfchicago\.org/.test(src)) img.remove();
    img.setAttribute('loading', 'lazy');
  });
  box.querySelectorAll('[style*="white-space"]').forEach(n => n.removeAttribute('style'));
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
      <div class="cta-actions"><a class="btn btn-primary" href="https://sbfchicago.org/donations/">Donate</a></div>
    </div>
  </div>
</section>`;

const STATS = [['6,100+', 'Meals from our Chicago food drives'], ['18,500+', 'Meals from our India food drives'], ['5,100+', 'Peanut butter sandwiches packed, Jan to Sept 2026']];

// Minimal render of a theme partial for the preview: the page has no excerpt or
// feature image, so every {{#if x}}a{{else}}b{{/if}} takes its else branch.
function renderPartial(name, params) {
  const pkg = JSON.parse(readT('package.json'));
  const defs = Object.fromEntries(Object.entries(pkg.config.custom).map(([k, v]) => [k, v.default || '']));
  let h = readT('partials', name + '.hbs');
  h = h.replace(/\{\{!--[\s\S]*?--\}\}/g, '');
  h = h.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
  h = h.replace(/\{\{@custom\.(\w+)\}\}/g, (m, k) => defs[k] || '');
  h = h.split('{{@site.url}}').join('https://sbfchicago.org');
  h = h.replace(/\{\{(\w+)\}\}/g, (m, k) => params[k] != null ? params[k] : '');
  h = h.replace(/src="(https:\/\/sbfchicago\.org\/content\/images\/[^"]+)"/g, (m, u) => 'src="' + localImg(u) + '"');
  if (h.includes('{{')) throw new Error('Unrendered Handlebars in ' + name + ': ' + h.slice(h.indexOf('{{'), h.indexOf('{{') + 60));
  return h;
}

// Read the hash params a template passes to page-hero-split
function splitParams(slug) {
  const tpl = readT(`page-${slug}.hbs`);
  const call = tpl.match(/\{\{> "page-hero-split"([^}]*)\}\}/)[1];
  const pkg = JSON.parse(readT('package.json'));
  const out = {};
  for (const m of call.matchAll(/(\w+)=(?:"([^"]*)"|@custom\.(\w+))/g)) out[m[1]] = m[2] != null ? m[2] : pkg.config.custom[m[3]].default;
  return out;
}

// Params a template passes to any partial call
function partialParams(slug, name) {
  const tpl = readT(`page-${slug}.hbs`);
  const m = tpl.match(new RegExp('\\{\\{> "' + name + '"([^}]*)\\}\\}'));
  if (!m) return null;
  const pkg = JSON.parse(readT('package.json'));
  const out = {};
  for (const x of m[1].matchAll(/(\w+)=(?:"([^"]*)"|@custom\.(\w+))/g)) out[x[1]] = x[2] != null ? x[2] : pkg.config.custom[x[3]].default;
  return out;
}

// The artifact sandbox can't frame other sites, so the embedded form shows as a labelled placeholder
function signupSection(slug) {
  const params = partialParams(slug, 'signup-form');
  if (!params) return '';
  return renderPartial('signup-form', params);
}

function shell(p, content, doc) {
  if (p.split) {
    const tpl = readT(`page-${p.slug}.hbs`);
    const formFirst = tpl.indexOf('"signup-form"') < tpl.indexOf('"page-body"');
    return renderPartial('page-hero-split', Object.assign({ title: p.title }, splitParams(p.slug)))
      + (p.packing ? renderPartial('packing-day', {}) : '')
      + (formFirst ? signupSection(p.slug) : '')
      + `<article class="band-page-plain"><div class="gh-canvas gh-content">${content}</div></article>`
      + (formFirst ? '' : signupSection(p.slug));
  }
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
  if (p.layout === 'donations') {
    return `<article class="band-page-plain">${hero().replace('<p class="t-eyebrow"></p>', '<p class="t-eyebrow">Donate</p>')}
      <div class="page-split"><div class="container page-split-grid">
        <aside class="page-split-aside" aria-label="Your impact">
          <div class="aside-card band-navy on-navy">
            <p class="t-eyebrow">What your gifts have done in 2026</p>
            <ul class="aside-stats" role="list">${STATS.map(([v, l]) => `<li><span class="t-stat">${v}</span><span class="t-small">${l}</span></li>`).join('')}</ul>
          </div>
          <div class="aside-card">
            <p class="t-eyebrow">Other ways to give</p>
            <ul>
              <li>Zelle to sbfchicago@gmail.com</li>
              <li><a href="https://www.amazon.com/hz/wishlist/ls/20JFGIHHFZVGK">Send items from our Amazon Wishlist</a></li>
              <li><a href="https://sbfchicago.org/items-needed/">Sign up to bring items to the next food drive</a></li>
            </ul>
          </div>
        </aside>
        <div class="page-split-main gh-content">${content}</div>
      </div></div></article>`;
  }
  if (p.layout === 'items') {
    const amazon = transform(fs.readFileSync(path.join(__dirname, 'content', 'we-have-an-amazon-wish-list.html'), 'utf8'), doc);
    // Mirrors page-items-needed.hbs: photo hero, two ways to give, shopping list + form
    return renderPartial('page-hero-split', Object.assign({ title: p.title }, splitParams(p.slug)))
      + renderPartial('give-items', {})
      + `<article class="band-page-india">
      <div class="page-split"><div class="container page-split-grid">
        <aside class="page-split-aside" aria-label="Shopping list">
          <div class="aside-card band-india gh-content shopping-list">
            <p class="t-eyebrow">Shopping list</p>
            <h3 class="t-h3">What one packing event needs</h3>
            ${amazon}
          </div>
        </aside>
        <div class="page-split-main gh-content" id="items-form">${content}</div>
      </div></div></article>`;
  }
  const meta = p.post ? `
        <p class="t-small page-hero-meta"><span>By Anuj Saxena</span><span>${p.readingTime}</span></p>
        <figure class="page-hero-feature"><img src="${localImg(p.feature)}" alt="Volunteers packing food at the August 9 event"></figure>` : '';
  return `<article class="band-page-${band || 'plain'}">${hero(meta)}
    <div class="gh-canvas gh-content">${content}</div></article>${p.donate || p.post ? donatePanel : ''}`;
}


// Homepage: render the real home.hbs with the theme's default settings
function renderHome(cardHtml) {
  const pkg = JSON.parse(readT('package.json'));
  const defs = Object.fromEntries(Object.entries(pkg.config.custom).map(([k, v]) => [k, v.default || '']));
  const partial = n => readT('partials', n + '.hbs').trim();
  let h = readT('home.hbs');
  // Replace the text between two literal markers (inclusive)
  const cut = (str, start, end, withText) => {
    const a = str.indexOf(start), b = str.indexOf(end, a);
    if (a < 0 || b < 0) throw new Error('marker not found: ' + start);
    return str.slice(0, a) + withText + str.slice(b + end.length);
  };
  h = h.replace(/\{\{!<[^}]*\}\}/g, '').replace(/\{\{!--[\s\S]*?--\}\}/g, '');
  h = cut(h, '{{#if @custom.hero_image}}', '{{/get}}\n            {{/if}}',
    '<figure class="tile-lead"><img src="' + localImg('https://sbfchicago.org/content/images/2026/09/IMG_6248-2.JPEG') + '" alt="Volunteers, youth leaders and families at the September 13 food packing event" loading="lazy"><figcaption>September 13 Chicago Food Packing Event</figcaption></figure>');
  h = cut(h, '{{#foreach posts', '{{/foreach}}', cardHtml);
  h = h.replace(/\{\{> "([\w-]+)"\}\}/g, (m, n) => partial(n));
  h = h.replace(/\{\{@custom\.(\w+)\}\}/g, (m, k) => defs[k] != null ? defs[k] : '');
  h = h.split('{{@site.url}}').join('https://sbfchicago.org');
  h = h.replace(/src="(https:\/\/sbfchicago\.org\/content\/images\/[^"]+)"/g, (m, u) => 'src="' + localImg(u) + '"');
  if (h.includes('{{')) throw new Error('Unrendered Handlebars in home: ' + h.slice(h.indexOf('{{'), h.indexOf('{{') + 60));
  return h;
}

/* ---------- build ---------- */
const src = fs.readFileSync(path.join(__dirname, 'preview.src.html'), 'utf8');
const dom = new JSDOM('<!doctype html><body></body>');
const doc = dom.window.document;

let pagesHtml = '';
for (const p of PAGES) {
  const raw = p.nocontent ? '' : fs.readFileSync(path.join(__dirname, 'content', p.slug + '.html'), 'utf8');
  const cls = p.post ? 'post-template' : `page-template page-${p.slug}`;
  pagesHtml += `\n<div data-page="${p.slug}" data-bodyclass="${cls}" class="${cls}" hidden>${shell(p, transform(raw, doc), doc)}</div>`;
}

// Homepage cards from the first preview, pointed at local images
const homeCards = require('./home-cards.json');
const cardHtml = homeCards.slice(0, 3).map(c => `
      <article class="event-card">
        <div class="event-card-media"><img src="${localImg(c.img)}" alt="${c.title}" loading="lazy"></div>
        <div class="event-card-body">
          <p class="t-eyebrow event-card-date">${c.date}</p>
          <h3 class="t-h3 event-card-title"><a href="https://sbfchicago.org/${c.slug}/">${c.title}</a></h3>
          <p class="event-card-excerpt">${c.excerpt}</p>
          <p class="t-small event-card-meta">${c.kind} &middot; ${c.rt}</p>
        </div>
      </article>`).join('');

let html = src
  .replace('/*CARDS_CSS*/', () => fs.readFileSync(path.join(__dirname, 'ghost', 'cards.min.css'), 'utf8'))
  .replace('/*CSS*/', () => readT('assets/css/screen.css'))
  .replace('/*JS*/', () => readT('assets/js/site.js'))
  .replace('<!--HOME-->', () => renderHome(cardHtml))
  .replace('<!--PAGES-->', () => pagesHtml)
  .replace(/\{\{IMG:logo\}\}/g, 'img/logo.jpg');

// Internal links → in-preview routes
html = html.replace(/href="(?:https?:\/\/sbfchicago\.org)?\/+([a-z0-9-]*)\/?(?:\?[^"]*)?"/g, (m, slug) => {
  if (slug === '') return 'href="#home"';
  return SLUGS.has(slug) ? `href="#${slug}"` : `href="https://sbfchicago.org/${slug}/"`;
});

// Two outputs from the same page:
// 1. preview-site/index.html: a complete HTML document for real hosting (Cloudflare Pages etc).
//    Without the doctype and viewport tag, phones render it as a shrunken 980px desktop page.
// 2. ../sbf-chicago-preview.html: the bare fragment for the Claude artifact viewer, which adds
//    its own <!doctype>, <head> and viewport tag and must not get a second set.
const titleTag = (html.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
const fullDoc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="SBF Chicago: a youth-led nonprofit packing meals for neighbors facing hunger in Chicagoland and India.">
${titleTag}
<style>[hidden]{display:none!important}</style>
</head>
<body>
${html.replace(titleTag, '')}
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), fullDoc);
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
