"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Clock, GraduationCap, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { startDemo, type DemoSession } from "@/lib/api/demo";
import { getDemoSession, saveDemoSession } from "@/lib/demo-session";

function timeRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "less than a minute";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function DemoEntry() {
  const router = useRouter();
  const { login } = useAuth();
  const [existing, setExisting] = useState<DemoSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [submittingRole, setSubmittingRole] = useState<"ADMIN" | "STUDENT" | null>(null);

  useEffect(() => {
    // One-time hydration from localStorage — an external system unavailable
    // during SSR, same allowed case as auth-context.tsx's own hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExisting(getDemoSession());
    setChecked(true);
  }, []);

  function enterAs(session: DemoSession, role: "ADMIN" | "STUDENT") {
    const { token, user } = role === "ADMIN" ? session.admin : session.student;
    login(token, user);
    router.push(role === "ADMIN" ? "/admin" : "/student");
  }

  function handleContinue(role: "ADMIN" | "STUDENT") {
    if (!existing) return;
    enterAs(existing, role);
  }

  async function handleStartNew(role: "ADMIN" | "STUDENT") {
    setSubmittingRole(role);
    try {
      const session = await startDemo();
      saveDemoSession(session);
      enterAs(session, role);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start the demo — try again");
    } finally {
      setSubmittingRole(null);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center p-8">
      <Link
        href="/"
        aria-label="Back to home"
        className="absolute top-6 left-6 flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
      </Link>

      <div className="w-full max-w-md text-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
          <Image src="/brand/icon.png" alt="" width={36} height={36} className="rounded-[9px]" />
          <span className="font-heading text-lg font-extrabold">HireSphere</span>
        </Link>

        <div className="mb-3 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
            <Sparkles className="size-3.5" />
            Try it out
          </span>
        </div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          Explore HireSphere with sample data
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No signup required — jump straight into a fully working admin or student view,
          pre-loaded with sample drives, applicants, and placements.
        </p>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Clock className="size-3.5" />
          {existing
            ? `This demo resets in ${timeRemaining(existing.expiresAt)} — nothing here is permanent.`
            : "Every demo resets after a few hours — nothing you do here is permanent."}
        </div>

        {!checked ? null : existing ? (
          <div className="mt-8 flex flex-col gap-3">
            <p className="text-sm font-semibold">Continue your demo</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => handleContinue("ADMIN")}>
                <Shield /> Continue as Admin
              </Button>
              <Button className="flex-1" onClick={() => handleContinue("STUDENT")}>
                <GraduationCap /> Continue as Student
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={submittingRole !== null}
              onClick={() => setExisting(null)}
            >
              Start a new demo instead
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              disabled={submittingRole !== null}
              onClick={() => handleStartNew("ADMIN")}
            >
              <Shield /> {submittingRole === "ADMIN" ? "Setting up…" : "Enter as Admin"}
            </Button>
            <Button
              className="flex-1"
              disabled={submittingRole !== null}
              onClick={() => handleStartNew("STUDENT")}
            >
              <GraduationCap /> {submittingRole === "STUDENT" ? "Setting up…" : "Enter as Student"}
            </Button>
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Looking for your real account?{" "}
          <Link href="/auth?mode=login" className="font-semibold text-primary">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
