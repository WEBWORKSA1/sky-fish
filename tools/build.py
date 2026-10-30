#!/usr/bin/env python3
"""Sky.Fish static site generator.

Usage:  python3 tools/build.py
Reads page fragments in tools/content/pages/*.html and guide fragments in
tools/content/guides/*.html, wraps them in the shared layout and writes plain
static HTML to the repository root (GitHub Pages serves it as-is).

Fragment format: first line is  <!--meta {json} -->  followed by body HTML.
Page meta keys: title, description, path (output file), nav (menu key),
hero ("page" for an inner-page hero with h1/sub), h1, sub, crumbs, schema, scripts.
"""
import json, os, re, html, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'tools', 'content')
SITE = 'https://sky.fish'
ADS = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6620975821265271" crossorigin="anonymous"></script>'
TODAY = datetime.date.today().isoformat()

NAV = [
    ('forecast', 'Forecast', 'forecast.html'),
    ('calendar', 'Solunar Calendar', 'solunar-calendar.html'),
    ('guides', 'Guides', 'guides.html'),
    ('species', 'Species', 'species.html'),
    ('knots', 'Knots', 'knots.html'),
    ('tools', 'Tools', 'tools.html'),
    ('videos', 'Videos', 'videos.html'),
    ('support', 'Support', 'support.html'),
]

LOGO = ('<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#ff9b52"/><stop offset="1" stop-color="#12b5a6"/></linearGradient></defs>'
        '<circle cx="20" cy="20" r="19" fill="url(#lg)"/><path d="M8 22c5-7 14-8 20-2l5-4-1 6 1 6-5-4c-6 6-15 5-20-2z" fill="#0a1726"/>'
        '<circle cx="14" cy="21" r="1.4" fill="#fff"/><path d="M5 30c4 2 8 2 12 0s8-2 12 0 7 2 7 2" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/></svg>')

FAVICON = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
           '<stop offset="0" stop-color="#ff9b52"/><stop offset="1" stop-color="#12b5a6"/></linearGradient></defs>'
           '<circle cx="20" cy="20" r="19" fill="url(#g)"/><path d="M8 22c5-7 14-8 20-2l5-4-1 6 1 6-5-4c-6 6-15 5-20-2z" fill="#0a1726"/>'
           '<circle cx="14" cy="21" r="1.4" fill="#fff"/></svg>')


def read_fragment(path):
    with open(path, encoding='utf-8') as f:
        first = f.readline()
        body = f.read()
    m = re.match(r'\s*<!--meta\s+(\{.*\})\s*-->', first)
    if not m:
        raise SystemExit('Missing meta line in ' + path)
    return json.loads(m.group(1)), body


def head(meta, root, out_path):
    title = meta['title']
    full_title = title if 'Sky.Fish' in title else title + ' | Sky.Fish'
    desc = html.escape(meta.get('description', ''), quote=True)
    canon = SITE + '/' + ('' if out_path == 'index.html' else out_path)
    schema = meta.get('schema_json', '')
    base = '<script>(function(){var s=location.pathname.split("/")[1]||"";document.write(\'<base href="\'+(/^sky-fish$/i.test(s)?"/"+s+"/":"/")+\'">\');})();</script>' if out_path == '404.html' else ''
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">{base}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canon}">
<meta name="robots" content="{meta.get('robots', 'index, follow, max-image-preview:large')}">
<meta name="theme-color" content="#0a1726">
<meta property="og:type" content="{meta.get('ogtype', 'website')}">
<meta property="og:site_name" content="Sky.Fish">
<meta property="og:title" content="{html.escape(full_title, quote=True)}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}/assets/img/og.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="google-adsense-account" content="ca-pub-6620975821265271">
<link rel="icon" href="{root}favicon.svg" type="image/svg+xml">
<link rel="manifest" href="{root}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/css/style.css">
{ADS}
{schema}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="topbar" role="note"><a href="https://web.works/contact" target="_blank" rel="noopener">Contact, if you are interested in this website / domain name / Sponsorship / Advertisement / Partnership</a></div>
'''


def header(active, root):
    items = ''.join(
        f'<li><a href="{root}{href}"' + (' aria-current="page"' if key == active else '') + f'>{label}</a></li>'
        for key, label, href in NAV)
    return f'''<header class="site-header">
