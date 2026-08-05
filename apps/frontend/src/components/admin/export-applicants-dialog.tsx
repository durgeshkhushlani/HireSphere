"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { exportApplicantsForDrive } from "@/lib/api/applications";
import type { ApplicationFormQuestion } from "@/lib/api/drives";
import { APPLICATION_STATUS_OPTIONS, applicationStatusStyle, type ApplicationStatus } from "@/lib/status";

type ColumnDef = { key: string; label: string };

const FIXED_COLUMNS: ColumnDef[] = [
  { key: "studentName", label: "Student Name" },
  { key: "studentId", label: "Student ID" },
  { key: "program", label: "Program" },
  { key: "cgpa", label: "CGPA" },
  { key: "status", label: "Status" },
  { key: "resumeLink", label: "Resume Link" },
];

function buildColumns(questions: ApplicationFormQuestion[], hasRoles: boolean): ColumnDef[] {
  return [
    ...FIXED_COLUMNS,
    ...(hasRoles ? [{ key: "preferences", label: "Role Preferences" }] : []),
    ...questions.map((q) => ({ key: `question:${q.id}`, label: q.label })),
  ];
}

export function ExportApplicantsDialog({
  driveId,
  driveTitle,
  companyName,
  questions,
  hasRoles,
}: {
  driveId: string;
  driveTitle: string;
  companyName: string;
  questions: ApplicationFormQuestion[];
  hasRoles: boolean;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<Set<ApplicationStatus>>(
    () => new Set(APPLICATION_STATUS_OPTIONS)
  );
  const [excludedColumns, setExcludedColumns] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const columns = buildColumns(questions, hasRoles);
  const included = columns.filter((c) => !excludedColumns.has(c.key));
  const excluded = columns.filter((c) => excludedColumns.has(c.key));

  function handleOpenChange(next: boolean) {
    if (next) {
      setStatuses(new Set(APPLICATION_STATUS_OPTIONS));
      setExcludedColumns(new Set());
    }
    setOpen(next);
  }

  function toggleStatus(status: ApplicationStatus) {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function excludeColumn(key: string) {
    setExcludedColumns((prev) => new Set(prev).add(key));
  }

  function restoreColumn(key: string) {
    setExcludedColumns((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function handleExport() {
    if (!token) return;
    if (statuses.size === 0) {
      toast.error("Select at least one status");
      return;
    }
    if (included.length === 0) {
      toast.error("Select at least one column");
      return;
    }
    setSubmitting(true);
    try {
      const { blob, filename } = await exportApplicantsForDrive(
        driveId,
        { statuses: [...statuses], columns: included.map((c) => c.key) },
        token
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? `${companyName}-${driveTitle}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't export applicants");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Download /> Export
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export applicants</DialogTitle>
          <DialogDescription>{driveTitle}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
          <div>
            <Label className="mb-2 text-xs font-semibold text-muted-foreground">
              Statuses to include
            </Label>
            <div className="flex flex-wrap gap-3">
              {APPLICATION_STATUS_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={statuses.has(s)}
                    onChange={() => toggleStatus(s)}
                    className="size-4 rounded border-input"
                  />
                  {applicationStatusStyle(s).label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 text-xs font-semibold text-muted-foreground">
              Columns ({included.length} of {columns.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {included.map((c) => (
                <span
                  key={c.key}
                  className="flex items-center gap-1 rounded-full bg-accent/15 py-1 pr-1 pl-2.5 text-xs font-semibold text-accent"
                >
                  {c.label}
                  <button
                    type="button"
                    onClick={() => excludeColumn(c.key)}
                    aria-label={`Exclude ${c.label}`}
                    className="rounded-full p-0.5 hover:bg-accent/20"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            {excluded.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Excluded:</span>
                {excluded.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => restoreColumn(c.key)}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/70"
                  >
                    + {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={submitting}>
            {submitting ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
