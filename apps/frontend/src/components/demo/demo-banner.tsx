"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getDemoSwitchTarget, getDemoSession } from "@/lib/demo-session";

function timeRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "any moment";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function DemoBanner() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [now, setNow] = useState(0);

  useEffect(() => {
    // Hydration from localStorage — an external system unavailable during
    // SSR — plus a once-a-minute tick to keep the countdown text fresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const target = getDemoSwitchTarget(user?.id);
  if (!target) return null;

  const session = getDemoSession();

  function handleSwitch() {
    if (!target) return;
    login(target.token, target.user);
    router.push(target.user.role === "ADMIN" ? "/admin" : "/student");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-accent/10 px-6 py-2 text-xs font-semibold text-accent sm:px-8">
      <span className="flex items-center gap-1.5">
        <Sparkles className="size-3.5" />
        You&apos;re in a demo{session ? ` — resets in ${timeRemaining(session.expiresAt)}` : ""}. Nothing here is
        permanent.
      </span>
      <button
        onClick={handleSwitch}
        className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-accent-foreground transition-colors hover:bg-accent/90"
      >
        <ArrowLeftRight className="size-3.5" />
        Switch to {target.user.role === "ADMIN" ? "Admin" : "Student"} view
      </button>
    </div>
  );
}
