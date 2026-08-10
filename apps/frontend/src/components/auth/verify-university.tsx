"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { listUniversities, listPendingUniversities } from "@/lib/api/universities";

type CheckResult =
  | { tone: "success"; message: string }
  | { tone: "warning"; message: string }
  | { tone: "error"; message: string };

export function VerifyUniversityCheck() {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function handleCheck() {
    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain) {
      toast.error("Enter a domain to check");
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const [verified, pending] = await Promise.all([
        listUniversities(),
        listPendingUniversities(),
      ]);
      const verifiedMatch = verified.find((u) => u.domain.toLowerCase() === cleanDomain);
      if (verifiedMatch) {
        setResult({
          tone: "success",
          message: `${verifiedMatch.name} is verified — you're good to sign up.`,
        });
        return;
      }
      const pendingMatch = pending.find((u) => u.domain.toLowerCase() === cleanDomain);
      if (pendingMatch) {
        setResult({
          tone: "warning",
          message: `${pendingMatch.name} is registered and awaiting verification — hang tight.`,
        });
        return;
      }
      setResult({ tone: "error", message: "No university found for that domain yet." });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't check that domain");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="rounded-lg border bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">
        Your university must already be registered and verified before you can sign up.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-bold text-primary underline underline-offset-4"
        >
          Check if your university is verified
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground">
            Just the domain — if your email is{" "}
            <span className="font-semibold">student@oxford.edu</span>, enter{" "}
            <span className="font-semibold">oxford.edu</span>.
          </p>
          <div className="flex gap-2">
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCheck();
                }
              }}
              placeholder="yourcollege.edu"
              className="h-8 flex-1 text-xs"
            />
            <Button type="button" size="sm" onClick={handleCheck} disabled={checking}>
              {checking ? "Checking…" : "Check"}
            </Button>
          </div>
          {result && (
            <p
              className={`text-xs font-semibold ${
                result.tone === "success"
                  ? "text-primary"
                  : result.tone === "warning"
                    ? "text-accent"
                    : "text-destructive"
              }`}
            >
              {result.tone === "success" && "✓ "}
              {result.tone === "warning" && "⏳ "}
              {result.tone === "error" && "✗ "}
              {result.message}
              {result.tone === "error" && (
                <>
                  {" "}
                  <Link href="/register-university" className="underline">
                    Register it
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
