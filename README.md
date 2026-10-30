# Sky.Fish — Read the sky, find the bite

A free fishing forecast for any lake, river or coast. It turns the moon, sun, barometric pressure, wind and cloud into an hourly **bite score**, and adds in-depth guides, species and knot libraries, video lessons, angler tools, charter-quote lead generation, supporter tiers, a monthly photo contest and a careers page.

Pure static HTML/CSS/JS, hosted free on **GitHub Pages from `main` / root**.

## Structure
```
index.html, *.html, guides/*.html   ← generated pages (served by GitHub Pages)
assets/css/style.css                ← design system
assets/js/astro.js                  ← sun/moon + bite-score engine
assets/js/forecast.js               ← forecast widget, 7-day page, solunar calendar
assets/js/app.js                    ← nav, forms, videos, filters, cookie notice
assets/js/config.js                 ← site settings (payment links, form alias)
tools/build.py                      ← generator: wraps fragments in the shared layout
tools/content/pages/*.html          ← page fragments (edit these)
tools/content/guides/*.html         ← article fragments (add a file = new guide)
BUILD-PROMPTS.md                    ← concept + phase-wise build prompts
```

## Edit and publish
1. Edit or add a fragment in `tools/content/…` (line 1 is a `<!--meta {json} -->` comment).
2. Run `python3 tools/build.py` to regenerate the HTML at the repo root, then commit and push to `main`. GitHub Pages republishes automatically.

## Forms
All forms send through FormSubmit to a single inbox. The address is encoded in `assets/js/config.js` and never appears on the site. The **first** submission triggers a one-time FormSubmit activation email; click it to activate. You can then paste the random alias FormSubmit gives you into `formAlias` in `config.js`.

## Monetisation
- Google AdSense Auto Ads (`ca-pub-6620975821265271`) on every page, plus `ads.txt` at the root.
- Charter quote funnel (`charters.html`) and operator sign-up (`list-your-business.html`).
- Supporter tiers (`support.html`). To turn tiers into one-click checkout, paste Stripe, PayPal or other hosted links into `payLinks` in `config.js`.
- Sponsorship enquiries (`advertise.html`) and the partnership link to https://web.works/contact on every page.

## Custom domain
In **Settings → Pages**, set the custom domain to `sky.fish`. At the DNS provider, add apex A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` and a `www` CNAME → `webworksa1.github.io`. Then turn on **Enforce HTTPS**.

## Credits and legal
Weather and geocoding: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Videos are embedded from YouTube and credited to their creators. Sky.Fish is independent and not affiliated with any "Skyfish"-named company or mark. See `legal.html`.
