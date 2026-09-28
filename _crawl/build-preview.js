// Builds the static preview from the theme's real CSS/JS + real site content.
const fs = require('fs');
const path = require('path');
const T = path.join(__dirname, '..', 'sbf-aurav-theme');
const P = path.join(__dirname, 'prev');

const uri = (f, type) => `data:${type};base64,` + fs.readFileSync(f).toString('base64');
const img = {
  logo: uri(path.join(T, 'assets/images/sbf-logo.jpg'), 'image/jpeg'),
  hero: uri(path.join(P, 'hero.jpg'), 'image/jpeg'),
};

// Real posts, newest first, excerpts copied from the live site
const posts = [
  ['sep.jpg', 'image/jpeg', 'Sep 14, 2026', 'sept-event', 'September 13 Chicago Food Packing Event', 'Thanks to all those that could join us or supported us by donating money and/or sending items from our Amazon Wishlist. The Youth Leaders for this event were Aanya Mehta and Bryce Batterton.', 'Chicago food packing', '2 min read'],
  ['amazon.png', 'image/png', 'Sep 13, 2026', 'we-have-an-amazon-wish-list', 'We have an Amazon wish list for our food drives…', 'You can help us buy items for our food drives using the following link. Items needed for 500 sandwiches/brown bags: peanut butter, jelly, chips, granola bars and more.', 'Update', '1 min read'],
  ['dq.jpg', 'image/jpeg', 'Aug 23, 2026', 'palatine-dq-fundraiser', 'Thank you for joining us at our DQ fundraiser!', 'YOU made an impact! We had almost 40+ people join us on August 28th for our first fundraiser at Dairy Queen. We thank Palatine DQ for hosting this event.', 'Update', '1 min read'],
  ['aug.jpg', 'image/jpeg', 'Aug 10, 2026', 'aug-event', 'August 9 Chicago Food Packing Event', 'We packed 1200+ sandwiches and 650 brown bags at our August food packing event! Special shoutout to National India Hub for hosting us and their partnership.', 'Chicago food packing', '3 min read'],
  ['jun.jpg', 'image/jpeg', 'Jun 14, 2026', 'june-event', 'June 14 Chicago Food Packing Event', 'We packed 1250+ sandwiches and 650 brown bags at our June food packing event! Thanks for joining hand to help feed the needy.', 'Chicago food packing', '3 min read'],
  ['may.jpg', 'image/jpeg', 'Jun 3, 2026', 'sbf-junior-board-nabeela-syed', 'SBF Junior Board meets with IL State Representative Nabeela Syed', 'On Monday May 4th, SBF Junior Board met with IL State Representative Nabeela Syed during her monthly office hours at the Palatine Public Library.', 'Update', '2 min read'],
];
const cards = posts.map(([f, t, date, slug, title, ex, kind, rt]) => `
      <article class="event-card">
        <div class="event-card-media"><img src="${uri(path.join(P, f), t)}" alt="${title}" loading="lazy"></div>
        <div class="event-card-body">
          <p class="t-eyebrow event-card-date">${date}</p>
          <h3 class="t-h3 event-card-title"><a href="https://sbfchicago.org/${slug}/">${title}</a></h3>
          <p class="event-card-excerpt">${ex}</p>
          <p class="t-small event-card-meta">${kind} &middot; ${rt}</p>
        </div>
      </article>`).join('');

let html = fs.readFileSync(path.join(__dirname, 'preview.src.html'), 'utf8');
html = html
  .replace('/*CSS*/', () => fs.readFileSync(path.join(T, 'assets/css/screen.css'), 'utf8'))
  .replace('/*JS*/', () => fs.readFileSync(path.join(T, 'assets/js/site.js'), 'utf8'))
  .replace('<!--CARDS-->', () => cards)
  .replace(/\{\{IMG:(\w+)\}\}/g, (_, k) => img[k]);
const out = path.join(__dirname, '..', 'sbf-chicago-preview.html');
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
