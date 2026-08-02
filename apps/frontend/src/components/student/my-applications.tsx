"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { applicationStatusStyle } from "@/lib/status";
import type { Application } from "@/lib/api/applications";

export function MyApplications({ applications }: { applications: Application[] | null }) {
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

  return (
    <div className="flex flex-col gap-3">
      {applications.map((app) => {
        const { style, label } = applicationStatusStyle(app.status);
        return (
          <Card key={app.id} size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{app.drive.title}</div>
                <div className="text-xs text-muted-foreground">{app.drive.company.name}</div>
              </div>
              <div className="flex items-center gap-4">
                {app.interviewSlot && (
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">
                      {new Date(app.interviewSlot).toLocaleString()}
                    </div>
                    {app.interviewVenue && <div>{app.interviewVenue}</div>}
                  </div>
                )}
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={style}>
                  {label}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
