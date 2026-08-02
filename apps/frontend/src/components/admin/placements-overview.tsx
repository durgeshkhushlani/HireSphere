"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { listPlacements, type Placement } from "@/lib/api/placements";

function formatPackage(amount: string | null) {
  if (amount == null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function PlacementsOverview() {
  const { token } = useAuth();
  const [placements, setPlacements] = useState<Placement[] | null>(null);

  useEffect(() => {
    if (!token) return;
    listPlacements(token)
      .then(setPlacements)
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Couldn't load placements")
      );
  }, [token]);

  if (placements === null) {
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

  const totalPlaced = placements.length;
  const uniqueCompanies = new Set(placements.map((p) => p.companyId)).size;
  const packages = placements
    .map((p) => (p.packageAmount != null ? Number(p.packageAmount) : null))
    .filter((n): n is number => n != null);
  const avgPackage =
    packages.length > 0 ? packages.reduce((sum, n) => sum + n, 0) / packages.length : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent>
            <div className="text-xs font-semibold text-muted-foreground">Students placed</div>
            <div className="mt-1 font-heading text-2xl font-extrabold">{totalPlaced}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-xs font-semibold text-muted-foreground">Companies hiring</div>
            <div className="mt-1 font-heading text-2xl font-extrabold">{uniqueCompanies}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <div className="text-xs font-semibold text-muted-foreground">Average package</div>
            <div className="mt-1 font-heading text-2xl font-extrabold">
              {avgPackage != null ? formatPackage(String(avgPackage)) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {placements.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No placements recorded yet — they show up here as soon as a student is marked
          Selected.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {placements.map((p) => (
            <Card key={p.id} size="sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{p.user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.user.email} · {p.company.name}
                    {p.drive ? ` — ${p.drive.title}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatPackage(p.packageAmount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.placedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
