"use client";

import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { driveStatusStyle } from "@/lib/status";
import type { Drive } from "@/lib/api/drives";
import { ApplyDialog } from "./apply-dialog";

export function DriveBrowser({
  drives,
  appliedDriveIds,
  onApplied,
}: {
  drives: Drive[] | null;
  appliedDriveIds: Set<string>;
  onApplied: () => void;
}) {
  if (drives === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (drives.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No drives have been posted at your university yet — check back soon.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {drives.map((drive) => {
        const { style, label } = driveStatusStyle(drive.status);
        const applied = appliedDriveIds.has(drive.id);

        return (
          <Card key={drive.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{drive.title}</CardTitle>
                    <CardDescription>{drive.company.name}</CardDescription>
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                  style={style}
                >
                  {label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              {drive.description && (
                <p className="text-sm text-muted-foreground">{drive.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {drive.minCgpa != null && (
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    Min CGPA {drive.minCgpa}
                  </span>
                )}
                {drive.maxBacklogs != null && (
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    Max {drive.maxBacklogs} backlog(s)
                  </span>
                )}
              </div>
              <div className="mt-auto pt-2">
                {applied ? (
                  <span className="text-xs font-bold text-primary">Already applied</span>
                ) : (
                  <ApplyDialog
                    drive={drive}
                    disabled={drive.status !== "OPEN"}
                    onApplied={onApplied}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
