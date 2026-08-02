"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { getApplicationForm, listDrives, type ApplicationFormQuestion, type Drive } from "@/lib/api/drives";
import {
  listApplicationsForDrive,
  updateApplicationStatus,
  bulkSetInterviewSchedule,
  type ApplicantEntry,
} from "@/lib/api/applications";
import { APPLICATION_STATUS_OPTIONS, applicationStatusStyle, type ApplicationStatus } from "@/lib/status";
import { ApplicantDetailDialog } from "./applicant-detail-dialog";

type SavePatch = { status: ApplicationStatus; interviewSlot?: string; interviewVenue?: string };

export function ApplicantsPanel() {
  const { token } = useAuth();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState("");
  const [applicants, setApplicants] = useState<ApplicantEntry[] | null>(null);
  const [questions, setQuestions] = useState<ApplicationFormQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSlot, setBulkSlot] = useState("");
  const [bulkVenue, setBulkVenue] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    listDrives(token)
      .then(setDrives)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't load drives"));
  }, [token]);

  const loadApplicants = useCallback(
    async (driveId: string) => {
      if (!token || !driveId) return;
      setApplicants(null);
      setSelectedIds(new Set());
      try {
        setApplicants(await listApplicationsForDrive(driveId, token));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Couldn't load applicants");
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedDriveId) loadApplicants(selectedDriveId);
  }, [selectedDriveId, loadApplicants]);

  useEffect(() => {
    if (!token || !selectedDriveId) {
      setQuestions([]);
      return;
    }
    getApplicationForm(selectedDriveId, token)
      .then((form) => setQuestions(form.questions))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setQuestions([]);
          return;
        }
        toast.error(err instanceof ApiError ? err.message : "Couldn't load the application form");
      });
  }, [selectedDriveId, token]);

  async function handleUpdate(applicant: ApplicantEntry, patch: SavePatch) {
    if (!token) return;
    try {
      await updateApplicationStatus(applicant.id, patch, token);
      toast.success(`Updated ${applicant.studentProfile.user.name}`);
      loadApplicants(selectedDriveId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update applicant");
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkSchedule() {
    if (!token || !selectedDriveId) return;
    if (!bulkSlot && !bulkVenue) {
      toast.error("Set an interview slot or venue first");
      return;
    }
    setBulkSubmitting(true);
    try {
      await bulkSetInterviewSchedule(
        selectedDriveId,
        {
          applicationIds: [...selectedIds],
          interviewSlot: bulkSlot ? new Date(bulkSlot).toISOString() : undefined,
          interviewVenue: bulkVenue || undefined,
        },
        token
      );
      toast.success(`Scheduled interviews for ${selectedIds.size} applicant(s)`);
      setBulkSlot("");
      setBulkVenue("");
      loadApplicants(selectedDriveId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't schedule interviews");
    } finally {
      setBulkSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-xs">
        <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Drive</Label>
        <Select value={selectedDriveId} onValueChange={(value) => setSelectedDriveId(value ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a drive" />
          </SelectTrigger>
          <SelectContent>
            {drives.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.title} — {d.company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedDriveId ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Pick a drive to review its applicants.
        </p>
      ) : applicants === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : applicants.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No applications yet for this drive.
        </p>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <Card size="sm" className="border-primary/40 bg-primary/5">
              <CardContent className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-primary">
                  {selectedIds.size} selected — bulk-schedule interview
                </span>
                <Input
                  type="datetime-local"
                  value={bulkSlot}
                  onChange={(e) => setBulkSlot(e.target.value)}
                  className="h-7 w-[190px] text-xs"
                />
                <Input
                  value={bulkVenue}
                  onChange={(e) => setBulkVenue(e.target.value)}
                  placeholder="Venue"
                  className="h-7 w-[140px] text-xs"
                />
                <Button size="sm" disabled={bulkSubmitting} onClick={handleBulkSchedule}>
                  {bulkSubmitting ? "Applying…" : "Apply to selected"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={bulkSubmitting}
                >
                  Clear
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3">
            {applicants.map((applicant) => (
              <ApplicantRow
                key={applicant.id}
                applicant={applicant}
                questions={questions}
                onSave={handleUpdate}
                onScheduled={() => loadApplicants(selectedDriveId)}
                selected={selectedIds.has(applicant.id)}
                onToggleSelect={() => toggleSelected(applicant.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ApplicantRow({
  applicant,
  questions,
  onSave,
  onScheduled,
  selected,
  onToggleSelect,
}: {
  applicant: ApplicantEntry;
  questions: ApplicationFormQuestion[];
  onSave: (applicant: ApplicantEntry, patch: SavePatch) => void;
  onScheduled: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(applicant.status);
  const [interviewSlot, setInterviewSlot] = useState(
    applicant.interviewSlot ? applicant.interviewSlot.slice(0, 16) : ""
  );
  const [interviewVenue, setInterviewVenue] = useState(applicant.interviewVenue ?? "");

  const dirty =
    status !== applicant.status ||
    interviewVenue !== (applicant.interviewVenue ?? "") ||
    interviewSlot !== (applicant.interviewSlot ? applicant.interviewSlot.slice(0, 16) : "");

  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="size-4 shrink-0 rounded border-input"
          aria-label={`Select ${applicant.studentProfile.user.name}`}
        />

        <div className="min-w-[160px] flex-1">
          <div className="text-sm font-bold">{applicant.studentProfile.user.name}</div>
          <div className="text-xs text-muted-foreground">
            {applicant.studentProfile.user.email} · {applicant.studentProfile.program.name}
          </div>
        </div>

        <Select
          value={status}
          onValueChange={(value) => value && setStatus(value as ApplicationStatus)}
        >
          <SelectTrigger size="sm" className="w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPLICATION_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {applicationStatusStyle(s).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="datetime-local"
          value={interviewSlot}
          onChange={(e) => setInterviewSlot(e.target.value)}
          className="h-7 w-[190px] text-xs"
        />
        <Input
          value={interviewVenue}
          onChange={(e) => setInterviewVenue(e.target.value)}
          placeholder="Venue"
          className="h-7 w-[140px] text-xs"
        />

        <Button
          size="sm"
          disabled={!dirty}
          onClick={() =>
            onSave(applicant, {
              status,
              interviewSlot: interviewSlot ? new Date(interviewSlot).toISOString() : undefined,
              interviewVenue: interviewVenue || undefined,
            })
          }
        >
          Save
        </Button>

        <ApplicantDetailDialog
          applicant={applicant}
          questions={questions}
          onScheduled={onScheduled}
        />
      </CardContent>
    </Card>
  );
}
