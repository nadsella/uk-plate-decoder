const assert = require('node:assert');
const test = require('node:test');
const D = require('./decoder.js');
const NOW = new Date(2026, 9, 7); // 7 Oct 2026

test('current format', () => {
  const r = D.decode('la76 kxr', NOW);
  assert.equal(r.format, 'current'); assert.equal(r.valid, true); assert.equal(r.display, 'LA76 KXR');
  assert.match(r.segments[0].detail, /London/); assert.match(r.segments[1].detail, /Wimbledon/);
  assert.match(r.segments[2].detail, /September 2026 to February 2027/);
});
test('march code', () => assert.match(D.decode('SV51HRT', NOW).segments[2].detail, /September 2001/));
test('aberdeen', () => assert.match(D.decode('SV51HRT', NOW).segments[1].detail, /Aberdeen/));
test('future code', () => { const r = D.decode('AB27CDE', NOW); assert.equal(r.valid, false); assert.match(r.segments[2].detail, /March 2027/); });
test('01 never issued', () => assert.equal(D.decode('AB01CDE', NOW).valid, false));
test('bad letters', () => { assert.equal(D.decode('ZA12ABC', NOW).valid, false); assert.equal(D.decode('AB12ABI', NOW).valid, false); assert.equal(D.decode('AQ12ABC', NOW).valid, false); });
test('isle of wight', () => assert.match(D.decode('HW15ABC', NOW).segments[1].detail, /Isle of Wight/));
test('prefix', () => { const r = D.decode('P472FKL', NOW); assert.equal(r.format, 'prefix'); assert.match(r.facts[0].value, /August 1996/); });
test('suffix', () => { const r = D.decode('TWD451K', NOW); assert.equal(r.format, 'suffix'); assert.match(r.facts[0].value, /August 1971/); });
test('ni', () => assert.equal(D.decode('AIZ4821', NOW).format, 'ni'));
test('q', () => assert.equal(D.decode('Q314DBX', NOW).format, 'q'));
test('dateless', () => { assert.equal(D.decode('MB27', NOW).format, 'dateless'); assert.equal(D.decode('1ABC', NOW).format, 'dateless'); });
test('unknown', () => assert.equal(D.decode('HELLOWORLD', NOW).format, 'unknown'));
test('identifiers', () => {
  assert.equal(D.currentAgeIdentifier(NOW), '76');
  assert.equal(D.currentAgeIdentifier(new Date(2027, 1, 1)), '76');
  assert.equal(D.currentAgeIdentifier(new Date(2026, 3, 1)), '26');
  assert.deepEqual(D.nextAgeIdentifier(NOW), { code: '27', y: 2027, m: 3 });
  const ids = D.issuedIdentifiers(NOW); assert.equal(ids[0].code, '51'); assert.equal(ids.at(-1).code, '76'); assert.equal(ids.length, 51);
});
test('ages', () => { const r = D.decode('LA25ABC', NOW); assert.equal(r.facts.find(f => f.label === 'Vehicle age').value, '1 year old'); });
