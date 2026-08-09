"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { companyPortalLogin, type CompanyPortalSession } from "@/lib/api/company-portal";
import {
  getCompanyPortalSession,
  saveCompanyPortalSession,
  clearCompanyPortalSession,
} from "@/lib/company-portal-session";
import { listApplicationsForDrive, updateApplicationStatus, type ApplicantEntry } from "@/lib/api/applications";
import { CompanyApplicantRow, type SavePatch } from "./company-applicant-row";
import { ThemeToggle } from "@/components/theme-toggle";

export function CompanyPortalView({
  universityDomain,
  accessCode,
}: {
  universityDomain: string;
  accessCode: string;
}) {
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<CompanyPortalSession | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applicants, setApplicants] = useState<ApplicantEntry[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getCompanyPortalSession(accessCode));
    setChecked(true);
  }, [accessCode]);

  async function refresh(current: CompanyPortalSession) {
    try {
      setApplicants(await listApplicationsForDrive(current.drive.id, current.token));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load applicants");
    }
  }

  useEffect(() => {
    if (session) refresh(session);
  }, [session]);

  async function handleLogin() {
    if (!password) {
      toast.error("Enter the password");
      return;
    }
    setSubmitting(true);
    try {
      const result = await companyPortalLogin({ universityDomain, accessCode, password });
      saveCompanyPortalSession(accessCode, result);
      setSession(result);
      setPassword("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    clearCompanyPortalSession();
    setSession(null);
    setApplicants(null);
  }

  async function handleSave(applicant: ApplicantEntry, patch: SavePatch) {
    if (!session) return;
    try {
      await updateApplicationStatus(applicant.id, patch, session.token);
      toast.success(`Updated ${applicant.studentProfile.user.name}`);
      refresh(session);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update applicant");
    }
  }

  if (!checked) return null;

  if (!session) {
    return (
      <div className="relative flex min-h-full flex-1 items-center justify-center p-8">
        <ThemeToggle className="absolute top-6 right-6" />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <Image src="/brand/icon.png" alt="" width={32} height={32} className="rounded-[9px]" />
            <span className="font-heading text-lg font-extrabold">HireSphere</span>
          </div>
          <h1 className="font-heading text-xl font-extrabold tracking-tight">Company portal</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter the password from your HireSphere invite email to review applicants for this
            drive.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} disabled={submitting}>
              {submitting ? "Signing in…" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-card px-6 py-3.5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold">{session.drive.title}</div>
            <div className="text-xs text-muted-foreground">{session.drive.companyName}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="flex-1 bg-muted/30 px-6 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-heading text-xl font-extrabold">Applicants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and update the status of everyone who applied to this drive.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {applicants === null ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)
            ) : applicants.length === 0 ? (
              <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                No applicants yet.
              </p>
            ) : (
              applicants.map((a) => (
                <CompanyApplicantRow
                  key={a.id}
                  applicant={a}
                  timezone={session.drive.universityTimezone}
                  onSave={handleSave}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
