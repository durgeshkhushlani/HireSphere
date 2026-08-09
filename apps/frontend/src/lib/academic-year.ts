// A "placement season" (academic year) runs July 1 -> June 30, matching the
// Indian academic calendar. Purely date-derived, mirroring
// src/lib/academicYear.js on the backend — no API round trip needed for a
// label this cheap to compute, and no stored field on Drive.

export function academicYearLabel(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed; 6 = July
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function getCurrentAcademicYear(): string {
  return academicYearLabel(new Date());
}

// Current year plus a handful of prior ones, newest first — old seasons are
// never deleted, just filtered out of the default view, so this is what
// powers the "switch to a previous season" picker.
export function getRecentAcademicYears(count = 4): string[] {
  const [currentStart] = getCurrentAcademicYear().split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const startYear = currentStart - i;
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  });
}
