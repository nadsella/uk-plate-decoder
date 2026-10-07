(function () {
  'use strict';
  var D = window.PlateDecoder;
  var now = new Date();
  var $ = function (id) { return document.getElementById(id); };
  var input = $('plate-input');
  var EXAMPLES = ['LA76 KXR', 'SV51 HRT', 'CW19 MNP', 'P472 FKL', 'TWD 451K', 'AIZ 4821', 'Q314 DBX', 'MB 27', 'AB27 CDE'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Render decode result ----------
  function render() {
    var r = D.decode(input.value, now);
    var out = $('result');
    if (r.format === 'empty') {
      out.innerHTML = '<p class="notes">Type a registration on the plate above, or pick an example.</p>';
      highlight(null);
      return;
    }
    var html = '<div class="verdict"><p class="format-name">' + esc(r.formatName) + '</p>';
    if (r.format !== 'unknown') {
      html += r.valid
        ? '<span class="pill ok">Valid format</span>'
        : '<span class="pill bad">Not a valid plate</span>';
    }
    html += '</div>';
    if (r.segments.length) {
      html += '<div class="segments">' + r.segments.map(function (s) {
        return '<div class="seg" data-role="' + s.role + '"><span class="chars">' + esc(s.text) +
          '</span><span class="seg-label">' + esc(s.label) + '</span><span class="seg-detail">' + esc(s.detail) + '</span></div>';
      }).join('') + '</div>';
    }
    if (r.facts.length) {
      html += '<dl class="facts">' + r.facts.map(function (f) {
        return '<div class="fact"><dt>' + esc(f.label) + '</dt><dd>' + esc(f.value) + '</dd></div>';
      }).join('') + '</dl>';
    }
    if (r.notes.length) {
      html += '<ul class="notes">' + r.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    }
    out.innerHTML = html;
    highlight(r);
  }

  function highlight(r) {
    var code = r && r.format === 'current' ? r.plate.slice(2, 4) : null;
    var region = r && r.format === 'current' ? r.plate[0] : null;
    document.querySelectorAll('.cell[data-code]').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-code') === code);
    });
    document.querySelectorAll('.region').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-letter') === region);
    });
  }

  function setPlate(v) {
    input.value = v;
    render();
    syncHash();
  }

  var hashTimer;
  function syncHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function () {
      var p = D.normalise(input.value);
      try { history.replaceState(null, '', p ? '#' + p : location.pathname + location.search); } catch (e) { /* ignore */ }
    }, 250);
  }

  // Format the plate as it's typed: AB12 CDE, A123 BCD etc.
  input.addEventListener('input', function () {
    var start = input.selectionStart, before = input.value.length;
    var raw = input.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    var p = D.normalise(raw);
    var r = D.decode(p, now);
    var formatted = r.format === 'unknown' || r.format === 'empty' ? raw.replace(/\s+/g, ' ').trimStart() : r.display;
    if (formatted !== input.value) {
      input.value = formatted;
      var pos = Math.max(0, start + (formatted.length - before));
      try { input.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
    }
    render();
    syncHash();
  });

  // ---------- Examples ----------
  $('examples').insertAdjacentHTML('beforeend', EXAMPLES.map(function (e) {
    return '<button type="button" class="chip" data-plate="' + e + '">' + e + '</button>';
  }).join(''));
  $('examples').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-plate]');
    if (b) setPlate(b.getAttribute('data-plate'));
  });

  // ---------- Front / rear ----------
  document.querySelectorAll('[data-face]').forEach(function (b) {
    b.addEventListener('click', function () {
      var front = b.getAttribute('data-face') === 'front';
      $('plate').classList.toggle('front', front);
      document.querySelectorAll('[data-face]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
    });
  });

  // ---------- Copy link ----------
  $('copy-link').addEventListener('click', function () {
    var p = D.normalise(input.value);
    var url = location.href.split('#')[0] + (p ? '#' + p : '');
    var done = function () { toast('Link copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { toast(url); });
    } else { toast(url); }
  });
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- Age identifier calendar ----------
  var issued = D.issuedIdentifiers(now);
  var current = D.currentAgeIdentifier(now);
  var byYear = {};
  issued.forEach(function (i) { (byYear[i.y] = byYear[i.y] || {})[i.m] = i; });
  var years = Object.keys(byYear).map(Number).sort(function (a, b) { return b - a; });
  $('calendar').innerHTML = years.map(function (y) {
    var cell = function (m) {
      var i = byYear[y][m];
      if (!i) return '<span class="cell empty" aria-hidden="true"></span>';
      return '<button type="button" class="cell' + (i.code === current ? ' current' : '') + '" data-code="' + i.code +
        '" aria-label="' + i.code + ': ' + D.MONTHS[m - 1] + ' ' + y + '"><b>' + i.code + '</b><small>' + (m === 3 ? 'Mar' : 'Sep') + '</small></button>';
    };
    return '<div class="year"><span class="y">' + y + '</span><div class="pair">' + cell(3) + cell(9) + '</div></div>';
  }).join('');
  $('calendar').addEventListener('click', function (ev) {
    var c = ev.target.closest('.cell[data-code]');
    if (!c) return;
    var p = D.normalise(input.value);
    var tag = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(p) ? p.slice(0, 2) : 'LA';
    var rand = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(p) ? p.slice(4) : 'KXR';
    setPlate(tag + c.getAttribute('data-code') + ' ' + rand);
    $('plate').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  var next = D.nextAgeIdentifier(now);
  $('next').innerHTML = 'Now issuing <strong>' + current + '</strong>. Next up: <strong>' + next.code +
    '</strong> on 1 ' + D.MONTHS[next.m - 1] + ' ' + next.y + '.';

  // ---------- Regions ----------
  $('regions').innerHTML = Object.keys(D.REGIONS).map(function (k) {
    var r = D.REGIONS[k];
    var offices = r.offices.map(function (o) {
      return o[2] + (r.offices.length > 1 ? ' <span>' + k + o[0] + '–' + k + o[1] + '</span>' : '');
    }).join(', ');
    return '<button type="button" class="region" data-letter="' + k + '"><span class="letter">' + k +
      '</span><span class="rname">' + esc(r.name) + '</span><span class="roffices">' + offices + '</span></button>';
  }).join('');
  $('regions').addEventListener('click', function (ev) {
    var b = ev.target.closest('.region');
    if (!b) return;
    var k = b.getAttribute('data-letter');
    var p = D.normalise(input.value);
    var cur = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(p) ? p : 'LA' + current + 'KXR';
    var second = D.REGIONS[k].offices[0][0];
    setPlate(k + second + cur.slice(2, 4) + ' ' + cur.slice(4));
    $('plate').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ---------- Today ----------
  $('today').textContent = now.getDate() + ' ' + D.MONTHS[now.getMonth()] + ' ' + now.getFullYear();

  // ---------- Start ----------
  var fromHash = D.normalise(decodeURIComponent((location.hash || '').slice(1)));
  var startPlate = fromHash ? D.decode(fromHash, now).display : 'LA' + current + ' KXR';
  input.value = startPlate;
  render();
  window.addEventListener('hashchange', function () {
    var h = D.normalise(decodeURIComponent(location.hash.slice(1)));
    if (h && h !== D.normalise(input.value)) { input.value = D.decode(h, now).display; render(); }
  });
})();
