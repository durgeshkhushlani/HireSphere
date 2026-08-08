"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { applicationStatusStyle } from "@/lib/status";
import { useUniversityTimezone } from "@/lib/use-university-timezone";
import { formatInZone } from "@/lib/timezone";
import { SearchInput } from "@/components/ui/search-input";
import type { Application } from "@/lib/api/applications";
import { StudentApplicationDetailDialog } from "./student-application-detail-dialog";

export function MyApplications({
  applications,
  onChanged,
}: {
  applications: Application[] | null;
  onChanged: () => void;
}) {
  const timezone = useUniversityTimezone();
  const [query, setQuery] = useState("");
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  if (applications === null) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        You haven&apos;t applied to any drives yet.
      </p>
    );
  }

  const filtered = applications.filter(
    (app) =>
      app.drive.title.toLowerCase().includes(query.toLowerCase()) ||
      app.drive.company.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search your applications…" />

      {filtered.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No applications match &quot;{query}&quot;.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((app) => {
            const { style, label } = applicationStatusStyle(app.status);
            return (
              <Card key={app.id} size="sm">
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">{app.drive.title}</div>
                    <div className="text-xs text-muted-foreground">{app.drive.company.name}</div>
                    {app.rolePreferences.length > 0 && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {app.selectedRole
                          ? `Selected for: ${app.selectedRole.title}`
                          : `Preferences: ${app.rolePreferences
                              .map((p) => `${p.rank}. ${p.driveRole.title}`)
                              .join(", ")}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {(app.status === "OA_TEST" || app.status === "INTERVIEW") && app.interviewSlot && (
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground">
                          {formatInZone(app.interviewSlot, timezone)}
                        </div>
                        {app.interviewVenue && <div>{app.interviewVenue}</div>}
                      </div>
                    )}
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={style}>
                      {label}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setDetailApp(app)}>
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StudentApplicationDetailDialog
        application={detailApp}
        open={detailApp !== null}
        onOpenChange={(open) => !open && setDetailApp(null)}
        onChanged={onChanged}
      />
    </div>
  );
}
