(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       Helpers
       ---------------------------------------------------------------------- */
    var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    var DATE_AT_START = /^([A-Z][a-z]+\.?\s+\d{1,2},\s*\d{4})/;

    function parseDate(s) {
        var m = String(s).match(/([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})/);
        if (!m) return null;
        var mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
        return mo == null ? null : new Date(+m[3], mo, +m[2]);
    }
    function isoDate(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }
    function txt(n) { return n ? (n.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
    function isHr(n) { return !!n && n.tagName === 'HR'; }
    function has(n, cls) { return !!n && n.classList && n.classList.contains(cls); }
    function ownText(li) {
        var c = li.cloneNode(true);
        Array.prototype.forEach.call(c.querySelectorAll('ul, ol'), function (x) { x.remove(); });
        return txt(c);
    }
    // Consecutive direct children of `content` that pass `test`
    function runs(content, test) {
        var out = [], cur = [];
        Array.prototype.forEach.call(content.children, function (c) {
            if (test(c)) { cur.push(c); } else { if (cur.length) out.push(cur); cur = []; }
        });
        if (cur.length) out.push(cur);
        return out;
    }
    function wrap(nodes, cls, tag) {
        var w = el(tag || 'div', cls + ' sbf-wide');
        nodes[0].parentNode.insertBefore(w, nodes[0]);
        nodes.forEach(function (n) { w.appendChild(n); });
        return w;
    }
    // Remove dividers sitting between two items of the same kind
    function dropDividersBetween(items, cls) {
        items.forEach(function (it) {
            var n = it.nextElementSibling;
            if (isHr(n) && has(n.nextElementSibling, cls)) n.remove();
        });
    }
    function secondary(btn) { btn.classList.add('is-secondary'); }

    var ICON = {
        volunteer: '<path d="M5 8h14l-1.2 12.5H6.2L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
        buy: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.4 11h10.2L20 8H6.2"/>',
        donate: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
        lead: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
        spread: '<path d="M3 10v4h3l7 4V6l-7 4H3z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
        instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
        facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
        linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7.5 10v7M7.5 7v.01M11.5 17v-4a2 2 0 0 1 4 0v4M11.5 10v7"/>'
    };
    function icon(name) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '0 0 24 24');
        s.setAttribute('aria-hidden', 'true');
        s.setAttribute('fill', 'none');
        s.setAttribute('stroke', 'currentColor');
        s.setAttribute('stroke-width', '1.8');
        s.setAttribute('stroke-linecap', 'round');
        s.setAttribute('stroke-linejoin', 'round');
        s.innerHTML = ICON[name];
        return s;
    }

    // Image cards that link to a social profile (the site uses QR-code images) → real links
    var SOCIAL = /instagram|facebook|linkedin/;
    function socialLinks(content) {
        runs(content, function (c) {
            var a = has(c, 'kg-image-card') && c.querySelector('a');
            return !!a && SOCIAL.test(a.href);
        }).forEach(function (r) {
            var ul = el('ul', 'social-links');
            r.forEach(function (f) {
                var href = f.querySelector('a').getAttribute('href');
                var net = (href.match(SOCIAL) || [''])[0];
                var name = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn' }[net] || net;
                var a = el('a');
                a.href = href;
                a.append(icon(net), document.createTextNode(net === 'instagram' ? '@sbfchicago on Instagram' : 'SBF Chicago on ' + name));
                var li = el('li');
                li.append(a);
                ul.append(li);
            });
            r[0].parentNode.insertBefore(ul, r[0]);
            r.forEach(function (f) { f.remove(); });
        });
    }

    /* ----------------------------------------------------------------------
       Every page and post
       ---------------------------------------------------------------------- */
    function generic(content) {
        socialLinks(content);

        // "Collaborative Partners & sponsors:" → no trailing colon on headings
        Array.prototype.forEach.call(content.querySelectorAll(':scope > h2, :scope > h3'), function (h) {
            var last = h.lastChild;
            while (last && last.nodeType !== 3 && last.lastChild) last = last.lastChild;
            if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s*:\s*$/, '');
        });

        // A run of button cards is a list of links, not the page's one CTA
        runs(content, function (c) { return has(c, 'kg-button-card'); }).forEach(function (r) {
            if (r.length < 2) return;
            wrap(r, 'btn-row');
            r.forEach(function (c) { Array.prototype.forEach.call(c.querySelectorAll('.kg-btn'), secondary); });
        });
        Array.prototype.forEach.call(content.querySelectorAll('.kg-btn'), function (b) {
            var label = txt(b);
            if (/^https?:\/\//i.test(label)) {
                b.textContent = label.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
                secondary(b);
            }
            if (/^(home|main page)$/i.test(label)) secondary(b);
        });

        // A run of link previews becomes a card grid
        runs(content, function (c) { return has(c, 'kg-bookmark-card'); }).forEach(function (r) {
            if (r.length > 1) wrap(r, 'bookmark-grid');
        });

        // CTA card (or a heading) followed by link previews → one help panel
        Array.prototype.slice.call(content.children).forEach(function (c) {
            var isCta = has(c, 'kg-cta-card');
            var isHeading = /^H[23]$/.test(c.tagName) && txt(c);
            if (!isCta && !isHeading) return;
            var group = [c], n = c.nextElementSibling;
            while (n && /^H[23]$/.test(n.tagName) && !txt(n)) { group.push(n); n = n.nextElementSibling; }
            if (has(n, 'kg-bookmark-card') || (isCta && has(n, 'bookmark-grid'))) {
                group.push(n);
                wrap(group, 'help-panel');
            }
        });
    }

    /* ----------------------------------------------------------------------
       Team & vision: header cards → people grid
       ---------------------------------------------------------------------- */
    function team(content) {
        // Vision intro = the paragraphs before the first divider
        var intro = [];
        for (var c = content.firstElementChild; c && !isHr(c); c = c.nextElementSibling) {
            if (c.tagName === 'P') intro.push(c);
        }
        intro = intro.filter(function (p) { if (!txt(p)) { p.remove(); return false; } return true; });
        if (intro.length >= 2) {
            intro.forEach(function (p) {
                var t = txt(p), strong = p.querySelector('strong');
                if (/^pack\.?\s*feed\.?\s*make a difference\.?$/i.test(t)) {
                    p.className = 'hero-tagline';
                    p.textContent = 'Pack. Feed. Make a difference.';
                } else if (strong && txt(strong) === t) {
                    p.className = 'vision-title';
                }
            });
            wrap(intro, 'vision', 'section');
        }

        // Section-heading images → live headings
        var headings = {
            meet_our_founders: 'Meet our founders',
            meet_our_junior_board: 'Meet our junior board members',
            meet_our_executive: 'Meet our executive team'
        };
        Array.prototype.forEach.call(content.querySelectorAll('.kg-image-card img'), function (img) {
            Object.keys(headings).forEach(function (k) {
                if (img.getAttribute('src').indexOf(k) > -1) img.closest('figure').replaceWith(el('h2', 'team-heading', headings[k]));
            });
        });

        // Header cards → person cards
        Array.prototype.forEach.call(content.querySelectorAll(':scope > .kg-header-card'), function (card) {
            var full = txt(card.querySelector('.kg-header-card-heading'));
            var bio = card.querySelector('.kg-header-card-subheading');
            var img = card.querySelector('img.kg-header-card-image, .kg-header-card-image img');
            var open = /\(open position\)/i.test(full);
            var pc = el('article', 'person-card' + (open ? ' is-open' : ''));

            if (open) {
                var link = el('a', 'link-arrow', 'Get involved');
                link.href = '/get-involved/';
                pc.append(el('p', 't-eyebrow', 'Open position'), el('h3', 't-h3', full.replace(/\s*\(open position\)\s*/i, '')), link);
            } else {
                var i = full.indexOf(','), name = i > 0 ? full.slice(0, i).trim() : full, role = i > 0 ? full.slice(i + 1).trim() : '';
                var top = el('div', 'person-card-top'), who = el('div');
                if (img) {
                    var photo = el('img');
                    photo.src = img.getAttribute('src');
                    photo.alt = name;
                    photo.loading = 'lazy';
                    top.append(photo);
                }
                if (role) who.append(el('p', 't-eyebrow', role));
                who.append(el('h3', 't-h3', name));
                top.append(who);
                pc.append(top);
                if (bio) {
                    var b = el('div', 'person-bio');
                    while (bio.firstChild) b.appendChild(bio.firstChild);
                    pc.append(b);
                }
            }
            card.replaceWith(pc);
        });
        runs(content, function (c) { return has(c, 'person-card'); }).forEach(function (r) { wrap(r, 'people-grid'); });
    }

    /* ----------------------------------------------------------------------
       India projects: "Project N: Title" + captioned photo → project cards
       ---------------------------------------------------------------------- */
    function india(content) {
        var cards = [];
        Array.prototype.slice.call(content.children).forEach(function (p) {
            if (p.tagName !== 'P') return;
            var m = txt(p).match(/^Project\s*(\d+)\s*:\s*(.+)$/i);
            var fig = p.nextElementSibling;
            if (!m || !has(fig, 'kg-image-card')) return;
            var img = fig.querySelector('img'), cap = fig.querySelector('figcaption');
            var card = el('article', 'project-card');
            var media = el('div', 'project-card-media');
            ['width', 'height', 'srcset', 'sizes', 'class'].forEach(function (a) { img.removeAttribute(a); });
            if (!img.alt) img.alt = m[2].trim();
            media.append(img);
            var body = el('div', 'project-card-body');
            body.append(el('p', 't-eyebrow', 'Project ' + m[1]), el('h3', 't-h3', m[2].trim()));
            if (cap) body.append(el('p', null, txt(cap)));
            card.append(media, body);
            p.replaceWith(card);
            fig.remove();
            cards.push(card);
        });
        if (!cards.length) return;
        dropDividersBetween(cards, 'project-card');
        runs(content, function (c) { return has(c, 'project-card'); }).forEach(function (r) {
            var grid = wrap(r, 'project-grid');
            grid.parentNode.insertBefore(el('h2', 'sbf-wide', 'Our projects'), grid);
        });
    }

    /* ----------------------------------------------------------------------
       In the news: "Month D, YYYY - text" + media → timeline; callouts → quotes
       ---------------------------------------------------------------------- */
    function news(content) {
        var items = [];
        Array.prototype.slice.call(content.children).forEach(function (p) {
            if (p.tagName !== 'P') return;
            var m = txt(p).match(/^([A-Z][a-z]+\.?\s+\d{1,2},\s*\d{4})\s*[-–—]\s*(.+)$/);
            if (!m) return;
            var li = el('li', 'timeline-item');
            var time = el('time', 't-eyebrow', m[1]), d = parseDate(m[1]);
            if (d) time.dateTime = isoDate(d);
            li.append(time, el('p', 'timeline-text', m[2]));
            var n = p.nextElementSibling;
            while (n && !isHr(n) && n.tagName !== 'H2' && !(n.tagName === 'P' && DATE_AT_START.test(txt(n)))) {
                var nn = n.nextElementSibling;
                li.append(n);
                n = nn;
            }
            p.replaceWith(li);
            items.push(li);
        });
        if (items.length) {
            dropDividersBetween(items, 'timeline-item');
            runs(content, function (c) { return has(c, 'timeline-item'); }).forEach(function (r) { wrap(r, 'timeline', 'ol'); });
        }

        Array.prototype.forEach.call(content.querySelectorAll('.kg-callout-card'), function (c) {
            var t = txt(c.querySelector('.kg-callout-text') || c), i = t.lastIndexOf(' - ');
            if (i < 0) return;
            var quote = t.slice(0, i).trim().replace(/^["“]\s*/, '').replace(/\s*["”]$/, '');
            var who = t.slice(i + 3).trim(), wm = who.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
            var fig = el('figure', 'quote-card kg-card');
            var bq = el('blockquote');
            bq.append(el('p', null, quote));
            var cap = el('figcaption'), cite = el('cite', null, wm ? wm[1] : who);
            if (wm) cite.append(el('span', null, wm[2]));
            cap.append(cite);
            fig.append(bq, cap);
            c.replaceWith(fig);
        });
        runs(content, function (c) { return has(c, 'quote-card'); }).forEach(function (r) { wrap(r, 'quote-grid'); });
    }

    /* ----------------------------------------------------------------------
       Youth leadership: hours → tiles, other roles → chips, leaders → wall
       ---------------------------------------------------------------------- */
    function youth(content) {
        var ul = content.querySelector(':scope > ul');
        if (ul) {
            var offer = el('div', 'youth-offer'), tiles = 0;
            Array.prototype.forEach.call(ul.querySelectorAll(':scope > li'), function (li) {
                var subs = li.querySelectorAll(':scope > ul > li');
                var lead = ownText(li).replace(/:\s*$/, '');
                var hours = el('div', 'hours'), chips = el('ul', 'chip-list');
                Array.prototype.forEach.call(subs, function (s) {
                    var m = txt(s).match(/^([^:]+):\s*(\d+)\s*hours?\s*(?:\((.*)\))?/i);
                    if (m) {
                        var tile = el('div', 'hours-tile');
                        var stat = el('p', 't-stat', m[2]);
                        stat.append(el('small', null, 'hours'));
                        tile.append(el('p', 't-eyebrow', m[1].trim()), stat);
                        if (/lead/i.test(m[1])) tile.classList.add('is-lead');
                        if (m[3]) {
                            var duties = el('ul', 'duties');
                            m[3].replace(/^includes\s+/i, '').split(/,\s*/).forEach(function (d) {
                                d = d.trim();
                                if (d) duties.append(el('li', null, d.charAt(0).toUpperCase() + d.slice(1)));
                            });
                            tile.append(duties);
                        }
                        hours.append(tile);
                        tiles++;
                    } else {
                        chips.append(el('li', null, txt(s)));
                    }
                });
                offer.append(el('h3', 't-h3', lead));
                offer.append(hours.children.length ? hours : chips);
            });
            if (tiles) ul.replaceWith(offer);
        }

        var cards = [];
        Array.prototype.slice.call(content.children).forEach(function (f) {
            if (f.tagName !== 'FIGURE') return;
            var cap = txt(f.querySelector('figcaption'));
            var m = cap.match(/^(.*?\d{4})\s*youth leaders?\s*[-–]\s*(.+)$/i);
            if (!m) return;
            var card = el('article', 'leader-card'), media = el('div', 'leader-card-media');
            Array.prototype.slice.call(f.querySelectorAll('img'), 0, 2).forEach(function (img) {
                ['width', 'height', 'srcset', 'sizes', 'class'].forEach(function (a) { img.removeAttribute(a); });
                if (!img.alt) img.alt = 'Youth leaders: ' + m[2];
                media.append(img);
            });
            var body = el('div', 'leader-card-body');
            var d = parseDate(m[1]), time = el('time', 't-eyebrow', m[1]);
            if (d) time.dateTime = isoDate(d);
            body.append(time, el('h3', 't-h3', m[2].trim()));
            card.append(media, body);
            f.replaceWith(card);
            cards.push(card);
        });
        if (cards.length) {
            dropDividersBetween(cards, 'leader-card');
            runs(content, function (c) { return has(c, 'leader-card'); }).forEach(function (r) {
                var wall = wrap(r, 'leader-wall');
                wall.parentNode.insertBefore(el('h2', 'sbf-wide', 'Our youth leaders'), wall);
            });
        }
    }

    /* ----------------------------------------------------------------------
       Fundraiser: "Date (Day) @ Venue" + Location/Time → dated event cards
       ---------------------------------------------------------------------- */
    function fundraiser(content) {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var cards = [], summary = null;
        Array.prototype.slice.call(content.children).forEach(function (ul) {
            if (ul.tagName !== 'UL') return;
            var li = ul.querySelector(':scope > li');
            if (!li) return;
            if (!li.querySelector('ul')) { if (!summary) summary = ul; return; }
            var m = ownText(li).match(/^(.+?\d{4})\s*(?:\((\w+)\))?\s*@\s*(.+)$/);
            var d = m && parseDate(m[1]);
            if (!d) return;

            var logoFig = has(ul.previousElementSibling, 'kg-image-card') ? ul.previousElementSibling : null;
            var media = [], n = ul.nextElementSibling;
            while (n && !isHr(n)) { var nn = n.nextElementSibling; media.push(n); n = nn; }

            var upcoming = d >= today;
            var card = el('article', 'fund-card' + (upcoming ? ' is-upcoming' : ''));
            var head = el('div', 'fund-card-head');
            var block = el('time', 'date-block');
            block.dateTime = isoDate(d);
            block.append(el('span', 't-eyebrow', d.toLocaleString('en-US', { month: 'short' })), el('span', 'date-day', String(d.getDate())));
            var info = el('div', 'fund-card-info');
            info.append(el('span', 't-eyebrow fund-status', upcoming ? 'Upcoming' : 'Past'), el('h3', 't-h3', m[3].trim()));
            var details = [m[2] || ''].concat(Array.prototype.map.call(li.querySelectorAll(':scope > ul > li'), function (x) {
                return txt(x).replace(/^(location|time):\s*/i, '');
            })).filter(Boolean);
            info.append(el('p', 't-small', details.join(' · ')));
            head.append(block, info);
            if (logoFig) {
                var logo = logoFig.querySelector('img');
                logo.classList.add('fund-card-logo');
                if (!logo.alt) logo.alt = m[3].trim();
                head.append(logo);
            }
            card.append(head);
            if (media.length) {
                var mw = el('div', 'fund-card-media');
                media.forEach(function (x) { mw.append(x); });
                card.append(mw);
            }
            ul.parentNode.insertBefore(card, logoFig || ul);
            if (logoFig) logoFig.remove();
            ul.remove();
            cards.push(card);
        });
        if (!cards.length) return;
        if (summary) summary.remove(); // the cards now carry the same dates
        dropDividersBetween(cards, 'fund-card');
        runs(content, function (c) { return has(c, 'fund-card'); }).forEach(function (r) { wrap(r, 'fund-list'); });
    }

    /* ----------------------------------------------------------------------
       Get involved: social icon images → one row
       ---------------------------------------------------------------------- */
    function involved(content) {
        // Social QR images → real links first, so they can move into "Spread the word"
        socialLinks(content);

        // Ways to help: the editor's numbered list → titled cards with one clear action each
        var ol = content.querySelector(':scope > ol');
        if (ol) {
            var picks = [[/donat/i, 'donate'], [/youth leader|lead/i, 'lead'], [/buy|items/i, 'buy'], [/spread|word/i, 'spread'], [/volunteer|pack/i, 'volunteer']];
            var cards = {
                volunteer: { title: 'Pack food', action: 'Sign up to pack', href: '#sign-up' },
                buy: { title: 'Bring items', action: 'See items needed' },
                donate: { title: 'Donate', action: 'Donate' },
                lead: { title: 'Lead an event', action: 'Youth leadership' },
                spread: { title: 'Spread the word' }
            };
            var grid = el('ul', 'ways-grid sbf-wide');
            Array.prototype.forEach.call(ol.children, function (li) {
                var t = txt(li), name = 'volunteer';
                for (var i = 0; i < picks.length; i++) { if (picks[i][0].test(t)) { name = picks[i][1]; break; } }
                var def = cards[name], link = li.querySelector('a');
                var card = el('li', 'way-card');
                var badge = el('span', 'way-icon');
                badge.append(icon(name));
                card.append(badge, el('h3', 't-h3', def.title), el('p', null, t.replace(/\s*-\s*click here\s*$/i, '').replace(/\.?\s*$/, '.')));
                var href = link ? link.getAttribute('href') : def.href;
                if (href && def.action) {
                    var a = el('a', 'link-arrow', def.action);
                    a.href = href;
                    card.append(a);
                }
                if (name === 'spread') card.classList.add('is-spread');
                grid.append(card);
            });

            // Intro sentence becomes the section heading
            var intro = ol.previousElementSibling;
            var head = el('div', 'ways-head sbf-wide');
            head.append(el('p', 't-eyebrow', 'More ways to help'), el('h2', 't-h1', ol.children.length + ' ways to get involved'));
            if (intro && intro.tagName === 'P') {
                head.append(el('p', 't-body-lg', txt(intro).replace(/:\s*$/, '.')));
                intro.remove();
            }
            ol.replaceWith(head);
            head.after(grid);

            // Social links live inside the "Spread the word" card
            var spread = grid.querySelector('.is-spread');
            var social = content.querySelector(':scope > .social-links');
            if (spread && social) {
                var label = social.previousElementSibling;
                if (label && /follow us/i.test(txt(label))) label.remove();
                // Compact round icon buttons; the name stays available to screen readers
                Array.prototype.forEach.call(social.querySelectorAll('a'), function (a) {
                    var name = /instagram/.test(a.href) ? 'SBF Chicago on Instagram' : /facebook/.test(a.href) ? 'SBF Chicago on Facebook' : 'SBF Chicago on LinkedIn';
                    a.setAttribute('aria-label', name);
                    a.setAttribute('title', name);
                    a.lastChild.remove();
                });
                social.classList.add('is-icons');
                spread.append(social);
            }
        }

        // The hero and the embedded form already cover sign-up; drop the editor's duplicate button
        var signup = document.getElementById('sign-up');
        var formUrl = signup && (signup.getAttribute('data-form-url') || '').split('?')[0];
        if (formUrl) {
            Array.prototype.forEach.call(content.querySelectorAll(':scope > .kg-button-card'), function (b) {
                var a = b.querySelector('a');
                if (a && a.getAttribute('href').split('?')[0] === formUrl) b.remove();
            });
        }
        Array.prototype.forEach.call(content.querySelectorAll('img[src*="combined_logos"]'), function (img) {
            img.closest('figure').classList.add('logo-panel');
            if (!img.alt) img.alt = 'Logos of SBF Chicago partners and sponsors';
        });
    }

    /* ----------------------------------------------------------------------
       Items needed: "16 jars of Peanut Butter (48 Oz/equivalent)" → item tiles
       ---------------------------------------------------------------------- */
    function shoppingList(card) {
        var leaves = Array.prototype.filter.call(card.querySelectorAll('li'), function (li) { return !li.querySelector('ul, ol'); });
        var items = [];
        leaves.forEach(function (li) {
            var m = txt(li).match(/^(\d+)\s+(.+?)\s*(?:\(([^)]*)\))?$/);
            if (m) items.push({ qty: m[1], what: m[2], size: m[3] || '' });
        });
        if (items.length < 3) return;
        var list = card.querySelector(':scope > ul');
        var lead = list && list.querySelector('strong');
        var grid = el('ul', 'need-grid');
        items.forEach(function (it) {
            var li = el('li', 'need');
            li.append(el('span', 'need-qty', it.qty), el('span', 'need-what', it.what));
            if (it.size) li.append(el('span', 'need-size', it.size.replace(/\/equivalent$/i, ' or similar')));
            grid.append(li);
        });
        if (lead) card.insertBefore(el('p', 't-small need-for', txt(lead).replace(/\s*$/, '')), list);
        list.replaceWith(grid);
        Array.prototype.forEach.call(card.querySelectorAll(':scope > p'), function (p) {
            if (/^items needed:?$/i.test(txt(p))) p.remove();
        });
    }

    function enhance(content) {
        var on = function (cls) { return !!content.closest('.' + cls); };
        try {
            if (on('page-team')) team(content);
            if (on('page-who-we-serve-india')) india(content);
            if (on('page-in-the-news')) news(content);
            if (on('page-youth-leaders')) youth(content);
            if (on('page-sbf-fundraiser')) fundraiser(content);
            if (on('page-get-involved')) involved(content);
            if (has(content, 'shopping-list')) shoppingList(content);
            generic(content);
        } catch (e) {
            if (window.console) console.error('SBF theme enhancement skipped:', e);
        }
    }
    Array.prototype.forEach.call(document.querySelectorAll('.gh-content'), enhance);

    /* ----------------------------------------------------------------------
       Chrome: menu, sticky header, one marigold CTA per screen
       ---------------------------------------------------------------------- */
    var header = document.getElementById('site-header');
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');

    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            var open = nav.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                nav.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.focus();
            }
        });
    }

    if (header) {
        var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 4); };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // With the sign-up form on the page, links to it jump down instead of leaving
    var signup = document.getElementById('sign-up');
    if (signup) {
        var formUrl = (signup.getAttribute('data-form-url') || '').split('?')[0];
        if (formUrl) {
            Array.prototype.forEach.call(document.querySelectorAll('main a[href]'), function (a) {
                if (signup.contains(a)) return;
                if (a.getAttribute('href').split('?')[0] === formUrl) a.setAttribute('href', '#sign-up');
            });
        }
    }

    // Homepage act 3: the weekend gap fills in as it scrolls into view.
    // Only armed when the strip starts below the fold, so its resting state is always "filled".
    var fillWeek = document.querySelector('.week.will-fill');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fillWeek && !calm && 'IntersectionObserver' in window && fillWeek.getBoundingClientRect().top > window.innerHeight) {
        fillWeek.classList.add('is-waiting');
        var fillObs = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                setTimeout(function () { fillWeek.classList.remove('is-waiting'); }, 250);
                fillObs.disconnect();
            }
        }, { threshold: 0.6 });
        fillObs.observe(fillWeek);
    }

    // Hide the header Donate whenever another primary (marigold) button is on screen
    var headerDonate = document.querySelector('.header-donate');
    if (headerDonate && 'IntersectionObserver' in window) {
        var visible = [];
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                var i = visible.indexOf(e.target);
                if (e.isIntersecting && i < 0) visible.push(e.target);
                if (!e.isIntersecting && i > -1) visible.splice(i, 1);
            });
            headerDonate.setAttribute('data-hidden', visible.length ? 'true' : 'false');
        });
        Array.prototype.forEach.call(document.querySelectorAll('main .btn-primary, main .kg-btn-accent:not(.is-secondary)'), function (b) { io.observe(b); });
    }

    /* Membership: monthly / yearly price toggle (both prices show without JS) */
    Array.prototype.forEach.call(document.querySelectorAll('.membership'), function (m) {
        var buttons = m.querySelectorAll('[data-billing]');
        function set(period) {
            m.setAttribute('data-billing', period);
            Array.prototype.forEach.call(buttons, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-billing') === period)); });
        }
        Array.prototype.forEach.call(buttons, function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-billing')); }); });
        set('monthly');
    });
})();
