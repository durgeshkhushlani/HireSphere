// A "placement season" (academic year) runs July 1 -> June 30, matching the
// Indian academic calendar. Purely date-derived — there is no stored field
// on Drive and no scheduled rollover job, since the boundary recomputes
// itself from the wall clock every time it's read.

// e.g. Aug 2026 -> "2026-27"; June 2027 -> still "2026-27"; July 2027 ->
// "2027-28".
function academicYearLabel(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed; 6 = July
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

function getCurrentAcademicYear() {
  return academicYearLabel(new Date());
}

// Parses "2026-27" back into a [start, end) Date range for filtering — start
// is July 1 of the first year, end is July 1 of the next (exclusive). Returns
// null for a malformed label rather than throwing, so a bad query param is a
// no-op filter, not a 500.
function academicYearBounds(label) {
  const match = /^(\d{4})-(\d{2})$/.exec(label || '');
  if (!match) return null;
  const startYear = Number(match[1]);
  return {
    start: new Date(startYear, 6, 1),
    end: new Date(startYear + 1, 6, 1),
  };
}

module.exports = { academicYearLabel, getCurrentAcademicYear, academicYearBounds };
