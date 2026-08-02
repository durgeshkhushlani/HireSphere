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
import { listDrives, type Drive } from "@/lib/api/drives";
import {
  listApplicationsForDrive,
  updateApplicationStatus,
  type ApplicantEntry,
} from "@/lib/api/applications";
import { APPLICATION_STATUS_OPTIONS, applicationStatusStyle, type ApplicationStatus } from "@/lib/status";

type SavePatch = { status: ApplicationStatus; interviewSlot?: string; interviewVenue?: string };

export function ApplicantsPanel() {
  const { token } = useAuth();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState("");
  const [applicants, setApplicants] = useState<ApplicantEntry[] | null>(null);

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
        <div className="flex flex-col gap-3">
          {applicants.map((applicant) => (
            <ApplicantRow key={applicant.id} applicant={applicant} onSave={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicantRow({
  applicant,
  onSave,
}: {
  applicant: ApplicantEntry;
  onSave: (applicant: ApplicantEntry, patch: SavePatch) => void;
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
      </CardContent>
    </Card>
  );
}
