// Recreates past versions of the site from git history for the "Compare versions" page.
// Run it once (and again only when MILESTONES changes):  node versions.js
// Output goes to dist/versions/, which build.js keeps and links to while SHOW_VERSIONS is on.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'dist', 'versions');
const TMP = path.join(__dirname, '.versions-tmp');
const CACHE = path.join(__dirname, '.cache', 'img');

// Milestones worth comparing. Older ones were committed with their built site (type "spa":
// one page, #links); newer ones are rebuilt from that commit's build script (type "pages").
const MILESTONES = [
  { id: 'first-redesign', commit: '1d3428a', date: '2026-09-27', type: 'spa', label: 'First redesign',
    note: 'The four-act homepage and every page in the new design.' },
  { id: 'membership', commit: '86d0356', date: '2026-09-28', type: 'spa', label: 'Live forms and membership',
    note: 'Zeffy and Google forms on the pages, and Subscribe became the membership page.' },
  { id: 'projects-menu', commit: '2d68ffd', date: '2026-10-03', type: 'spa', label: 'Projects menu',
    note: 'Chicago and India Projects moved under one Projects dropdown.' },
  { id: 'youth-merged', commit: 'b2b067a', date: '2026-10-20', type: 'pages', label: 'Youth leadership in Get Involved',
    note: 'Real page addresses, and Youth Leadership became a section of Get Involved.' },
  { id: 'give-news', commit: '4e450f5', date: '2026-10-20', type: 'pages', label: 'Give, and News & Events',
    note: 'Donations and Items Needed became Give; Fundraiser and In the News became News & Events.' },
  { id: 'where-we-serve', commit: 'da93c0d', date: '2026-10-20', type: 'pages', label: 'Where We Serve',
    note: 'Chicago and India Projects became one page, and the nav went to five plain links.' },
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

// Photos are shared by every version: stored once, named by their contents
function storeImage(file) {
  const ext = path.extname(file).toLowerCase();
  const name = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 16) + ext;
  const dest = path.join(OUT, 'img', name);
  if (!fs.existsSync(dest)) fs.copyFileSync(file, dest);
  return name;
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'img' ? [] : htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

const manifest = [];
for (const m of MILESTONES) {
  const tmp = path.join(TMP, m.id);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  // That commit's files, unpacked without touching the working copy
  const archive = execFileSync('git', ['archive', '--format=tar', m.commit], { cwd: ROOT, maxBuffer: 1 << 28 });
  execFileSync('tar', ['-xf', '-'], { cwd: tmp, input: archive });

  let src;
  if (m.type === 'spa') {
    src = path.join(tmp, '_crawl', 'preview-site');
  } else {
    // That commit's own build script, with its image downloads served from a shared cache
    console.log(`building ${m.id} (${m.commit})...`);
    execFileSync(process.execPath, ['-r', path.join(__dirname, 'versions-cache.js'), 'build.js'], {
      cwd: path.join(tmp, 'build'),
      env: Object.assign({}, process.env, { NODE_PATH: path.join(__dirname, 'node_modules'), SBF_IMG_CACHE: CACHE }),
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    src = path.join(tmp, 'build', 'dist');
  }

  const imgs = {};
  for (const f of fs.readdirSync(path.join(src, 'img'))) imgs[f] = storeImage(path.join(src, 'img', f));

  const base = `/versions/${m.id}/`;
  const pages = [];
  for (const file of htmlFiles(src)) {
    const rel = path.relative(src, file).split(path.sep).join('/');
    if (rel.startsWith('_')) continue; // test pages
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/(["'(])\/?img\/([\w.-]+)/g, (all, q, f) => imgs[f] ? `${q}/versions/img/${imgs[f]}` : all);
    if (m.type === 'pages') {
      // Links within that version stay within that version
      html = html.replace(/href="\/(?!\/|versions\/)/g, `href="${base}`)
        .replace(/url=\/(?!versions\/)/g, `url=${base}`)
        .replace(/location\.replace\('\/(?!versions\/)/g, `location.replace('${base}`)
        .replace(/":"\/(?!versions\/)/g, `":"${base}`);
    }
    const dest = path.join(OUT, m.id, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, html);
    if (m.type === 'spa') {
      for (const x of html.matchAll(/data-page="([a-z0-9-]+)"/g)) pages.push(x[1]);
    } else if (rel.endsWith('/index.html') || rel === 'index.html') {
      if (!/location\.replace/.test(html) || rel === 'index.html') pages.push(rel === 'index.html' ? 'home' : rel.split('/')[0]);
    }
  }
  manifest.push({ id: m.id, commit: m.commit, date: m.date, type: m.type, label: m.label, note: m.note, pages: [...new Set(pages)] });
  console.log(`${m.id}: ${pages.length} pages, ${Object.keys(imgs).length} photos`);
}

fs.writeFileSync(path.join(OUT, 'versions.json'), JSON.stringify(manifest, null, 1));
fs.rmSync(TMP, { recursive: true, force: true });
const n = fs.readdirSync(path.join(OUT, 'img')).length;
console.log(`versions: ${manifest.length} snapshots, ${n} shared photos`);
