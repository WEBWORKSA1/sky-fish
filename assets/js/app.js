/* Sky.Fish — site interactions */
(function () {
  'use strict';
  var C = window.SF_CONFIG || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function addr() { return atob(C._k.map(function (x) { return x.split('').reverse().join(''); }).join('')); }
  function endpoint() { return 'https://formsubmit.co/ajax/' + (C.formAlias || addr()); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* Mobile nav */
  var burger = $('.burger'), menu = $('.menu');
  if (burger && menu) burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', open);
  });

  /* Hidden-address mail links: <a data-mail data-subject="..."> */
  $$('[data-mail]').forEach(function (a) {
    a.setAttribute('href', '#');
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      var subj = a.getAttribute('data-subject') || 'Sky.Fish enquiry';
      window.location.href = 'mailto:' + addr() + '?subject=' + encodeURIComponent(subj);
    });
  });

  /* Reveal on scroll */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  /* Cookie notice */
  var ck = $('#cookie');
  if (ck && !store('sf_cookie')) ck.classList.add('show');
  $$('[data-cookie]').forEach(function (b) { b.addEventListener('click', function () { store('sf_cookie', b.getAttribute('data-cookie')); ck.classList.remove('show'); }); });

  /* Lite YouTube embeds: <div class="vid" data-yt="ID" data-title="..."> */
  $$('.vid[data-yt]').forEach(function (v) {
    var id = v.getAttribute('data-yt'), t = v.getAttribute('data-title') || 'Video';
    v.innerHTML = '<img loading="lazy" src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="' + t.replace(/"/g, '') + '"><div class="play"><span></span></div>';
    v.setAttribute('role', 'button'); v.setAttribute('tabindex', '0'); v.setAttribute('aria-label', 'Play video: ' + t);
    function play() { v.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="' + t.replace(/"/g, '') + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'; }
    v.addEventListener('click', play, { once: true });
    v.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  });

  /* Filter pills: <div data-filter="#target"> <button data-f="all|cat"> ; items have data-cat */
  $$('[data-filter]').forEach(function (bar) {
    var target = $(bar.getAttribute('data-filter'));
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      $$('[data-f]', bar).forEach(function (x) { x.classList.toggle('active', x === b); });
      var f = b.getAttribute('data-f');
      $$('[data-cat]', target).forEach(function (it) { it.style.display = (f === 'all' || it.getAttribute('data-cat').indexOf(f) > -1) ? '' : 'none'; });
    });
  });
  var search = $('#siteSearch');
  if (search) search.addEventListener('input', function () {
    var q = search.value.toLowerCase().trim();
    $$(search.getAttribute('data-target') + ' [data-cat]').forEach(function (it) { it.style.display = !q || it.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none'; });
  });

  /* Multi-step forms */
  $$('form[data-steps]').forEach(function (form) {
    var steps = $$('.step', form), bar = $$('.steps-bar i', form), i = 0;
    function show(n) {
      i = n; steps.forEach(function (s, k) { s.classList.toggle('on', k === n); });
      bar.forEach(function (b, k) { b.classList.toggle('on', k <= n); });
    }
    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-next]')) {
        e.preventDefault();
        var req = $$('[required]', steps[i]), ok = true;
        req.forEach(function (f) { if (!f.checkValidity()) { ok = false; f.reportValidity(); } });
        var radios = $$('input[type=radio][data-req]', steps[i]);
        if (radios.length && !radios.some(function (r) { return r.checked; })) { ok = false; radios[0].setCustomValidity('Please choose one'); radios[0].reportValidity(); radios[0].setCustomValidity(''); }
        if (ok && i < steps.length - 1) show(i + 1);
      }
      if (e.target.closest('[data-prev]')) { e.preventDefault(); if (i > 0) show(i - 1); }
    });
    show(0);
  });

  /* Form sending (FormSubmit AJAX) */
  $$('form[data-sf-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var msg = $('.form-msg', form), btn = $('[type=submit]', form);
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = data[k] ? data[k] + ', ' + v : v; });
      if (data._honey) return;
      data._subject = 'Sky.Fish — ' + form.getAttribute('data-sf-form');
      data._template = 'table'; data._captcha = 'false';
      data['Form'] = form.getAttribute('data-sf-form'); data['Page'] = location.href;
      if (btn) { btn.disabled = true; btn.dataset.t = btn.textContent; btn.textContent = 'Sending…'; }
      fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (String(j.success) === 'true' || j.success === true) {
            msg.className = 'form-msg ok'; msg.textContent = form.getAttribute('data-ok') || 'Thanks! Your message is on its way — we reply within 1–2 business days.';
            form.reset(); var st = $$('.step', form); if (st.length) { st.forEach(function (s, k) { s.classList.toggle('on', k === 0); }); }
          } else { throw new Error(j.message || 'fail'); }
        })
        .catch(function () {
          msg.className = 'form-msg err';
          msg.innerHTML = 'We couldn’t send that automatically. <a href="#" data-fallback>Click here to send it by email instead</a>.';
          var fb = $('[data-fallback]', msg);
          fb.addEventListener('click', function (ev) {
            ev.preventDefault();
            var body = Object.keys(data).filter(function (k) { return k[0] !== '_'; }).map(function (k) { return k + ': ' + data[k]; }).join('\n');
            location.href = 'mailto:' + addr() + '?subject=' + encodeURIComponent(data._subject) + '&body=' + encodeURIComponent(body);
          });
        })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.t; } });
    });
  });

  /* Support tiers → payment link or pledge form */
  $$('[data-tier]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      var t = b.getAttribute('data-tier'), link = C.payLinks && C.payLinks[t];
      if (link) { b.setAttribute('href', link); b.setAttribute('target', '_blank'); b.setAttribute('rel', 'noopener'); return; }
      e.preventDefault();
      var sel = $('#pledgeTier'); if (sel) sel.value = b.getAttribute('data-label') || t;
      var f = $('#pledge'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* Knot steppers */
  $$('.knot-steps').forEach(function (ol) {
    var lis = $$('li', ol), i = 0, wrap = ol.parentNode;
    function set(n) { i = Math.max(0, Math.min(lis.length - 1, n)); lis.forEach(function (l, k) { l.classList.toggle('on', k <= i); }); }
    lis.forEach(function (l, k) { l.addEventListener('click', function () { set(k); }); });
    var nx = $('[data-knot-next]', wrap), pv = $('[data-knot-prev]', wrap);
    if (nx) nx.addEventListener('click', function () { set(i + 1); });
    if (pv) pv.addEventListener('click', function () { set(i - 1); });
    set(0);
  });

  /* Countdown: <span data-countdown="2026-11-30T23:59:00Z"> */
  $$('[data-countdown]').forEach(function (el) {
    var v = el.getAttribute('data-countdown'), n = new Date(), end = v === 'month-end' ? new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59).getTime() : Date.parse(v);
    function tick() {
      var d = Math.max(0, end - Date.now()), D = Math.floor(d / 864e5), H = Math.floor(d % 864e5 / 36e5), M = Math.floor(d % 36e5 / 6e4);
      el.textContent = D + 'd ' + H + 'h ' + M + 'm';
    }
    tick(); setInterval(tick, 30000);
  });

  $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
