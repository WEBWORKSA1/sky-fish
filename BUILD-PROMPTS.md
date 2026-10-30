# Sky.Fish — Concept & Phase-wise Build Prompts

## 1. The idea: why "Sky.Fish" = a fishing forecast

**Concept:** *Sky.Fish — Read the sky, find the bite.* A free fishing-forecast hub that turns the **sky** (moon, sun, barometric pressure, wind, cloud) into one hourly **bite score** for any lake, river or coast. Around it sit guides, species, knots and videos, plus a lead-generation marketplace for local fishing charters and guides.

**Why this beats the alternatives**

| Option | Repeat traffic | AdSense RPM | Lead-gen value | Fit with name |
|---|---|---|---|---|
| **Fishing forecast + charter leads (chosen)** | Daily/weekly (anglers check before every trip) | Outdoors/fishing: strong, especially in the US, Canada and Australia | High: charter trips cost hundreds to thousands per booking, and operators pay for leads or featured placement | Literal: *sky* → *fish* |
| Aquarium / fishkeeping | Medium | Medium | Low | Weak |
| Flying fish / cryptid "skyfish" content | Low | Low | None | Name-collision and trademark risk |
| Drone / sky photography | Medium | Medium | Medium | Weak ("fish") |

**Revenue stack, in priority order**
1. **Google AdSense:** Auto Ads on every page of a utility tool people revisit before every trip.
2. **Charter and guide lead generation:** a 3-step quote funnel on the demand side and "List your business" on the supply side. Monetised later through per-lead fees, featured listings and regional sponsorships.
3. **Sponsorships:** regional forecast "presented by", contest title sponsor, newsletter slot.
4. **Supporters:** one-time and monthly tiers, allocated across operations, prizes, hiring and marketing.
5. **Newsletter ("The Weekend Bite"):** an email list that can be monetised later through sponsors and affiliate deals.

**Research basis:** 41 niche sites reviewed, including FishingBooker, Captain Experiences, Guidesly, Fishbrain, FishAngler, Fishing Points, Wefish, FishingReminder, Tides4Fishing, FishTrack, NOAA, In-Fisherman, Field & Stream, Outdoor Life, Sportfishing, Wired2Fish, Salt Strong, Bassmaster, Orvis Learning Center, NetKnots, Animated Knots, IGFA, Trout Unlimited, CCA and state agencies. Gap found: **no major forecast page leads with a single 0–100 bite score**. Sky.Fish does.

---

## 2. Phase-wise prompts (reusable for this or any similar domain)

### Phase 0: Strategy and research
> Analyse the domain **[DOMAIN]** and propose the single most profitable website concept, comparing at least 4 options on repeat traffic, AdSense RPM, lead-gen value and how well the name fits. Then review at least 35 world-class sites in the chosen niche and return: the top 25 features ranked by traffic and revenue impact, the lead-gen form patterns that convert best, tool/UX patterns, content/SEO structure, design patterns, and contest/donation/membership patterns. Don't fabricate anything; mark sites that failed to load.

### Phase 1: Architecture and design system
> Build a static, GitHub-Pages-ready site (no build server; pure HTML/CSS/JS). Create a Python generator (`tools/build.py`) that wraps page fragments (`tools/content/pages/*.html`) and article fragments (`tools/content/guides/*.html`, each with a one-line JSON meta comment) in a shared layout, and outputs static HTML at the repo root, plus `sitemap.xml`, `robots.txt`, `ads.txt`, `.nojekyll`, a favicon and a manifest. Use only relative links so the site works both at `user.github.io/repo/` and on the custom domain. Design system: night-sky to water gradient, coral "sun" accent, teal "tide" accent, Fraunces display + Inter body, cards, pills, multi-step forms, reveal animations, reduced-motion support, print styles.
> Every page must have: the AdSense script `ca-pub-6620975821265271` in `<head>`; a top bar reading "Contact, if you are interested in this website/domain name/Sponsorship/Advertisement/Partnership" linked to `https://web.works/contact`; a sticky nav with a primary CTA; a footer with a trademark/copyright notice; and a cookie notice.

