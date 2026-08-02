"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { listDrives, updateDriveStatus, type Drive } from "@/lib/api/drives";
import { driveStatusStyle, type DriveStatus } from "@/lib/status";
import { CreateDriveDialog } from "./create-drive-dialog";
import { ManageDriveDialog } from "./manage-drive-dialog";

const STATUS_OPTIONS: DriveStatus[] = ["DRAFT", "OPEN", "CLOSED"];

export function DriveManager() {
  const { token } = useAuth();
  const [drives, setDrives] = useState<Drive[] | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setDrives(await listDrives(token));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load drives");
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleStatusChange(drive: Drive, status: DriveStatus) {
    if (!token || status === drive.status) return;
    try {
      await updateDriveStatus(drive.id, status, token);
      toast.success(`${drive.title} is now ${status.toLowerCase()}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update status");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateDriveDialog onCreated={refresh} />
      </div>

      {drives === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : drives.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No drives yet — create your first one to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {drives.map((drive) => {
            const { style, label } = driveStatusStyle(drive.status);
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
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Select
                      value={drive.status}
                      onValueChange={(value) =>
                        value && handleStatusChange(drive, value as DriveStatus)
                      }
                    >
                      <SelectTrigger size="sm" className="flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ManageDriveDialog drive={drive} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
