const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { academicYearLabel, academicYearBounds } = require('../src/lib/academicYear');

describe('academicYearLabel', () => {
  test('a date in August rolls into that year\'s season', () => {
    assert.equal(academicYearLabel(new Date(2026, 7, 9)), '2026-27');
  });

  test('a date in June still belongs to the previous July\'s season', () => {
    assert.equal(academicYearLabel(new Date(2027, 5, 30)), '2026-27');
  });

  test('July 1st itself starts the new season', () => {
    assert.equal(academicYearLabel(new Date(2027, 6, 1)), '2027-28');
  });

  test('June 30th just before is still the old season', () => {
    assert.equal(academicYearLabel(new Date(2027, 5, 30)), '2026-27');
  });
});

describe('academicYearBounds', () => {
  test('parses a label into a [July 1, next July 1) range', () => {
    const { start, end } = academicYearBounds('2026-27');
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 6);
    assert.equal(start.getDate(), 1);
    assert.equal(end.getFullYear(), 2027);
    assert.equal(end.getMonth(), 6);
    assert.equal(end.getDate(), 1);
  });

  test('returns null for a malformed label instead of throwing', () => {
    assert.equal(academicYearBounds('not-a-year'), null);
    assert.equal(academicYearBounds(undefined), null);
  });
});