### Phase 2: Core tool (the traffic engine)
> Write an original client-side forecast engine: low-precision sun and moon positions, rise/set/transit found by 5-minute sampling, solunar periods (major = moon overhead/underfoot ±60 min, minor = rise/set ±30 min), and moon phase and illumination. Score every hour 0–100 from solunar timing, dawn/dusk light and moon phase, plus live Open-Meteo weather: pressure trend over 3 h, wind, cloud and rain chance. Build: a home widget (search plus geolocation, score ring, periods, conditions), a full 7-day page (day selector, 24-h solunar clock SVG, hourly bar chart with period shading and a pressure line, a "why this score" breakdown, and a charter CTA), and a printable monthly solunar calendar. Remember the user's location in localStorage (inside try/catch).

### Phase 3: Content for AdSense approval
> Write 14 or more original long-form guides (1,100–1,500 words each) covering forecast science (moon/solunar, pressure, weather), getting started, key species (bass, trout, catfish), techniques (inshore, surf, fly, ice, catch and release, line) and trip planning (how to book a charter). Each has an H2 table of contents, an FAQ (with FAQPage schema), Article schema, 3–6 internal links and exactly one CTA. No invented statistics, studies or quotes; point to official sources for regulations. Add a species library (16 species: habitat, season, timing, baits, tip), a knot library (8 knots with interactive steps plus a "which knot" chooser), a video library of verified YouTube embeds (lite, privacy-enhanced, credited) and angler tools (weight estimator, line capacity, unit converter, trip checklist).

### Phase 4: Revenue and community pages
> Build: (a) a **charter quote funnel**: 3 steps (where/when → trip type chips, duration, experience, budget, occasion → contact and consent), with a progress bar, trust panel, trip-type cards, cost FAQ framed as rough ranges, and URL prefill from a home mini-form; (b) **List your business**, the operator application; (c) **Support**: 4 tiers, a published allocation (operations 40 / hiring 25 / prizes 20 / marketing 15), a pledge form, and optional hosted payment links in `config.js`; (d) **Catch of the Month**: 4 categories, live countdown, prizes, judging criteria, official rules and an entry form; (e) **Careers**: 6 roles and an application form; (f) **Advertise**: a sponsorship menu, a brief form and a link to web.works/contact.
> All forms post through FormSubmit's AJAX endpoint to **one** inbox, whose address is stored encoded in `config.js` and assembled only at send time. It never appears in the HTML. Mail links use `data-mail` and build `mailto:` on click. Include a honeypot field and a mailto fallback if the request fails.

### Phase 5: Compliance and trust
> Add Privacy & Cookies (including Google AdSense's required third-party cookie disclosure and opt-out links, EEA consent note, form processor, location handling, user rights), Terms (charter disclaimer, submissions licence, contest terms, contributions), Disclaimer (forecast accuracy, safety, regulations, ads/affiliates), Trademark & Copyright (no affiliation with any "Skyfish"-named mark, third-party marks, DMCA process), About (editorial standards, funding), Contact, a regulations hub linking official agencies, and a 404 page. Then check: no exposed email, no broken internal links, no JS errors, renders correctly on desktop and at 390 px mobile.

### Phase 6: Deploy
> Push to `WEBWORKSA1/sky-fish` on `main`. Publish with GitHub Pages → Deploy from branch → `main` / root. After editing a fragment, run `python3 tools/build.py` and push the regenerated HTML. Optional: add the custom domain `sky.fish` in Pages settings, point DNS (A records 185.199.108–111.153 for the apex; CNAME `www` → `webworksa1.github.io`), and enforce HTTPS.

### Phase 7: Growth (next)
> Regional forecast landing pages ("[Lake/Port] Fishing Forecast"), NOAA tide integration for US coastal points, bite-alert emails, a monthly regional fishing report, a "[Destination] Fishing: Complete Guide" series linked into the charter funnel, and a gear "Best Of" series with an affiliate disclosure.
