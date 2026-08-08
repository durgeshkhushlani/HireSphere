import type { CompanyPortalSession } from "@/lib/api/company-portal";

// Deliberately separate from auth-context.tsx's localStorage key — a
// company-portal login isn't a HireSphere account (no id/role/email in the
// usual AuthUser shape), so it gets its own small, independent session
// store rather than being shoehorned into the admin/student auth system.
const KEY = "hiresphere.company-portal-session";

type StoredSession = CompanyPortalSession & { accessCode: string };

export function saveCompanyPortalSession(accessCode: string, session: CompanyPortalSession) {
  localStorage.setItem(KEY, JSON.stringify({ ...session, accessCode }));
}

export function clearCompanyPortalSession() {
  localStorage.removeItem(KEY);
}

// Only returns a session if it matches the access code in the current URL —
// a stale session for a different drive should never silently apply here.
export function getCompanyPortalSession(accessCode: string): CompanyPortalSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.accessCode !== accessCode) return null;
    return parsed;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}
