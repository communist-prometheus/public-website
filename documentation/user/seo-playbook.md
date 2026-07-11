# SEO playbook — comprom.org

This document is operational, not aspirational. The on-page SEO is
already covered by code + tests (`src/config/seo.ts`,
`src/config/structured-data.ts`, `e2e/seo.pw.ts`). What's left is the
work humans have to do: getting Google to crawl the site, building
external authority, and tracking whether targeted queries actually
rank.

The primary target query is **"революционные марксисты"** for the
Russian audience. Adjacent queries: «революционный марксизм»,
«коммунизм или варварство», «революционное пораженчество»,
«Коммунистический Прометей».

---

## 1. Google Search Console

Without GSC verification Google may eventually index us, but we have
no visibility into what's crawled, what's blocked, what's ranking, or
how many impressions we're already getting.

### Verify the property

1. Open <https://search.google.com/search-console> and add
   `https://comprom.org` as a **Domain** property (not URL prefix —
   Domain covers every locale + subdomain).
2. Pick the **DNS record** verification method. Google gives a
   `google-site-verification=...` TXT value.
3. Add the TXT record in Cloudflare DNS for `comprom.org` (type TXT,
   name `@`, value as given). Wait 2–5 minutes for propagation.
4. Click **Verify** in GSC.

### Submit the sitemap

1. In GSC sidebar → **Sitemaps**.
2. Submit `sitemap-index.xml` (already linked from `/robots.txt`).
3. GSC will discover `sitemap-0.xml` automatically.

### Request indexing for key URLs

For the first crawl after a content change, queue priority URLs
manually instead of waiting weeks for Google to find them:

1. GSC → **URL Inspection** → paste the URL.
2. Click **Request indexing**.

