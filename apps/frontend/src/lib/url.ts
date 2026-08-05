// Resume links are pasted by students as plain text (e.g. "drive.google.com/...").
// Without a protocol, an <a href> resolves as a path relative to the current
// origin instead of an external link. This adds https:// when none is present.
export function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
