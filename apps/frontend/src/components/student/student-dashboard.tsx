"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { listDrives, type Drive } from "@/lib/api/drives";
import { listMyApplications, type Application } from "@/lib/api/applications";
import { listMyPlacements, type MyPlacement } from "@/lib/api/placements";
import { DriveBrowser } from "./drive-browser";
import { MyApplications } from "./my-applications";
import { PlacementBanner } from "./placement-banner";

const TAB_TRIGGER_CLASS =
  "rounded-full border border-border bg-card px-4 shadow-sm data-active:border-transparent data-active:bg-foreground data-active:text-background data-active:hover:text-background dark:data-active:bg-foreground dark:data-active:text-background dark:data-active:hover:text-background";

export function StudentDashboard() {
  const { token } = useAuth();
  const [drives, setDrives] = useState<Drive[] | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [placements, setPlacements] = useState<MyPlacement[]>([]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [driveList, applicationList, placementList] = await Promise.all([
        listDrives(token),
        listMyApplications(token),
        listMyPlacements(token),
      ]);
      setDrives(driveList);
      setApplications(applicationList);
      setPlacements(placementList);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load your dashboard");
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const appliedDriveIds = new Set((applications ?? []).map((a) => a.driveId));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
      {placements.length > 0 && <PlacementBanner placement={placements[0]} />}

      <h1 className="font-heading text-2xl font-extrabold">Drives</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse open drives at your university and track every application you submit.
      </p>

      <Tabs defaultValue="drives" className="mt-6">
        <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <TabsList className="w-max gap-2 bg-transparent p-0">
            <TabsTrigger value="drives" className={TAB_TRIGGER_CLASS}>Browse Drives</TabsTrigger>
            <TabsTrigger value="applications" className={TAB_TRIGGER_CLASS}>
              My Applications{applications ? ` (${applications.length})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="drives" className="mt-6">
          <DriveBrowser drives={drives} appliedDriveIds={appliedDriveIds} onApplied={refresh} />
        </TabsContent>
        <TabsContent value="applications" className="mt-6">
          <MyApplications applications={applications} onChanged={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
