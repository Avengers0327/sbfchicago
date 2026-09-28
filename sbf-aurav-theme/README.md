# sbf-aurav: Ghost theme for sbfchicago.org

Built on the "Aurav Website" design system (project/README.md and project/tokens.json).
Every colour, type style, space, radius and shadow in `assets/css/screen.css` uses the
token name from tokens.json.

Checked with Ghost's `gscan`: no errors. There are two warnings, both on purpose:
- *Custom fonts*: the design system requires Bricolage Grotesque and Figtree, so the theme
  doesn't let Ghost Admin swap in other fonts.
- *show_title_and_feature_image*: most current pages have "show title" switched off because
  the title was baked into their banner JPG. The theme always shows the live HTML title.

## Install (about 10 minutes)

1. **Ghost Admin → Settings → Design & branding → Change theme → Upload theme**, then choose
   `sbf-aurav-theme.zip` and activate it. Casper stays installed, so you can switch back.
2. **Settings → Code injection → Site header.** Keep the Google Analytics `gtag` script.
   **Delete the three `<style>` blocks**: the 16:9 banner lock, the `.article-image` resizing
   and the `.kg-gallery-card` width. They override the new layout.
3. **Settings → Design & branding → Brand → Accent color:** set it to `#0E2747` (navy-900).
   Portal (Sign in/Subscribe) buttons and editor button cards then use navy with white text
   (14:1) instead of the default blue #3b94ed.
4. **Brand → Publication icon:** upload the SBF logo (`assets/images/sbf-logo.jpg`, the same
   `Logo-Blue---plain.jpg`). The theme uses the bundled copy until you do.
5. **Brand → Cover image:** remove `banner-with-stats-4-2.jpg`. The theme doesn't use it; the
   hero is now live HTML.
6. **Design → Homepage settings** (theme settings): hero headline, subcopy, optional hero photo,
   and the three stat values and labels. Update the stats after each event.
   The defaults are the figures from the current banner and the Sept impact graphics:
   6,100+ Chicago meals, 18,500+ India meals and 5,100+ peanut butter sandwiches (Jan to Sept 2026).
7. **Announcement bar:** keep using Settings → Announcement bar. The theme restyles it to
   marigold-100 with navy-900 text, whatever background you pick there.

Navigation is unchanged: primary nav = the 8 header items, secondary nav = Amazon Wishlist and
Donations in the footer.

## What each page gets

| Page / content | Template | Design |
| --- | --- | --- |
| Homepage | `home.hbs` | Live hero, navy stat band, two-city split, event cards on a lake-100 band, ways to help, donate panel |
| Team & Vision | `page-team.hbs` | Vision intro panel; header cards become a grid of person cards (photo, role, bio); open roles become dashed "Open position" cards |
| Chicago Projects | `page-who-we-serve-chicago.hbs` | lake-100 band; impact stat band; partner chips; the 4 "how to help" link previews become one help panel; past-event link previews become a card grid |
| India Projects | `page-who-we-serve-india.hbs` | marigold-100 band; impact stat band; "43 drives" breakdown; each "Project N:" + photo becomes a project card |
| Items Needed | `page-items-needed.hbs` | marigold-100 band; Google Form beside the shopping list, pulled live from the Amazon Wishlist post |
| Get Involved | `page-get-involved.hbs` | Numbered ways-to-help list becomes cards; social icons become one row; sign-up is the page's marigold button |
| In the News | `page-in-the-news.hbs` | "Month D, YYYY - text" paragraphs become a dated timeline; partner callouts become quote cards |
| Youth Leadership | `page-youth-leaders.hbs` | Volunteer hours become 4 h / 2 h tiles; other roles become chips; captioned photos become the youth leader wall |
| Fundraiser | `page-sbf-fundraiser.hbs` | Each "Date @ Venue" list becomes a dated event card, automatically marked Upcoming or Past |
| Donations | `page-donations.hbs` | Zeffy form beside a navy impact panel (uses the homepage stat settings) and other ways to give |
| Food packing posts | `post.hbs` | Chicago band; partner header cards become impact rows; runs of link buttons become one row of secondary buttons |
| Any future page/post | Template picker: "Chicago band" / "India band" | Choose it in the post settings panel |

