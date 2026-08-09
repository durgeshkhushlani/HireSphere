"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { listPlacements, type Placement } from "@/lib/api/placements";
import { listDrives, type Drive } from "@/lib/api/drives";
import { setStudentPlacementLock } from "@/lib/api/students";
import { SearchInput } from "@/components/ui/search-input";
import { useAcademicYear } from "@/lib/academic-year-context";

type OfferFilter = "ALL" | "JOB" | "INTERNSHIP";

function formatPackage(amount: string | null) {
  if (amount == null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function average(amounts: string[]) {
  const numbers = amounts.map(Number);
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

export function PlacementsOverview() {
  const { token } = useAuth();
  const { selectedYear } = useAcademicYear();
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [drives, setDrives] = useState<Drive[] | null>(null);
  const [query, setQuery] = useState("");
  const [offerFilter, setOfferFilter] = useState<OfferFilter>("ALL");
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([listPlacements(token, selectedYear), listDrives(token, selectedYear)])
      .then(([placementList, driveList]) => {
        setPlacements(placementList);
        setDrives(driveList);
      })
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Couldn't load placements")
      );
  }, [token, selectedYear]);

  async function handleToggleLock(userId: string, locked: boolean) {
    if (!token) return;
    setTogglingUserId(userId);
    try {
      await setStudentPlacementLock(userId, locked, token);
      setPlacements((prev) =>
        prev
          ? prev.map((p) => (p.user.id === userId ? { ...p, user: { ...p.user, placementLocked: locked } } : p))
          : prev
      );
      toast.success(locked ? "Student locked" : "Student unlocked");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update placement lock");
    } finally {
      setTogglingUserId(null);
    }
  }

  if (placements === null || drives === null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  // "Hiring" means currently OPEN, not "has ever placed a student" — a
  // company can be actively hiring with zero placements so far.
  const companiesHiring = new Set(
    drives.filter((d) => d.status === "OPEN").map((d) => d.companyId)
  ).size;

  const filteredPlacements = placements.filter(
    (p) => offerFilter === "ALL" || p.driveRole?.offerType === offerFilter
  );
  const searched = filteredPlacements.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.user.name.toLowerCase().includes(q) ||
      p.user.email.toLowerCase().includes(q) ||
      p.company.name.toLowerCase().includes(q)
    );
  });

  // CTC (annual) and stipend (monthly) are different units — averaging them
  // together produces a meaningless number, so each gets its own average
  // rather than one blended "package" figure.
  const avgCtc = average(
    placements
      .filter((p) => p.driveRole?.offerType === "JOB" && p.packageAmount != null)
      .map((p) => p.packageAmount!)
  );
  const avgStipend = average(
    placements
      .filter((p) => p.driveRole?.offerType === "INTERNSHIP" && p.packageAmount != null)
      .map((p) => p.packageAmount!)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent>
            <div className="text-xs font-semibold text-muted-foreground">Students placed</div>
            <div className="mt-1 font-heading text-2xl font-extrabold">
              {filteredPlacements.length}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-xs font-semibold text-muted-foreground">Companies hiring</div>
            <div className="mt-1 font-heading text-2xl font-extrabold">{companiesHiring}</div>
          </CardContent>
        </Card>
        {offerFilter === "INTERNSHIP" ? (
          <Card size="sm">
            <CardContent>
              <div className="text-xs font-semibold text-muted-foreground">Average stipend</div>
              <div className="mt-1 font-heading text-2xl font-extrabold">
                {avgStipend != null ? formatPackage(String(avgStipend)) : "—"}
              </div>
            </CardContent>
          </Card>
        ) : offerFilter === "JOB" ? (
          <Card size="sm">
            <CardContent>
              <div className="text-xs font-semibold text-muted-foreground">Average CTC</div>
              <div className="mt-1 font-heading text-2xl font-extrabold">
                {avgCtc != null ? formatPackage(String(avgCtc)) : "—"}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card size="sm">
            <CardContent>
              <div className="text-xs font-semibold text-muted-foreground">Avg CTC · Avg stipend</div>
              <div className="mt-1 flex items-baseline gap-1.5 font-heading text-lg font-extrabold">
                <span>{avgCtc != null ? formatPackage(String(avgCtc)) : "—"}</span>
                <span className="text-xs font-medium text-muted-foreground">·</span>
                <span>{avgStipend != null ? formatPackage(String(avgStipend)) : "—"}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {(["ALL", "JOB", "INTERNSHIP"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setOfferFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-bold ${
              offerFilter === f ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {f === "ALL" ? "All" : f === "JOB" ? "Jobs" : "Internships"}
          </button>
        ))}
      </div>

      {placements.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No placements in {selectedYear} yet — they show up here as soon as a student is marked
          Selected, or switch seasons above to see a previous year&apos;s.
        </p>
      ) : filteredPlacements.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No {offerFilter === "JOB" ? "job" : "internship"} placements yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search placements…" />
          {searched.map((p) => (
            <Card key={p.id} size="sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold">{p.user.name}</div>
                    {p.driveRole && (
                      <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                        {p.driveRole.offerType === "JOB" ? "Job" : "Internship"}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.user.email} · {p.company.name}
                    {p.drive ? ` — ${p.drive.title}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatPackage(p.packageAmount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.placedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={p.user.placementLocked ? "outline" : "default"}
                    disabled={togglingUserId === p.user.id}
                    onClick={() => handleToggleLock(p.user.id, !p.user.placementLocked)}
                  >
                    {p.user.placementLocked ? "Unlock" : "Lock"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
