"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUS_OPTIONS, applicationStatusStyle, type ApplicationStatus } from "@/lib/status";
import { isoToZonedDatetimeLocal, zonedDatetimeLocalToIso } from "@/lib/timezone";
import type { ApplicantEntry } from "@/lib/api/applications";

// Interview slot/venue only apply once an applicant reaches these stages —
// the backend rejects them for any other status. Mirrors applicants-panel.tsx.
const SLOT_STATUSES: ApplicationStatus[] = ["OA_TEST", "INTERVIEW"];

function defaultSlot(timezone: string) {
  return isoToZonedDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), timezone);
}

export type SavePatch = {
  status: ApplicationStatus;
  interviewSlot?: string;
  interviewVenue?: string;
  selectedRoleId?: string;
};

export function CompanyApplicantRow({
  applicant,
  timezone,
  onSave,
}: {
  applicant: ApplicantEntry;
  timezone: string;
  onSave: (applicant: ApplicantEntry, patch: SavePatch) => void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(applicant.status);
  const [interviewSlot, setInterviewSlot] = useState(
    applicant.interviewSlot ? isoToZonedDatetimeLocal(applicant.interviewSlot, timezone) : ""
  );
  const [interviewVenue, setInterviewVenue] = useState(applicant.interviewVenue ?? "");
  const [selectedRoleId, setSelectedRoleId] = useState(applicant.selectedRole?.id ?? "");
  const [slotTouched, setSlotTouched] = useState(false);

  useEffect(() => {
    if (slotTouched) return;
    setInterviewSlot(applicant.interviewSlot ? isoToZonedDatetimeLocal(applicant.interviewSlot, timezone) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  const slotEditable = SLOT_STATUSES.includes(status);
  const requiresRole = status === "SELECTED" && applicant.rolePreferences.length > 0;

  const dirty =
    status !== applicant.status ||
    (slotEditable &&
      (interviewVenue !== (applicant.interviewVenue ?? "") ||
        interviewSlot !==
          (applicant.interviewSlot ? isoToZonedDatetimeLocal(applicant.interviewSlot, timezone) : "")));
  const canSave = dirty && (!requiresRole || !!selectedRoleId) && (!slotEditable || !!interviewSlot);

  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center gap-3">
        <div className="min-w-[160px] flex-1">
          <div className="text-sm font-bold">{applicant.studentProfile.user.name}</div>
          <div className="text-xs text-muted-foreground">
            {applicant.studentProfile.user.email} · {applicant.studentProfile.program.name}
          </div>
          {applicant.rolePreferences.length > 0 && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              Prefers: {applicant.rolePreferences.map((p) => `${p.rank}. ${p.driveRole.title}`).join(", ")}
            </div>
          )}
          {applicant.resumeUrl && (
            <a
              href={applicant.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-block text-xs font-semibold text-primary underline underline-offset-2"
            >
              View resume ↗
            </a>
          )}
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            if (!value) return;
            const next = value as ApplicationStatus;
            setStatus(next);
            if (SLOT_STATUSES.includes(next) && !interviewSlot) {
              setSlotTouched(true);
              setInterviewSlot(defaultSlot(timezone));
            }
          }}
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

        {requiresRole && (
          <Select value={selectedRoleId} onValueChange={(value) => value && setSelectedRoleId(value)}>
            <SelectTrigger size="sm" className="w-[160px] text-xs">
              <SelectValue placeholder="Pick role">
                {(value: string) =>
                  applicant.rolePreferences.find((p) => p.driveRole.id === value)?.driveRole.title
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {applicant.rolePreferences.map((p) => (
                <SelectItem key={p.driveRole.id} value={p.driveRole.id}>
                  {p.driveRole.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {slotEditable && (
          <>
            <Input
              type="datetime-local"
              value={interviewSlot}
              onChange={(e) => {
                setSlotTouched(true);
                setInterviewSlot(e.target.value);
              }}
              className="h-7 w-[190px] text-xs"
            />
            <Input
              value={interviewVenue}
              onChange={(e) => setInterviewVenue(e.target.value)}
              placeholder="Venue"
              className="h-7 w-[140px] text-xs"
            />
          </>
        )}

        <Button
          size="sm"
          disabled={!canSave}
          onClick={() =>
            onSave(applicant, {
              status,
              interviewSlot: slotEditable && interviewSlot ? zonedDatetimeLocalToIso(interviewSlot, timezone) : undefined,
              interviewVenue: slotEditable && interviewVenue ? interviewVenue : undefined,
              selectedRoleId: requiresRole ? selectedRoleId : undefined,
            })
          }
        >
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