<nav class="container nav" aria-label="Main">
<a class="brand" href="{root}index.html" aria-label="Sky.Fish home">{LOGO}<span>Sky<span class="dot">.</span>Fish</span></a>
<button class="burger" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
<ul class="menu" id="menu">{items}<li class="nav-cta-m"><a href="{root}charters.html" style="color:var(--gold)">Get Charter Quotes</a></li></ul>
<a class="btn btn-sun btn-sm nav-cta" href="{root}charters.html">Get Charter Quotes</a>
</nav>
</header>
'''


def footer(root, scripts):
    js = ''.join(f'<script src="{root}assets/js/{s}"></script>' for s in scripts)
    return f'''<footer class="site-footer">
<div class="container">
<div class="foot-grid">
<div>
<a class="brand" href="{root}index.html">{LOGO}<span>Sky<span class="dot">.</span>Fish</span></a>
<p class="mt2">Read the sky, find the bite. Free fishing forecasts, solunar tables, species guides and local pros — built for anglers everywhere.</p>
<a class="btn btn-sun btn-sm" href="{root}charters.html">Get free charter quotes</a>
</div>
<div><h4>Forecast</h4><ul>
<li><a href="{root}forecast.html">7-Day Bite Forecast</a></li><li><a href="{root}solunar-calendar.html">Solunar Calendar</a></li>
<li><a href="{root}tools.html">Angler Tools</a></li><li><a href="{root}regulations.html">Licences &amp; Regulations</a></li>
<li><a href="{root}guides/moon-phases-solunar-fishing.html">How Solunar Works</a></li></ul></div>
<div><h4>Learn</h4><ul>
<li><a href="{root}guides.html">All Guides</a></li><li><a href="{root}species.html">Species Library</a></li>
<li><a href="{root}knots.html">Knot Library</a></li><li><a href="{root}videos.html">Video Lessons</a></li>
<li><a href="{root}guides/beginners-guide-to-fishing.html">Beginner's Guide</a></li></ul></div>
<div><h4>Community</h4><ul>
<li><a href="{root}contests.html">Catch of the Month</a></li><li><a href="{root}support.html">Support Sky.Fish</a></li>
<li><a href="{root}list-your-business.html">List Your Charter</a></li><li><a href="{root}careers.html">Careers &amp; Creators</a></li>
<li><a href="{root}advertise.html">Advertise &amp; Sponsor</a></li></ul></div>
<div><h4>Company</h4><ul>
<li><a href="{root}about.html">About</a></li><li><a href="{root}contact.html">Contact</a></li>
<li><a href="{root}privacy.html">Privacy &amp; Cookies</a></li><li><a href="{root}terms.html">Terms of Use</a></li>
<li><a href="{root}disclaimer.html">Disclaimer</a></li><li><a href="{root}legal.html">Trademark &amp; Copyright</a></li></ul></div>
</div>
<div class="foot-legal">
<p>&copy; <span data-year>2026</span> Sky.Fish. All rights reserved. Original content, forecasts and design are protected by copyright. Sky.Fish is an independent publication and is not affiliated with, endorsed by or connected to any company, app, product or trademark using the name "Skyfish" or similar marks. <a href="{root}legal.html">Trademark &amp; copyright disclosure</a>.</p>
<p>Forecasts are estimates for planning only — always check official weather, marine and safety advisories. Weather data by <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo.com</a> (CC BY 4.0). Videos are embedded from YouTube and remain the property of their creators.</p>
<p>Interested in this website, the domain name, sponsorship, advertising or partnership? <a href="https://web.works/contact" target="_blank" rel="noopener">Contact us here</a>.</p>
</div>
</div>
</footer>
<div class="cookie" id="cookie" role="dialog" aria-live="polite" aria-label="Cookie notice">
<strong>Cookies &amp; ads.</strong> We use cookies to remember your forecast location and, with Google AdSense, to show and measure ads. Some ads may be personalised. <a href="{root}privacy.html#cookies">Learn more</a>.
<div class="btns"><button class="btn btn-sun btn-sm" data-cookie="all">Accept</button><button class="btn btn-ghost btn-sm" data-cookie="essential">Essential only</button></div>
</div>
<script src="{root}assets/js/config.js"></script>{js}<script src="{root}assets/js/app.js"></script>
</body>
</html>
'''


def page_hero(meta, root):
    crumbs = meta.get('crumbs')
    c = ''
    if crumbs is not False:
        c = f'<div class="crumbs"><a href="{root}index.html">Home</a> / ' + (crumbs or re.sub('<[^>]+>', '', meta.get('h1', meta['title']))) + '</div>'
    sub = f'<p>{meta["sub"]}</p>' if meta.get('sub') else ''
    extra = meta.get('hero_extra', '')
    return f'<section class="page-hero"><div class="container">{c}<h1>{meta.get("h1", meta["title"])}</h1>{sub}{extra}</div></section>'


def write(out_path, text):
    full = os.path.join(ROOT, out_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(text)


def render(meta, body, out_path):
    root = '../' * out_path.count('/')
    body = body.replace('{{root}}', root)
    hero = page_hero(meta, root) if meta.get('hero') == 'page' else ''
    doc = head(meta, root, out_path) + header(meta.get('nav', ''), root) + '<main id="main">' + hero + body + '</main>' + footer(root, meta.get('scripts', []))
    write(out_path, doc)
    return out_path


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + '</script>'


def build_guides():
    gdir = os.path.join(CONTENT, 'guides')
    guides = []
    for fn in sorted(os.listdir(gdir)):
        if fn.endswith('.html'):
            meta, body = read_fragment(os.path.join(gdir, fn))
            meta['slug'] = fn[:-5]
            meta['body'] = body
            words = len(re.sub('<[^>]+>', ' ', body).split())
            meta['words'] = words
            meta.setdefault('read', f'{max(4, round(words / 220))} min')
            guides.append(meta)
    by_slug = {g['slug']: g for g in guides}
    for g in guides:
        body = g['body']
        toc = re.findall(r'<h2[^>]*id="([^"]+)"[^>]*>(.*?)</h2>', body, flags=re.S)
        toc_html = '<ol>' + ''.join(f'<li><a href="#{i}">{re.sub("<[^>]+>", "", t)}</a></li>' for i, t in toc) + '</ol>'
        rel = [by_slug[s] for s in g.get('related', []) if s in by_slug][:3]
        rel_html = ''.join(
            f'<article class="card"><span class="tag">{r["category"]}</span><h3><a class="stretched" href="{r["slug"]}.html">{r["title"]}</a></h3><p>{r["description"]}</p></article>'
            for r in rel)
        faq = re.search(r'<h2[^>]*id="faq"[^>]*>.*?</h2>(.*)$', body, flags=re.S)
        faq_ld = ''
        if faq:
            qa = re.findall(r'<h3[^>]*>(.*?)</h3>\s*<p>(.*?)</p>', faq.group(1), flags=re.S)
            if qa:
                faq_ld = ld({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
                    {'@type': 'Question', 'name': re.sub('<[^>]+>', '', q), 'acceptedAnswer': {'@type': 'Answer', 'text': re.sub('<[^>]+>', '', a)}} for q, a in qa]})
        art_ld = ld({'@context': 'https://schema.org', '@type': 'Article', 'headline': g['title'], 'description': g['description'],
                     'datePublished': g.get('date', TODAY), 'dateModified': TODAY, 'author': {'@type': 'Organization', 'name': 'Sky.Fish Editorial Team'},
                     'publisher': {'@type': 'Organization', 'name': 'Sky.Fish', 'url': SITE}, 'mainEntityOfPage': f'{SITE}/guides/{g["slug"]}.html'})
        meta = {'title': g['title'], 'description': g['description'], 'nav': 'guides', 'hero': 'page', 'h1': g['title'], 'ogtype': 'article',
                'crumbs': f'<a href="../guides.html">Guides</a> / {g["category"]}',
                'hero_extra': f'<div class="byline"><span>By the Sky.Fish Editorial Team</span><span>Updated {TODAY}</span><span>{g["read"]} read</span><span>{g["category"]}</span></div>',
                'schema_json': art_ld + faq_ld}
        content = f'''<div class="container"><div class="article-wrap">