The quota is ~10 URLs/day per property, so spread the work across
2–3 days instead of dumping everything Russian on day 1. Each
language competes for its own query equivalent ("marxistas
revolucionarios", "marxisti rivoluzionari", "rewolucyjni marksiści",
"революційні марксисти", "революционни марксисти", "revolutionary
Marxists") — one indexed door per language is one new audience.

Priority URLs (re-request whenever they change substantively):

**Day 1 — every home (7 URLs):**
`/ru`, `/en`, `/it`, `/es`, `/pl`, `/uk`, `/bl` (all under
`https://comprom.org`).

**Day 2 — every About (7 URLs):**
`/ru/about`, `/en/about`, `/it/about`, `/es/about`, `/pl/about`,
`/uk/about`, `/bl/about`.

**Day 3 — every Manifest (7 URLs):**
`/ru/manifest`, `/en/manifest`, `/it/manifest`, `/es/manifest`,
`/pl/manifest`, `/uk/manifest`, `/bl/manifest`.

Everything else (blog posts, positions, magazine issues) Google
discovers on its own via sitemap + internal linking — don't waste
the manual quota on them.

### Monitor

Once data starts flowing (typically 3–7 days post-verification):

- **Performance → Search results** → filter by query containing
  `марксист`. This is the leading indicator: it shows what queries
  *Google* matched us against, our impressions, and our average
  position. Track average position weekly — moving from 50 → 30 → 15
  → 10 is the realistic progression for a new domain.
- **Coverage** → confirm no key URL is "Excluded by 'noindex'" or
  "Discovered – currently not indexed" for more than a week.
- **Enhancements → Structured Data** → confirm Google parsed the
  `Organization`, `WebSite`, `AboutPage`, and `BlogPosting` entities
  we ship (any "0 valid items" line is a regression).

### Bing Webmaster Tools

Bing powers Yandex partially and a few other Russian-market engines.
Cost is zero, same DNS-TXT verification flow at
<https://www.bing.com/webmasters>. Submit the same sitemap.

### Yandex Webmaster

Yandex is the second-largest search engine in the Russian-speaking
market. Sign up at <https://webmaster.yandex.com/>, verify the
domain (DNS TXT, same drill), submit `sitemap-index.xml`. Yandex
also exposes a "request indexing" tool with a higher quota than
Google's.

---

## 2. Off-page (the actual bottleneck)

The site is fast, well-structured, multilingual, and has clean
schema. The reason we won't rank for «революционные марксисты» on
day 1 is **zero backlink profile + new domain**.

### What moves the needle

In rough order of impact for a Russian political-keyword cluster:

1. **An inbound link from a Russian-language leftist site we don't
   own**, with anchor text like «революционные марксисты» or
   «Коммунистический Прометей». One such link from a real domain is
   worth more than ten months of on-page tweaks.
2. **A Russian-language Wikipedia article** referencing the
   organisation. Wikipedia pages rank within days and pass strong
   authority. Realistic only after some independent third-party
   coverage exists (Wikipedia rejects self-sourced articles).
3. **Press mentions** in left-leaning Russian-language publications.
   Even a small site linking to a position paper counts.
4. **Crosslinks from translation projects** (marxists.org and
   mirrors, scattered programmatic-marxism archives). Reaching out
   with a link exchange + offer of our translated material is the
   lowest-effort path.

### Candidate donors to research

These are starting points for outreach research — not endorsements
of their politics, just sites whose audiences overlap with our
target query and that historically link out:

- marxists.org (Russian section)
- left.ru and related historical leftist archives
- vpered.org.ru
- Russian-language Trotskyist / left-communist forums
- The «Прорыв» journal and similar small-circulation projects
- LiveJournal communities that still aggregate leftist longreads

For each: read 2–3 of their recent posts to confirm they're alive,
then offer one of our positions or a translation as a contribution.
Cold-pitching a backlink rarely works; offering content does.

### Things to AVOID

- Buying links (PBN networks, paid placements). Google's
  Russian-language spam team is active; this is a fast way to a
  manual penalty that takes months to reverse.
- Comment-spam links on forums. Almost universally `rel="nofollow"`
  these days, no SEO value, hostile reception.
- Footer/sidebar "link partners" reciprocal exchanges with
  unrelated sites. Pattern-detected as link schemes.

---

## 3. Content depth (smaller lever, but ours to pull)

A landing page that earns a top-3 spot for «революционные марксисты»
typically has 1500+ words of substantive Russian-language content on
the topic, plus topical adjacent pages it internally links to. We're
close on `/ru/about` but every blog post that uses the exact phrase
in its title or H2 reinforces the cluster.

### Easy on-page boosters (editorial work, content repo)

- When publishing a new blog post in Russian, prefer titles
  containing «революционн» word forms when it's natural — not
  keyword stuffing, but don't shy away from the term.
- Internal-link the phrase from blog posts back to `/ru/about` or
  `/ru/manifest` at least once per long-form post. Anchor text
  matters: link the phrase «революционные марксисты» itself, not
  «here» or «подробнее».
- Consider adding a short FAQ block to the bottom of `/ru/about`
  (3–6 questions, ~50–150 words each, mirroring the editorial
  voice). Once that ships in `pages/about/index.ru.md`, add a
  per-language FAQ entry in `src/config/about-faq.ts` (the file
  doesn't exist yet — create it alongside the schema wire-up in
  `src/pages/[lang]/about.astro`) so we emit `FAQPage` JSON-LD that
  mirrors the visible questions. Google will then expand the entries
  in SERPs as rich results, which boosts CTR and reinforces topical
  relevance for the question terms.
- Beef up the meta descriptions in `pages/about/index.{en,es,pl,uk,bl}.md`
  — most are 25–35 chars right now ("Who we are and what we fight
  for."). The recommended range is 150–160 chars. CI doesn't enforce
  this because it'd block real editorial content; it's a manual ask.

---

## 4. Automated tracking

### What CI already verifies (`e2e/seo.pw.ts`)

- Every key landing page ships `<title>`, non-empty meta
  description, canonical, hreflang for all 7 languages + x-default.
- All JSON-LD blobs parse and declare `@context` + `@type`.
- `/ru` carries «революционные марксисты` in `<title>` or visible
  body text — wherever editors put it, Google can still see it.
- `/ru/about` ships an `AboutPage` JSON-LD wired to the
  `Organization` entity via `mainEntity` (so Google can disambiguate
  whose About page this is when assembling the knowledge-graph card).
- `/robots.txt` is permissive and points at the sitemap.
- `/sitemap-index.xml` + `/sitemap-0.xml` enumerate per-locale URLs.

These run in the standard `chromium` Playwright project — every PR
catches regressions before merge.

### What CI does NOT verify (and can't, without a paid API)

- **Where we rank on Google for "революционные марксисты"**. SERP
  position requires a third-party API:
  - SerpAPI (<https://serpapi.com>) — $50/mo for 5k searches.
  - DataForSEO (<https://dataforseo.com>) — pay-per-call, ~$0.001
    per query, no monthly minimum.
  - ValueSERP (<https://www.valueserp.com>) — $50/mo for 25k.

  If we ever want this, the shape is: a scheduled GitHub Action
  (weekly), queries the API for our target list, writes a JSON
  snapshot to a small DataForSEO/sqlite history, fails the job if
  any priority query slips out of the top 30.

### Recommended weekly check (manual)

Until/unless we wire SERP API tracking:

1. Open a clean incognito Chrome window, set locale to
   `Russian / Russia`.
2. Search the priority queries:
   - революционные марксисты
   - революционный марксизм
   - Коммунистический Прометей
   - коммунизм или варварство
3. Note our position (or "not in top 100"). Track in a sheet over
   weeks. The slope matters more than the absolute number — a new
   domain takes 3–9 months to reach page 1 even with strong signals.

---

## 5. Realistic expectations

- **Week 0–2**: GSC verified, sitemap submitted, key URLs indexed.
  Impressions in single digits.
- **Month 1–3**: Page 5–10 for the brand name «Коммунистический
  Прометей» (easy wins because nobody else is using it). Still
  unranked or page 10+ for «революционные марксисты» — that's a
  competitive keyword.
- **Month 6+**: Brand queries on page 1. Topical queries moving
  toward page 2–3 *if* we've shipped real content and earned even
  one or two real backlinks.
- **Year 1+**: Page 1 for «революционные марксисты» is realistic
  only if (a) we've sustained content frequency, (b) we've earned
  a handful of authoritative referring domains, (c) we don't get
  hit with a manual penalty for any black-hat shortcut.

The on-page work is done. The rest is patience + outreach + new
material.
