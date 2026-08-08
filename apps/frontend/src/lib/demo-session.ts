import type { DemoSession } from "@/lib/api/demo";

const KEY = "hiresphere.demo-session";

export function saveDemoSession(session: DemoSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  localStorage.removeItem(KEY);
}

// Reads the stored session, discarding (and clearing) it if it's malformed
// or its expiresAt has already passed — callers never see a stale session.
export function getDemoSession(): DemoSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DemoSession;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

// The sibling {token,user} to switch to from the given logged-in user id —
// null if that id isn't part of an active demo session at all.
export function getDemoSwitchTarget(currentUserId: string | undefined) {
  const session = getDemoSession();
  if (!session || !currentUserId) return null;
  if (session.admin.user.id === currentUserId) return session.student;
  if (session.student.user.id === currentUserId) return session.admin;
  return null;
}
