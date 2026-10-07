/*
 * UK number plate decoder.
 * Pure functions, no DOM. Works in the browser (window.PlateDecoder) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  // ---------------------------------------------------------------------------
  // Current format (since September 2001): AB12 CDE
  // ---------------------------------------------------------------------------

  // Memory tag: first letter = region, second letter = DVLA local office.
  // Offices are the original 2001 allocations. Most local offices closed in 2013;
  // the tags still mark the region the plate was allocated to.
  var REGIONS = {
    A: { name: 'Anglia', offices: [['A', 'N', 'Peterborough'], ['O', 'U', 'Norwich'], ['V', 'Y', 'Ipswich']] },
    B: { name: 'Birmingham', offices: [['A', 'Y', 'Birmingham']] },
    C: { name: 'Cymru (Wales)', offices: [['A', 'O', 'Cardiff'], ['P', 'V', 'Swansea'], ['W', 'Y', 'Bangor']] },
    D: { name: 'Deeside', offices: [['A', 'K', 'Chester'], ['L', 'Y', 'Shrewsbury']] },
    E: { name: 'Essex', offices: [['A', 'Y', 'Chelmsford']] },
    F: { name: 'Forest and Fens', offices: [['A', 'P', 'Nottingham'], ['R', 'Y', 'Lincoln']] },
    G: { name: 'Garden of England', offices: [['A', 'O', 'Maidstone'], ['P', 'Y', 'Brighton']] },
    H: { name: 'Hampshire and Dorset', offices: [['A', 'J', 'Bournemouth'], ['K', 'Y', 'Portsmouth']] },
    K: { name: 'Milton Keynes', offices: [['A', 'L', 'Luton'], ['M', 'Y', 'Northampton']] },
    L: { name: 'London', offices: [['A', 'J', 'Wimbledon'], ['K', 'T', 'Stanmore'], ['U', 'Y', 'Sidcup']] },
    M: { name: 'Manchester and Merseyside', offices: [['A', 'Y', 'Manchester']] },
    N: { name: 'North', offices: [['A', 'O', 'Newcastle'], ['P', 'Y', 'Stockton']] },
    O: { name: 'Oxford', offices: [['A', 'Y', 'Oxford']] },
    P: { name: 'Preston', offices: [['A', 'T', 'Preston'], ['U', 'Y', 'Carlisle']] },
    R: { name: 'Reading', offices: [['A', 'Y', 'Reading (Theale)']] },
    S: { name: 'Scotland', offices: [['A', 'J', 'Glasgow'], ['K', 'O', 'Edinburgh'], ['P', 'T', 'Dundee'], ['U', 'W', 'Aberdeen'], ['X', 'Y', 'Inverness']] },
    V: { name: 'Severn Valley', offices: [['A', 'Y', 'Worcester']] },
    W: { name: 'West of England', offices: [['A', 'J', 'Exeter'], ['K', 'L', 'Truro'], ['M', 'Y', 'Bristol']] },
    Y: { name: 'Yorkshire', offices: [['A', 'K', 'Leeds'], ['L', 'U', 'Sheffield'], ['V', 'Y', 'Beverley']] }
  };

  function officeFor(region, letter) {
    var r = REGIONS[region];
    if (!r) return null;
    for (var i = 0; i < r.offices.length; i++) {
      var o = r.offices[i];
      if (letter >= o[0] && letter <= o[1]) return o[2];
    }
    return null;
  }

  function ym(year, month) { return year * 12 + (month - 1); }
  function fmt(year, month) { return MONTHS[month - 1] + ' ' + year; }

  /** Age identifier -> { start: {y,m}, end: {y,m} } or null if never valid. */
  function ageIdentifierPeriod(code) {
    var n = parseInt(code, 10);
    if (isNaN(n) || code.length !== 2) return null;
    if (n === 1) return null; // "01" was never issued: the scheme began with 51 (Sep 2001).
    var year, month;
    if (n === 0) { year = 2050; month = 9; }
    else if (n <= 50) { year = 2000 + n; month = 3; }
    else { year = 2000 + (n - 50); month = 9; }
    var end = month === 3 ? { y: year, m: 8 } : { y: year + 1, m: 2 };
    return { start: { y: year, m: month }, end: end };
  }

  /** The age identifier in use on a given date. */
  function currentAgeIdentifier(date) {
    var y = date.getFullYear(), m = date.getMonth() + 1;
    var n;
    if (m >= 3 && m <= 8) n = y - 2000;
    else if (m >= 9) n = y - 2000 + 50;
    else n = y - 1 - 2000 + 50; // Jan, Feb belong to previous September's release
    return pad2(n % 100);
  }

  function nextAgeIdentifier(date) {
    var y = date.getFullYear(), m = date.getMonth() + 1;
    if (m < 3) return { code: pad2(y - 2000), y: y, m: 3 };
    if (m < 9) return { code: pad2((y - 2000 + 50) % 100), y: y, m: 9 };
    return { code: pad2(y + 1 - 2000), y: y + 1, m: 3 };
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** All age identifiers issued up to `date`, oldest first. */
  function issuedIdentifiers(date) {
    var out = [];
    var limit = ym(date.getFullYear(), date.getMonth() + 1);
    for (var y = 2001; y <= date.getFullYear(); y++) {
      [3, 9].forEach(function (m) {
        if (y === 2001 && m === 3) return;
        if (ym(y, m) > limit) return;
        var code = m === 3 ? pad2(y - 2000) : pad2((y - 2000 + 50) % 100);
        out.push({ code: code, y: y, m: m });
      });
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Prefix (1983 to 2001): A123 BCD — first letter is the year.
  // Suffix (1963 to 1983): ABC 123D — last letter is the year.
  // ---------------------------------------------------------------------------

  var PREFIX = {
    A: [1983, 8, 1984, 7], B: [1984, 8, 1985, 7], C: [1985, 8, 1986, 7], D: [1986, 8, 1987, 7],
    E: [1987, 8, 1988, 7], F: [1988, 8, 1989, 7], G: [1989, 8, 1990, 7], H: [1990, 8, 1991, 7],
    J: [1991, 8, 1992, 7], K: [1992, 8, 1993, 7], L: [1993, 8, 1994, 7], M: [1994, 8, 1995, 7],
    N: [1995, 8, 1996, 7], P: [1996, 8, 1997, 7], R: [1997, 8, 1998, 7], S: [1998, 8, 1999, 2],
    T: [1999, 3, 1999, 8], V: [1999, 9, 2000, 2], W: [2000, 3, 2000, 8], X: [2000, 9, 2001, 2],
    Y: [2001, 3, 2001, 8]
  };

  var SUFFIX = {
    A: [1963, 2, 1963, 12], B: [1964, 1, 1964, 12], C: [1965, 1, 1965, 12], D: [1966, 1, 1966, 12],
    E: [1967, 1, 1967, 7], F: [1967, 8, 1968, 7], G: [1968, 8, 1969, 7], H: [1969, 8, 1970, 7],
    J: [1970, 8, 1971, 7], K: [1971, 8, 1972, 7], L: [1972, 8, 1973, 7], M: [1973, 8, 1974, 7],
    N: [1974, 8, 1975, 7], P: [1975, 8, 1976, 7], R: [1976, 8, 1977, 7], S: [1977, 8, 1978, 7],
    T: [1978, 8, 1979, 7], V: [1979, 8, 1980, 7], W: [1980, 8, 1981, 7], X: [1981, 8, 1982, 7],
    Y: [1982, 8, 1983, 7]
  };

  function rangeText(r) {
    return fmt(r[0], r[1]) + ' to ' + fmt(r[2], r[3]);
  }

  // ---------------------------------------------------------------------------
  // Main entry point
  // ---------------------------------------------------------------------------

  function normalise(input) {
    return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Decode a registration.
   * Returns { input, plate, display, format, valid, segments[], facts[], notes[] }
   * segments: [{ text, role, label, detail }]
   */
  function decode(input, now) {
    now = now || new Date();
    var p = normalise(input);
    var res = { input: input, plate: p, display: p, format: null, formatName: null, valid: false, segments: [], facts: [], notes: [] };
    if (!p) { res.format = 'empty'; return res; }
    var m;

    // --- Current format -------------------------------------------------------
    if ((m = /^([A-Z]{2})([0-9]{2})([A-Z]{3})$/.exec(p))) {
      var tag = m[1], age = m[2], rand = m[3];
      res.format = 'current';
      res.formatName = 'Current format (since September 2001)';
      res.display = tag + age + ' ' + rand;
      res.valid = true;

      var region = REGIONS[tag[0]];
      var office = officeFor(tag[0], tag[1]);
      var regionDetail;
      if (region) {
        regionDetail = region.name;
      } else if (tag[0] === 'X') {
        regionDetail = 'Personal export (X tags are issued for vehicles bought tax-free to leave the UK)';
      } else {
        regionDetail = 'No region uses ' + tag[0] + ' as a first letter';
        res.valid = false;
      }
      var officeDetail;
      if (/[IQZ]/.test(tag[1])) {
        officeDetail = 'I, Q and Z are never used as the second letter';
        res.valid = false;
      } else if (region) {
        officeDetail = office ? 'DVLA office: ' + office : 'Outside the original ' + region.name + ' allocation';
        if (tag === 'HW') officeDetail = 'Isle of Wight (a Portsmouth tag)';
      } else {
        officeDetail = 'Office letter';
      }

      res.segments.push({ text: tag[0], role: 'region', label: 'Region', detail: regionDetail });
      res.segments.push({ text: tag[1], role: 'office', label: 'Local office', detail: officeDetail });

      var period = ageIdentifierPeriod(age);
      var ageDetail;
      if (!period) {
        ageDetail = age === '01' ? '01 was never issued. The scheme started with 51 in September 2001.' : 'Not a valid age identifier';
        res.valid = false;
      } else {
        var startText = fmt(period.start.y, period.start.m);
        var endText = fmt(period.end.y, period.end.m);
        var issued = ym(period.start.y, period.start.m) <= ym(now.getFullYear(), now.getMonth() + 1);
        if (issued) {
          ageDetail = 'Registered ' + startText + ' to ' + endText;
          res.facts.push({ label: 'First registered', value: startText + ' to ' + endText });
          var ageYears = now.getFullYear() - period.start.y - (now.getMonth() + 1 < period.start.m ? 1 : 0);
          var newestYears = now.getFullYear() - period.end.y - (now.getMonth() + 1 <= period.end.m ? 1 : 0);
          var ageText;
          if (ageYears < 1) ageText = 'Under a year old';
          else if (newestYears === ageYears) ageText = ageYears + ' year' + (ageYears === 1 ? '' : 's') + ' old';
          else if (newestYears < 1) ageText = 'Up to ' + ageYears + ' year' + (ageYears === 1 ? '' : 's') + ' old';
          else ageText = newestYears + ' to ' + ageYears + ' years old';
          res.facts.push({ label: 'Vehicle age', value: ageText });
        } else {
          ageDetail = 'Not issued yet. ' + age + ' plates arrive on 1 ' + startText + '.';
          res.valid = false;
        }
        res.release = { code: age, month: period.start.m, year: period.start.y };
      }
      res.segments.push({ text: age, role: 'age', label: 'Age identifier', detail: ageDetail });

      var randDetail = 'Random letters that make the plate unique';
      if (/[IQ]/.test(rand)) {
        randDetail = 'I and Q are never used in the last three letters';
        res.valid = false;
      }
      res.segments.push({ text: rand, role: 'random', label: 'Random letters', detail: randDetail });

      if (region) res.facts.unshift({ label: 'Region', value: region.name + (office ? ' · ' + (tag === 'HW' ? 'Isle of Wight' : office) : '') });
      res.notes.push('Private (cherished) plates use this format too. A personalised plate can make a car look older, never newer, so the age identifier shows the latest the car could have been registered.');
      return res;
    }

    // --- Q plates -------------------------------------------------------------
    if ((m = /^Q([0-9]{1,3})([A-Z]{3})$/.exec(p))) {
      res.format = 'q';
      res.formatName = 'Q plate';
      res.display = 'Q' + m[1] + ' ' + m[2];
      res.valid = true;
      res.segments.push({ text: 'Q', role: 'age', label: 'Q prefix', detail: 'Age or identity unknown' });
      res.segments.push({ text: m[1], role: 'serial', label: 'Serial', detail: 'Sequence number' });
      res.segments.push({ text: m[2], role: 'random', label: 'Letters', detail: 'Issued by the DVLA' });
      res.facts.push({ label: 'Meaning', value: 'Age or identity can’t be confirmed' });
      res.notes.push('Q plates go on kit cars, rebuilt vehicles and imports whose age or identity the DVLA can’t confirm.');
      return res;
    }

    // --- Prefix format --------------------------------------------------------
    if ((m = /^([A-Z])([0-9]{1,3})([A-Z]{3})$/.exec(p)) && PREFIX[m[1]]) {
      var pr = PREFIX[m[1]];
      res.format = 'prefix';
      res.formatName = 'Prefix format (1983 to 2001)';
      res.display = m[1] + m[2] + ' ' + m[3];
      res.valid = true;
      res.segments.push({ text: m[1], role: 'age', label: 'Year letter', detail: 'Registered ' + rangeText(pr) });
      res.segments.push({ text: m[2], role: 'serial', label: 'Serial', detail: 'Sequence number from 1 to 999' });
      res.segments.push({ text: m[3][0], role: 'random', label: 'Serial letter', detail: 'Part of the sequence' });
      res.segments.push({ text: m[3].slice(1), role: 'region', label: 'Area code', detail: 'The local office that issued the plate' });
      res.facts.push({ label: 'First registered', value: rangeText(pr) });
      res.facts.push({ label: 'Vehicle age', value: (now.getFullYear() - pr[2]) + '+ years old' });
      if (m[1] === 'S' || m[1] === 'T' || m[1] === 'V' || m[1] === 'W' || m[1] === 'X' || m[1] === 'Y') {
        res.notes.push('From 1999 the year letter changed twice a year, in March and September, to spread out new car sales.');
      }
      return res;
    }

    // --- Suffix format --------------------------------------------------------
    if ((m = /^([A-Z]{3})([0-9]{1,3})([A-Z])$/.exec(p)) && SUFFIX[m[3]] && !/[IZ]/.test(m[1].slice(1))) {
      var sf = SUFFIX[m[3]];
      res.format = 'suffix';
      res.formatName = 'Suffix format (1963 to 1983)';
      res.display = m[1] + ' ' + m[2] + m[3];
      res.valid = true;
      res.segments.push({ text: m[1][0], role: 'random', label: 'Serial letter', detail: 'Part of the sequence' });
      res.segments.push({ text: m[1].slice(1), role: 'region', label: 'Area code', detail: 'The local council that issued the plate' });
      res.segments.push({ text: m[2], role: 'serial', label: 'Serial', detail: 'Sequence number from 1 to 999' });
      res.segments.push({ text: m[3], role: 'age', label: 'Year letter', detail: 'Registered ' + rangeText(sf) });
      res.facts.push({ label: 'First registered', value: rangeText(sf) });
      res.facts.push({ label: 'Vehicle age', value: (now.getFullYear() - sf[2]) + '+ years old' });
      res.notes.push('Cars more than 40 years old can apply for historic vehicle tax, which is free.');
      return res;
    }

    // --- Northern Ireland -----------------------------------------------------
    if ((m = /^([A-Z]{1,3})([0-9]{1,4})$/.exec(p)) && /[IZ]/.test(m[1].slice(-2))) {
      res.format = 'ni';
      res.formatName = 'Northern Ireland';
      res.display = m[1] + ' ' + m[2];
      res.valid = true;
      var code = m[1].slice(-2);
      if (m[1].length === 3) res.segments.push({ text: m[1][0], role: 'random', label: 'Serial letter', detail: 'Part of the sequence' });
      res.segments.push({ text: code, role: 'region', label: 'County code', detail: 'Northern Ireland codes always contain an I or a Z' });
      res.segments.push({ text: m[2], role: 'serial', label: 'Serial', detail: 'Sequence number up to 9999' });
      res.facts.push({ label: 'Issued in', value: 'Northern Ireland' });
      res.facts.push({ label: 'Vehicle age', value: 'Not shown on the plate' });
      res.notes.push('Northern Ireland plates are dateless, so they are popular as private plates in Great Britain too.');
      return res;
    }

    // --- Dateless -------------------------------------------------------------
    if ((m = /^([A-Z]{1,3})([0-9]{1,4})$/.exec(p)) || (m = /^([0-9]{1,4})([A-Z]{1,3})$/.exec(p))) {
      res.format = 'dateless';
      res.formatName = 'Dateless (1903 to 1963)';
      res.display = m[1] + ' ' + m[2];
      res.valid = true;
      var lettersFirst = /^[A-Z]/.test(m[1]);
      var letters = lettersFirst ? m[1] : m[2], digits = lettersFirst ? m[2] : m[1];
      var segL = { text: letters, role: 'region', label: 'Area code', detail: 'The council that issued the plate' };
      var segD = { text: digits, role: 'serial', label: 'Serial', detail: 'Sequence number' };
      res.segments = lettersFirst ? [segL, segD] : [segD, segL];
      res.facts.push({ label: 'Vehicle age', value: 'Not shown on the plate' });
      res.notes.push('Dateless plates carry no age, so they can go on a car of any age. Short ones like this are often sold as cherished plates.');
      return res;
    }

    res.format = 'unknown';
    res.formatName = 'Not a UK format';
    res.notes.push('This doesn’t match any UK registration format. Check for typos, or try another plate.');
    return res;
  }

  var api = {
    decode: decode,
    normalise: normalise,
    ageIdentifierPeriod: ageIdentifierPeriod,
    currentAgeIdentifier: currentAgeIdentifier,
    nextAgeIdentifier: nextAgeIdentifier,
    issuedIdentifiers: issuedIdentifiers,
    REGIONS: REGIONS,
    MONTHS: MONTHS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlateDecoder = api;
})(typeof window !== 'undefined' ? window : this);
