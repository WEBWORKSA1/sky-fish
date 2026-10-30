/* Sky.Fish — forecast UI (home widget, full forecast, solunar calendar).
   Weather & geocoding: Open-Meteo (free, no key, CC BY 4.0). */
(function () {
  'use strict';
  var A = window.SkyAstro; if (!A) return;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var DEFAULT = { name: 'Lake Okeechobee, Florida, US', lat: 26.95, lng: -80.8 };

  function getLoc() { try { var s = JSON.parse(store('sf_loc') || 'null'); if (s && isFinite(s.lat)) return s; } catch (e) {} return DEFAULT; }
  function setLoc(l) { store('sf_loc', JSON.stringify(l)); }

  /* ---------- Location search ---------- */
  function bindSearch(root, onPick) {
    var input = $('[data-loc-input]', root), list = $('[data-loc-list]', root), geo = $('[data-loc-geo]', root), t = null, items = [], on = -1;
    if (!input) return;
    function close() { list.style.display = 'none'; on = -1; }
    function pick(it) { input.value = it.name; close(); onPick(it); }
    input.addEventListener('input', function () {
      clearTimeout(t); var q = input.value.trim(); if (q.length < 2) { close(); return; }
      t = setTimeout(function () {
        fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (j) {
            items = (j.results || []).map(function (r) { return { name: [r.name, r.admin1, r.country_code].filter(Boolean).join(', '), lat: r.latitude, lng: r.longitude }; });
            list.innerHTML = items.length ? items.map(function (it, i) { return '<li data-i="' + i + '">' + esc(it.name) + ' <small>' + it.lat.toFixed(2) + ', ' + it.lng.toFixed(2) + '</small></li>'; }).join('') : '<li>No matches — try a nearby town</li>';
            list.style.display = 'block';
          }).catch(close);
      }, 250);
    });
    input.addEventListener('keydown', function (e) {
      var lis = $$('li[data-i]', list);
      if (e.key === 'ArrowDown') { on = Math.min(lis.length - 1, on + 1); }
      else if (e.key === 'ArrowUp') { on = Math.max(0, on - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[on < 0 ? 0 : on]) pick(items[on < 0 ? 0 : on]); return; }
      else if (e.key === 'Escape') { close(); return; } else return;
      lis.forEach(function (l, i) { l.classList.toggle('on', i === on); });
    });
    list.addEventListener('mousedown', function (e) { var li = e.target.closest('li[data-i]'); if (li) pick(items[+li.getAttribute('data-i')]); });
    input.addEventListener('blur', function () { setTimeout(close, 150); });
    if (geo) geo.addEventListener('click', function () {
      if (!navigator.geolocation) return;
      geo.disabled = true; geo.textContent = 'Locating…';
      navigator.geolocation.getCurrentPosition(function (p) {
        geo.disabled = false; geo.textContent = 'Use my location';
        onPick({ name: 'My location (' + p.coords.latitude.toFixed(2) + ', ' + p.coords.longitude.toFixed(2) + ')', lat: p.coords.latitude, lng: p.coords.longitude });
      }, function () { geo.disabled = false; geo.textContent = 'Use my location'; alert('Location permission was denied. Search for a town or lake instead.'); }, { timeout: 10000 });
    });
  }

  /* ---------- Data ---------- */
  function load(loc) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lng +
      '&hourly=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation_probability&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7&past_days=1';
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('wx'); return r.json(); })
      .then(function (j) { return build(loc, j); })
      .catch(function () { return build(loc, null); });
  }
  function build(loc, j) {
    var off = j ? j.utc_offset_seconds : Math.round(loc.lng / 15) * 3600, idx = {}, H = j && j.hourly;
    if (H) H.time.forEach(function (t, i) { idx[Date.parse(t + ':00Z') - off * 1000] = i; });
    function wxAt(t) {
      if (!H) return null; var i = idx[t]; if (i == null) return null; var i3 = idx[t - 3 * 36e5];
      var lh = new Date(t + off * 1000).getUTCHours();
      return { p: H.pressure_msl[i], p3: i3 != null ? H.pressure_msl[i3] : null, wind: H.wind_speed_10m[i], dir: H.wind_direction_10m[i], cloud: H.cloud_cover[i], pop: H.precipitation_probability[i], temp: H.temperature_2m[i], hour: lh };
    }
    var now = Date.now(), local = new Date(now + off * 1000);
    var start0 = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - off * 1000;
    var days = [];
    for (var d = 0; d < 7; d++) {
      var st = start0 + d * A.dayMs, ev = A.dayEvents(st, loc.lat, loc.lng), hours = [];
      for (var h = 0; h < 24; h++) { var t = st + h * 36e5, w = wxAt(t), sc = A.scoreAt(t + 18e5, ev, w); hours.push({ t: t, score: sc.score, factors: sc.factors, wx: w }); }
      var sum = A.daySummary(hours);
      days.push({ start: st, ev: ev, hours: hours, score: sum.score, best: sum.best, tmax: j ? j.daily.temperature_2m_max[d + 1] : null, tmin: j ? j.daily.temperature_2m_min[d + 1] : null });
    }
    return { loc: loc, off: off, days: days, live: !!H, now: now };
  }

  function pTrend(w) {
    if (!w || w.p == null || w.p3 == null) return '—';
    var dp = w.p - w.p3, s = dp <= -1 ? 'Falling' : dp >= 1 ? 'Rising' : 'Steady';
    return Math.round(w.p) + ' hPa · ' + s + ' (' + (dp > 0 ? '+' : '') + dp.toFixed(1) + ')';
  }
  function dirTxt(deg) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8]; }
  function wind(w) { return w && w.wind != null ? Math.round(w.wind) + ' km/h (' + Math.round(w.wind * 0.621) + ' mph) ' + dirTxt(w.dir) : '—'; }
  function temp(c) { return c == null ? '—' : Math.round(c) + '°C / ' + Math.round(c * 9 / 5 + 32) + '°F'; }
  function nowHour(data, day) { var h = day.hours.filter(function (x) { return x.t <= data.now; }).pop(); return h || day.hours[12]; }

  function periodsHTML(ev, off) {
    return ev.periods.map(function (p) { return '<span class="period ' + (p.type === 'major' ? 'major' : '') + '" title="' + p.label + '">' + (p.type === 'major' ? 'Major ' : 'Minor ') + A.fmtTime(p.a, off) + '–' + A.fmtTime(p.b, off) + '</span>'; }).join('') || '<span class="period">No lunar events today</span>';
  }

  /* ---------- Home widget ---------- */
  function widget(root) {
    var out = $('[data-fc-out]', root);
    function run(loc) {
      out.innerHTML = '<p class="muted">Reading the sky for ' + esc(loc.name) + '…</p>';
      load(loc).then(function (data) {
        var day = data.days[0], r = A.rate(day.score), h = nowHour(data, day);
        out.innerHTML = '<div class="fc-top"><div class="score-ring ' + r.cls + '" style="--v:' + day.score + '"><div><div><b>' + day.score + '</b><small>Bite score</small></div></div></div>' +
          '<div><h3>' + r.label + ' today</h3><div class="fc-meta">' + esc(loc.name) + '</div><div class="fc-meta"><strong>Best window:</strong> ' + (day.best ? A.fmtTime(day.best[0], data.off) + '–' + A.fmtTime(day.best[1], data.off) : '—') + '</div></div></div>' +
          '<div class="periods">' + periodsHTML(day.ev, data.off) + '</div>' +
          '<div class="fc-rows"><div>Moon<b>' + day.ev.phase.name + ' ' + Math.round(day.ev.phase.illum * 100) + '%</b></div><div>Pressure<b>' + pTrend(h.wx) + '</b></div><div>Sunrise / Sunset<b>' + A.fmtTime(day.ev.sunrise, data.off) + ' / ' + A.fmtTime(day.ev.sunset, data.off) + '</b></div><div>Wind<b>' + wind(h.wx) + '</b></div></div>' +
          '<a class="btn btn-sun btn-block mt2" href="forecast.html">Open full 7-day forecast →</a>';
      });
    }
    bindSearch(root, function (l) { setLoc(l); run(l); });
    run(getLoc());
  }

  /* ---------- Full forecast ---------- */
  function clockSVG(day, off) {
    var cx = 130, cy = 130, R = 108, s = '<svg viewBox="0 0 260 260" role="img" aria-label="24-hour solunar clock">';
    function ang(t) { var d = new Date(t + off * 1000); return ((d.getUTCHours() + d.getUTCMinutes() / 60) / 24) * 2 * Math.PI - Math.PI / 2; }
    function arc(a, b, r, w, col) {
      var a1 = ang(a), a2 = ang(b); if (a2 < a1) a2 += 2 * Math.PI;
      var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1), x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      return '<path d="M' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + (a2 - a1 > Math.PI ? 1 : 0) + ',1 ' + x2 + ',' + y2 + '" stroke="' + col + '" stroke-width="' + w + '" fill="none" stroke-linecap="round"/>';
    }
    s += '<circle cx="130" cy="130" r="' + R + '" fill="none" stroke="#e6eef4" stroke-width="18"/>';
    if (day.ev.sunrise && day.ev.sunset) s += arc(day.ev.sunrise, day.ev.sunset, R, 18, '#ffe9b0');
    day.ev.periods.forEach(function (p) { s += arc(p.a, p.b, R, p.type === 'major' ? 18 : 12, p.type === 'major' ? '#ff7a3d' : '#12b5a6'); });
    for (var h = 0; h < 24; h += 3) { var a = (h / 24) * 2 * Math.PI - Math.PI / 2; s += '<text x="' + (cx + 82 * Math.cos(a)) + '" y="' + (cy + 82 * Math.sin(a) + 4) + '" font-size="11" text-anchor="middle" fill="#5a6b7d">' + (h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h - 12) + 'p') + '</text>'; }
    var nowA = ang(Date.now()); if (Date.now() >= day.start && Date.now() < day.start + A.dayMs) s += '<line x1="130" y1="130" x2="' + (cx + 100 * Math.cos(nowA)) + '" y2="' + (cy + 100 * Math.sin(nowA)) + '" stroke="#0a1726" stroke-width="3" stroke-linecap="round"/><circle cx="130" cy="130" r="5" fill="#0a1726"/>';
    s += '<text x="130" y="126" text-anchor="middle" font-family="Fraunces,serif" font-size="30" font-weight="800" fill="#0a1726">' + day.score + '</text><text x="130" y="146" text-anchor="middle" font-size="10" fill="#5a6b7d" letter-spacing="1.5">BITE SCORE</text></svg>';
    return s;
  }
  function chartSVG(day, off) {
    var W = 960, Hh = 250, pad = 34, bw = (W - pad * 2) / 24, s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Hourly bite score chart">';
    function x(t) { return pad + ((t - day.start) / 36e5) * bw; }
    day.ev.periods.forEach(function (p) { var a = Math.max(x(p.a), pad), b = Math.min(x(p.b), W - pad); if (b > a) s += '<rect x="' + a + '" y="10" width="' + (b - a) + '" height="' + (Hh - 50) + '" fill="' + (p.type === 'major' ? 'rgba(255,122,61,.12)' : 'rgba(18,181,166,.12)') + '"/>'; });
    [25, 50, 75].forEach(function (g) { var y = 10 + (Hh - 50) * (1 - g / 100); s += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y + '" y2="' + y + '" stroke="#e6eef4"/><text x="' + (pad - 6) + '" y="' + (y + 4) + '" font-size="10" text-anchor="end" fill="#8a9aab">' + g + '</text>'; });
    var cols = { 'lvl-great': '#ff7a3d', 'lvl-good': '#1fa363', 'lvl-ok': '#e3a21a', 'lvl-poor': '#d0473a' };
    var pts = [], pmin = 1e9, pmax = -1e9;
    day.hours.forEach(function (h) { if (h.wx && h.wx.p) { pmin = Math.min(pmin, h.wx.p); pmax = Math.max(pmax, h.wx.p); } });
    day.hours.forEach(function (h, i) {
      var bh = (Hh - 50) * h.score / 100, y = 10 + (Hh - 50) - bh;
      s += '<rect x="' + (pad + i * bw + 3) + '" y="' + y + '" width="' + (bw - 6) + '" height="' + bh + '" rx="4" fill="' + cols[A.rate(h.score).cls] + '"><title>' + A.fmtTime(h.t, off) + ': ' + h.score + '</title></rect>';
      if (i % 3 === 0) s += '<text x="' + (pad + i * bw + bw / 2) + '" y="' + (Hh - 22) + '" font-size="11" text-anchor="middle" fill="#5a6b7d">' + A.fmtTime(h.t, off).replace(':00', '') + '</text>';
      if (h.wx && h.wx.p && pmax > pmin) pts.push((pad + i * bw + bw / 2) + ',' + (20 + (Hh - 80) * (1 - (h.wx.p - pmin) / (pmax - pmin))));
    });
    if (pts.length > 1) s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#0d2b4a" stroke-width="2" stroke-dasharray="5 4"/>';
    return s + '</svg>';
  }
  function full(root) {
    var out = $('[data-fc-out]', root), sel = 0, data = null;
    function render() {
      var day = data.days[sel], r = A.rate(day.score), h = sel === 0 ? nowHour(data, day) : day.hours[day.best ? Math.round((day.best[0] - day.start) / 36e5) : 12];
      var bestH = day.hours.slice().sort(function (a, b) { return b.score - a.score; })[0];
      var html = '<div class="days" role="tablist">' + data.days.map(function (d, i) { var rr = A.rate(d.score); return '<button class="day ' + rr.cls + (i === sel ? ' active' : '') + '" data-day="' + i + '" role="tab" aria-selected="' + (i === sel) + '"><small>' + (i === 0 ? 'Today' : A.fmtDay(d.start, data.off)) + '</small><b>' + d.score + '</b><small>' + rr.label + '</small><div class="bar"><i style="width:' + d.score + '%"></i></div></button>'; }).join('') + '</div>';
      html += '<div class="grid g3 mt2" style="align-items:start"><div class="card"><div class="' + r.cls + '">' + clockSVG(day, data.off) + '</div><div class="legend"><span><i style="background:#ff7a3d"></i>Major</span><span><i style="background:#12b5a6"></i>Minor</span><span><i style="background:#ffe9b0"></i>Daylight</span></div></div>';
      html += '<div class="card"><span class="tag sun">' + A.fmtDay(day.start, data.off, true) + '</span><h3>' + r.label + ' — ' + day.score + '/100</h3><p class="mb0"><strong>Best window:</strong> ' + (day.best ? A.fmtTime(day.best[0], data.off) + '–' + A.fmtTime(day.best[1], data.off) : '—') + '</p><div class="periods">' + periodsHTML(day.ev, data.off) + '</div>' +
        '<div class="fc-rows"><div>Moon phase<b>' + A.moonSVG(day.ev.phase.phase, 18).replace('<svg', '<svg style="display:inline;vertical-align:-3px;margin-right:4px"') + day.ev.phase.name + '</b></div><div>Illumination<b>' + Math.round(day.ev.phase.illum * 100) + '%</b></div><div>Sunrise<b>' + A.fmtTime(day.ev.sunrise, data.off) + '</b></div><div>Sunset<b>' + A.fmtTime(day.ev.sunset, data.off) + '</b></div><div>Moonrise<b>' + A.fmtTime(day.ev.moonrise, data.off) + '</b></div><div>Moonset<b>' + A.fmtTime(day.ev.moonset, data.off) + '</b></div></div></div>';
      html += '<div class="card"><h3>' + (sel === 0 ? 'Conditions now' : 'Conditions in best window') + '</h3><div class="fc-rows" style="grid-template-columns:1fr"><div>Pressure<b>' + pTrend(h.wx) + '</b></div><div>Wind<b>' + wind(h.wx) + '</b></div><div>Cloud cover<b>' + (h.wx ? h.wx.cloud + '%' : '—') + '</b></div><div>Rain chance<b>' + (h.wx && h.wx.pop != null ? h.wx.pop + '%' : '—') + '</b></div><div>Air temp (high / low)<b>' + temp(day.tmax) + ' · ' + temp(day.tmin) + '</b></div></div>' + (data.live ? '' : '<p class="notice mt2">Live weather is unavailable right now — scores use sky factors only.</p>') + '</div></div>';
      html += '<h3 class="mt2">Hour by hour</h3><div class="chart-wrap">' + chartSVG(day, data.off) + '<div class="legend"><span><i style="background:#ff7a3d"></i>Excellent 75+</span><span><i style="background:#1fa363"></i>Good 60–74</span><span><i style="background:#e3a21a"></i>Fair 45–59</span><span><i style="background:#d0473a"></i>Slow &lt;45</span><span><i style="background:rgba(255,122,61,.25)"></i>Major period</span><span><i style="background:rgba(18,181,166,.25)"></i>Minor period</span><span>- - - Pressure</span></div></div>';
      html += '<div class="grid g2 mt2"><div class="card"><h3>Why this score? (peak hour ' + A.fmtTime(bestH.t, data.off) + ')</h3><ul class="factor-list">' + bestH.factors.map(function (f) { return '<li><span>' + f[0] + '</span><span class="' + (f[1] > 0 ? 'pos' : f[1] < 0 ? 'neg' : '') + '">' + (f[1] > 0 ? '+' : '') + Math.round(f[1]) + '</span></li>'; }).join('') + '<li><span>Base activity</span><span>+22</span></li></ul></div>' +
        '<div class="card"><span class="tag">Get on the fish</span><h3>Want a local pro for the ' + r.label.toLowerCase() + ' window?</h3><p>Tell us where and when — we match you with licensed guides and charter captains who fish these waters. Free, no obligation.</p><a class="btn btn-sun" href="charters.html?loc=' + encodeURIComponent(data.loc.name) + '">Get free charter quotes</a> <a class="btn btn-outline" href="solunar-calendar.html">Monthly calendar</a></div></div>';
      out.innerHTML = html;
      $$('[data-day]', out).forEach(function (b) { b.addEventListener('click', function () { sel = +b.getAttribute('data-day'); render(); }); });
    }
    function run(loc) {
      $('[data-loc-name]', root).textContent = loc.name;
      out.innerHTML = '<p class="muted">Calculating sun, moon and weather for ' + esc(loc.name) + '…</p>';
      load(loc).then(function (d) { data = d; sel = 0; render(); });
    }
    bindSearch(root, function (l) { setLoc(l); run(l); });
    run(getLoc());
  }

  /* ---------- Solunar calendar ---------- */
  function calendar(root) {
    var out = $('[data-cal-out]', root), title = $('[data-cal-title]', root), loc = getLoc(), off = Math.round(loc.lng / 15) * 3600;
    var now = new Date(), y = now.getFullYear(), m = now.getMonth();
    var MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function render() {
      title.textContent = MN[m] + ' ' + y + ' · ' + loc.name;
      var first = new Date(Date.UTC(y, m, 1)), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), html = '';
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (d) { html += '<div class="dow">' + d + '</div>'; });
      for (var e = 0; e < first.getUTCDay(); e++) html += '<div class="cell empty"></div>';
      var todayKey = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate();
      for (var d = 1; d <= days; d++) {
        var st = Date.UTC(y, m, d) - off * 1000, ev = A.dayEvents(st, loc.lat, loc.lng), hrs = [];
        for (var h = 0; h < 24; h++) { var t = st + h * 36e5; hrs.push({ t: t, score: A.scoreAt(t + 18e5, ev, null).score }); }
        var sc = Math.min(100, Math.round(A.daySummary(hrs).score * 1.25)), r = A.rate(sc);
        var majors = ev.periods.filter(function (p) { return p.type === 'major'; }).map(function (p) { return A.fmtTime(p.c, off); }).join('<br>');
        html += '<div class="cell' + (y + '-' + m + '-' + d === todayKey ? ' today' : '') + '"><div class="num">' + d + '</div><div class="mph" title="' + ev.phase.name + '">' + A.moonSVG(ev.phase.phase, 20) + '</div><div class="rate" title="' + r.label + '">' + [1, 2, 3, 4].map(function (k) { return '<i class="' + (k <= r.fish ? 'on' : '') + '"></i>'; }).join('') + '</div><div class="t"><b>' + r.label + '</b><br>' + (majors || '—') + '</div></div>';
      }
      out.innerHTML = html;
    }
    $('[data-cal-prev]', root).addEventListener('click', function () { m--; if (m < 0) { m = 11; y--; } render(); });
    $('[data-cal-next]', root).addEventListener('click', function () { m++; if (m > 11) { m = 0; y++; } render(); });
    var pr = $('[data-cal-print]', root); if (pr) pr.addEventListener('click', function () { window.print(); });
    function setTZ(l) {
      loc = l; off = Math.round(l.lng / 15) * 3600; render();
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + l.lat + '&longitude=' + l.lng + '&daily=sunrise&timezone=auto&forecast_days=1').then(function (r) { return r.json(); }).then(function (j) { off = j.utc_offset_seconds; render(); }).catch(function () {});
    }
    bindSearch(root, function (l) { setLoc(l); setTZ(l); });
    setTZ(loc);
  }

  $$('[data-fc="widget"]').forEach(widget);
  $$('[data-fc="full"]').forEach(full);
  $$('[data-fc="calendar"]').forEach(calendar);
})();
