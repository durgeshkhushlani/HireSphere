"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { SearchInput } from "@/components/ui/search-input";

const STATUS_OPTIONS: DriveStatus[] = ["DRAFT", "OPEN", "CLOSED"];

export function DriveManager() {
  const { token } = useAuth();
  const [drives, setDrives] = useState<Drive[] | null>(null);
  const [query, setQuery] = useState("");
  const [pendingChange, setPendingChange] = useState<{ drive: Drive; status: DriveStatus } | null>(
    null
  );
  const [confirming, setConfirming] = useState(false);

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

  async function handleConfirmStatusChange() {
    if (!token || !pendingChange) return;
    const { drive, status } = pendingChange;
    setConfirming(true);
    try {
      await updateDriveStatus(drive.id, status, token);
      toast.success(`${drive.title} is now ${status.toLowerCase()}`);
      setPendingChange(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update status");
    } finally {
      setConfirming(false);
    }
  }

  const filtered = (drives ?? []).filter(
    (d) =>
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.company.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search drives or companies…" />
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
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No drives match &quot;{query}&quot;.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((drive) => {
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
                  <div className="text-xs text-muted-foreground">
                    {drive.roles.length === 0
                      ? "No roles added yet"
                      : `${drive.roles.length} role${drive.roles.length === 1 ? "" : "s"}`}
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Select
                      value={drive.status}
                      onValueChange={(value) =>
                        value &&
                        value !== drive.status &&
                        setPendingChange({ drive, status: value as DriveStatus })
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
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/admin/drives/${drive.id}/roles`} />}
                    >
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={pendingChange !== null} onOpenChange={(open) => !open && setPendingChange(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change drive status?</DialogTitle>
            <DialogDescription>
              {pendingChange && (
                <>
                  {pendingChange.drive.title} will move from{" "}
                  <strong>{pendingChange.drive.status}</strong> to{" "}
                  <strong>{pendingChange.status}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingChange(null)} disabled={confirming}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusChange} disabled={confirming}>
              {confirming ? "Updating…" : "Confirm change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