<article class="prose">{body}
<hr><p class="muted" style="font-size:.9rem">Fishing involves risk. Always check local regulations, licence requirements, weather and water conditions before heading out. See our <a href="../disclaimer.html">disclaimer</a>.</p></article>
<aside class="sidebar">
<div class="card toc"><h3>On this page</h3>{toc_html}</div>
<div class="card" style="background:linear-gradient(135deg,#0d2b4a,#0f4a63);color:#fff;border:0"><span class="tag sun">Free quotes</span><h3 style="color:#fff">Fish with a local pro</h3><p style="color:#d6e8f2">Licensed guides &amp; charter captains, matched to your dates and target species.</p><a class="btn btn-sun btn-block" href="../charters.html">Get charter quotes</a></div>
<div class="card"><h3>Check today's bite</h3><p>Hourly bite score from moon, sun, pressure and wind.</p><a class="btn btn-tide btn-block" href="../forecast.html">Open forecast</a></div>
</aside></div>
<section style="padding-top:0"><h2>Keep reading</h2><div class="grid g3">{rel_html}</div></section></div>'''
        render(meta, content, f'guides/{g["slug"]}.html')
    return guides


def guide_cards(guides, root='', limit=None):
    gs = guides[:limit] if limit else guides
    return ''.join(
        f'<article class="card reveal" data-cat="{g["category"]}"><span class="tag">{g["category"]}</span><h3><a class="stretched" href="{root}guides/{g["slug"]}.html">{g["title"]}</a></h3><p>{g["description"]}</p><small class="muted">{g["read"]} read</small></article>'
        for g in gs)


def build():
    guides = build_guides()
    cats = sorted({g['category'] for g in guides})
    pdir = os.path.join(CONTENT, 'pages')
    outs = []
    for fn in sorted(os.listdir(pdir)):
        if not fn.endswith('.html'):
            continue
        meta, body = read_fragment(os.path.join(pdir, fn))
        body = body.replace('{{guide_cards}}', guide_cards(guides))
        body = body.replace('{{guide_cards_6}}', guide_cards(guides, limit=6))
        body = body.replace('{{guide_filters}}', ''.join(f'<button class="pill" data-f="{c}">{c}</button>' for c in cats))
        body = body.replace('{{guide_count}}', str(len(guides)))
        if meta.get('schema'):
            meta['schema_json'] = ld(meta['schema'])
        outs.append(render(meta, body, meta['path']))
    # sitemap
    urls = [o for o in outs if o != '404.html'] + [f'guides/{g["slug"]}.html' for g in guides]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
        f'<url><loc>{SITE}/{"" if u == "index.html" else u}</loc><lastmod>{TODAY}</lastmod><priority>{"1.0" if u == "index.html" else "0.8"}</priority></url>\n'
        for u in sorted(urls)) + '</urlset>\n'
    write('sitemap.xml', sm)
    write('robots.txt', f'User-agent: *\nAllow: /\n\nUser-agent: Mediapartners-Google\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    write('ads.txt', 'google.com, pub-6620975821265271, DIRECT, f08c47fec0942fa0\n')
    write('favicon.svg', FAVICON)
    write('.nojekyll', '')
    write('site.webmanifest', json.dumps({'name': 'Sky.Fish — Fishing Forecast', 'short_name': 'Sky.Fish', 'start_url': './index.html', 'display': 'standalone',
                                          'background_color': '#0a1726', 'theme_color': '#0a1726', 'icons': [{'src': 'favicon.svg', 'sizes': 'any', 'type': 'image/svg+xml'}]}, indent=2))
    print(f'Built {len(outs)} pages + {len(guides)} guides ({sum(g["words"] for g in guides)} words of guide content).')


if __name__ == '__main__':
    build()
