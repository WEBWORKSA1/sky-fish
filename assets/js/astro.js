/* Sky.Fish forecast engine — original implementation.
   Low-precision solar & lunar positions (standard astronomical approximations),
   solunar periods and an hourly "bite score" blending sky + weather factors. */
(function (global) {
  'use strict';
  var PI = Math.PI, rad = PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545;
  var e = rad * 23.4397;

  function toDays(ms) { return ms / dayMs - 0.5 + J1970 - J2000; }
  function ra(l, b) { return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)); }
  function dec(l, b) { return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }
  function sidereal(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }
  function alt(H, phi, de) { return Math.asin(Math.sin(phi) * Math.sin(de) + Math.cos(phi) * Math.cos(de) * Math.cos(H)); }

  function sunCoords(d) {
    var M = rad * (357.5291 + 0.98560028 * d);
    var C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    var L = M + C + rad * 102.9372 + PI;
    return { dec: dec(L, 0), ra: ra(L, 0) };
  }
  function moonCoords(d) {
    var L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.229350 * d);
    var l = L + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F);
    return { ra: ra(l, b), dec: dec(l, b), dist: 385001 - 20905 * Math.cos(M) };
  }
  function sunAlt(ms, lat, lng) {
    var d = toDays(ms), c = sunCoords(d), H = sidereal(d, rad * -lng) - c.ra;
    return alt(H, rad * lat, c.dec) / rad;
  }
  function moonAlt(ms, lat, lng) {
    var d = toDays(ms), c = moonCoords(d), H = sidereal(d, rad * -lng) - c.ra;
    var h = alt(H, rad * lat, c.dec);
    // parallax correction (approx.)
    h = h - Math.asin(6378.14 / c.dist) * Math.cos(h);
    return h / rad;
  }

  var SYNODIC = 29.530588853, NEW_REF = Date.UTC(2000, 0, 6, 18, 14);
  function moonPhase(ms) {
    var p = ((ms - NEW_REF) / dayMs / SYNODIC) % 1; if (p < 0) p += 1;
    var illum = (1 - Math.cos(2 * PI * p)) / 2;
    var names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    var idx = Math.floor((p * 8) + 0.5) % 8;
    return { phase: p, illum: illum, name: names[idx], age: p * SYNODIC };
  }

  /* Scan a local day (start = local midnight in UTC ms) for rise/set/transit events. */
  function dayEvents(startMs, lat, lng) {
    var step = 5 * 6e4, n = 24 * 12, i, t;
    var sun = [], moon = [];
    for (i = -1; i <= n + 1; i++) { t = startMs + i * step; sun.push([t, sunAlt(t, lat, lng)]); moon.push([t, moonAlt(t, lat, lng)]); }
    function cross(arr, h0) {
      var rise = null, set = null;
      for (var k = 1; k < arr.length; k++) {
        var a = arr[k - 1], b = arr[k];
        if (a[0] < startMs || a[0] >= startMs + dayMs) continue;
        if (a[1] < h0 && b[1] >= h0 && rise === null) rise = a[0] + (h0 - a[1]) / (b[1] - a[1]) * step;
        if (a[1] >= h0 && b[1] < h0 && set === null) set = a[0] + (a[1] - h0) / (a[1] - b[1]) * step;
      }
      return { rise: rise, set: set };
    }
    function extremes(arr) {
      var hi = null, lo = null;
      for (var k = 1; k < arr.length - 1; k++) {
        var t0 = arr[k][0]; if (t0 < startMs || t0 >= startMs + dayMs) continue;
        if (arr[k][1] > arr[k - 1][1] && arr[k][1] >= arr[k + 1][1]) hi = t0;
        if (arr[k][1] < arr[k - 1][1] && arr[k][1] <= arr[k + 1][1]) lo = t0;
      }
      return { over: hi, under: lo };
    }
    var s = cross(sun, -0.833), m = cross(moon, 0.133), x = extremes(moon);
    var periods = [];
    if (x.over) periods.push({ type: 'major', label: 'Moon overhead', c: x.over, a: x.over - 36e5, b: x.over + 36e5 });
    if (x.under) periods.push({ type: 'major', label: 'Moon underfoot', c: x.under, a: x.under - 36e5, b: x.under + 36e5 });
    if (m.rise) periods.push({ type: 'minor', label: 'Moonrise', c: m.rise, a: m.rise - 18e5, b: m.rise + 18e5 });
    if (m.set) periods.push({ type: 'minor', label: 'Moonset', c: m.set, a: m.set - 18e5, b: m.set + 18e5 });
    periods.sort(function (p, q) { return p.c - q.c; });
    return { sunrise: s.rise, sunset: s.set, moonrise: m.rise, moonset: m.set, over: x.over, under: x.under, periods: periods, phase: moonPhase(startMs + dayMs / 2) };
  }

  /* Score one moment. wx = {p, p3 (pressure 3h earlier), wind (km/h), cloud (%), pop (%)} or null */
  function scoreAt(t, ev, wx) {
    var f = [], s = 22, best = 0, second = 0;
    ev.periods.forEach(function (p) {
      var d = Math.abs(t - p.c) / 36e5, v = p.type === 'major' ? 40 * Math.max(0, 1 - d / 1.6) : 24 * Math.max(0, 1 - d / 1.1);
      if (v > best) { second = best; best = v; } else if (v > second) second = v;
    });
    var sol = best + second * 0.3; s += sol; f.push(['Solunar timing', sol]);
    var sun = 0;
    [ev.sunrise, ev.sunset].forEach(function (x) { if (x) sun = Math.max(sun, 18 * Math.max(0, 1 - Math.abs(t - x) / 36e5 / 1.6)); });
    s += sun; f.push(['Dawn / dusk light', sun]);
    var mp = 9 * Math.abs(Math.cos(2 * PI * ev.phase.phase)); s += mp; f.push(['Moon phase', mp]);
    if (wx) {
      var pr = 0;
      if (wx.p != null && wx.p3 != null) {
        var dp = wx.p - wx.p3;
        if (dp <= -1 && dp >= -4) pr = 9; else if (dp < -4) pr = -2; else if (Math.abs(dp) < 1) pr = 3; else if (dp < 2.5) pr = -3; else pr = -9;
        if (wx.p > 1024 && dp >= 0) pr -= 3;
      }
      s += pr; f.push(['Barometric trend', pr]);
      var w = 0;
      if (wx.wind != null) { if (wx.wind < 3) w = -2; else if (wx.wind <= 20) w = 5; else if (wx.wind <= 30) w = 0; else w = -12; }
      s += w; f.push(['Wind', w]);
      var c = 0, hr = wx.hour;
      if (wx.cloud != null) { if (wx.cloud >= 50 && wx.cloud <= 92) c = 4; else if (wx.cloud > 92) c = 2; else if (wx.cloud < 20 && hr >= 10 && hr <= 16) c = -4; }
      s += c; f.push(['Cloud cover', c]);
      var r = 0;
      if (wx.pop != null) { if (wx.pop > 75) r = -4; else if (wx.pop >= 30) r = 2; }
      s += r; f.push(['Rain chance', r]);
    }
    return { score: Math.max(0, Math.min(100, Math.round(s))), factors: f };
  }

  function rate(v) {
    if (v >= 75) return { label: 'Excellent', cls: 'lvl-great', fish: 4 };
    if (v >= 60) return { label: 'Good', cls: 'lvl-good', fish: 3 };
    if (v >= 45) return { label: 'Fair', cls: 'lvl-ok', fish: 2 };
    return { label: 'Slow', cls: 'lvl-poor', fish: 1 };
  }

  function daySummary(hours) {
    var vals = hours.map(function (h) { return h.score; }).sort(function (a, b) { return b - a; });
    var top = vals.slice(0, 8), avg = top.reduce(function (a, b) { return a + b; }, 0) / (top.length || 1);
    var bestI = 0, bestV = -1;
    for (var i = 0; i < hours.length - 1; i++) { var v = hours[i].score + hours[i + 1].score; if (v > bestV) { bestV = v; bestI = i; } }
    return { score: Math.round(avg), best: hours.length ? [hours[bestI].t, hours[Math.min(bestI + 1, hours.length - 1)].t + 36e5] : null };
  }

  function fmtTime(ms, off) {
    if (ms == null) return '—';
    var d = new Date(ms + off * 1000), h = d.getUTCHours(), m = d.getUTCMinutes(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12; return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }
  function fmtDay(ms, off, long) {
    var d = new Date(ms + off * 1000);
    var D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return long ? D[d.getUTCDay()] + ', ' + M[d.getUTCMonth()] + ' ' + d.getUTCDate() : D[d.getUTCDay()];
  }

  function moonSVG(phase, size) {
    size = size || 20; var r = size / 2 - 1, c = size / 2;
    var k = Math.cos(2 * PI * phase), waxing = phase < 0.5;
    var rx = Math.abs(k) * r;
    var sweepOuter = waxing ? 1 : 0;
    var lit = 'M' + c + ',' + (c - r) + ' A' + r + ',' + r + ' 0 0,' + sweepOuter + ' ' + c + ',' + (c + r) +
      ' A' + rx + ',' + r + ' 0 0,' + ((k > 0) === waxing ? 0 : 1) + ' ' + c + ',' + (c - r) + 'Z';
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#1d3550"/><path d="' + lit + '" fill="#ffe7a8"/></svg>';
  }

  global.SkyAstro = { dayEvents: dayEvents, scoreAt: scoreAt, rate: rate, daySummary: daySummary, moonPhase: moonPhase, fmtTime: fmtTime, fmtDay: fmtDay, moonSVG: moonSVG, dayMs: dayMs };
})(window);