### How the page designs work

Editors keep writing exactly as they do now: text, images and dividers in the Ghost editor.
`assets/js/site.js` recognises each page's patterns (e.g. a bold "Project 3: …" line followed by a
captioned photo, or a paragraph starting "June 12, 2026 - …") and groups them into the designed
components. Keep those patterns when adding content and new items pick up the design
automatically. If the script ever fails, the content still shows in its original order.

The script also keeps the "one marigold button per screen" rule: the header Donate button hides
whenever another primary button is visible, and a run of several link buttons becomes secondary.

Donations (Zeffy), Items Needed (Google Form), videos, galleries, bookmarks and Portal
sign-in/subscribe all keep working. `card_assets` is on, so Ghost's own card scripts still load.

## Homepage story (home.hbs)

The homepage runs in four acts: **see the problem** (the "weekend gap" week strip), **feel the
problem** (what partners told us, on navy), **see the solution** (the same week with the weekend
filled, what's in a bag, 3 steps, impact stats), and **feel the solution** (photos, a partner
quote, recent events, next event).

- Edit in **Design → Homepage settings**: hero headline and subcopy, the three stats, the next-event
  title and details (update after every event), and the lead photo.
- Written into `home.hbs`: the partner quotes, the weekend-bag contents, the three steps and the
  story photos. Every line comes from the site's own pages and posts; the source is next to it.
- The week strip in act 3 fills its weekend when it scrolls into view. Its resting state is
  already filled, so screenshots, no-JS visitors and reduced-motion users all see the answer.

## Content checklist (in the Ghost editor)

These pages open with JPG banners that have text baked into the image. A transitional CSS shim
(the section marked TRANSITIONAL SHIM in screen.css) hides them so the site looks right on day
one. Delete the image cards themselves, then remove the shim.

- Delete the top banner image card: `1-team-and-vision-3.jpg`, `sbf_chicago_projects_cropped.jpg`,
  `3-sbf_india_projects_cropped.jpg`, `4-sbf_get_involved_cropped.jpg`, `5-sbf_in_the_news_cropped-1.jpg`,
  `6-sbf_youth_leadership_cropped.jpg`, `7-sbf_fundraiser_cropped.jpg`, `8-sbf_donation_cropped.jpg`,
  `9-sbf-items-needed.jpg`.
- Delete the bottom strip image card on every page: `banner-test-16by9-trim-2-4.jpg` / `-2-5.jpg`.
- Team page: the `meet_our_*.png` heading images are swapped for live headings by the theme.
  Replacing them with Heading blocks in the editor is still cleaner.
- **Replace infographics with live HTML.** In each case, add an HTML card and paste the file from
  `content-snippets/`, then delete the image. Edit the numbers in the HTML card after each event.
  - Chicago Projects: `chicago-sept.jpg` → `chicago-impact.html`;
    `our_partners-grid-with-5.jpg` → `chicago-partners.html`
  - India Projects: `India-top.png` and `india-middle-sept-2-ration-logo.jpg` → `india-impact.html`;
    `india-bottom-sept-1.jpg` → `india-drives.html`
- Other graphics with baked-in text, worth rebuilding later: `combined_summary-5.png` (Sept event
  post), `SBF-Impact-use.jpg` and `India-Ration-Drive-use-5.jpg` (In the News).
- Link previews (bookmark cards) to SBF's own pages show the old banner as their thumbnail. The theme
  hides those thumbnails. Setting a real photo as each page's feature image fixes it at the source.
- Typos in content: "partnes" (Sept event), "organziations" (Jan event), "Foods For Friends ...
  (May 21, 2006)" should be 2026 (In the News), "ORGANZTION" is inside the India drives graphic.
- For each page, turn **Show title** back on, or leave it off (the theme shows the title either way).
- Optional: add an **Excerpt** to each page. It appears as body-lg subcopy under the title.
- Optional: tag food packing posts `chicago` and India drive posts `india`, so band colours
  don't depend on the post title.
- Page titles are shown as written. Consider renaming "SBF Vision and Team" to "Team and vision",
  "Get Involved!" to "Get involved" and "In the news..." to "In the news" (sentence case, no
  trailing punctuation).
