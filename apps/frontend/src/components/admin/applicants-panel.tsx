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
import { useAcademicYear } from "@/lib/academic-year-context";
import {
  listApplicationsForDrive,
  updateApplicationStatus,
  bulkSetInterviewSchedule,
  type ApplicantEntry,
} from "@/lib/api/applications";
import { APPLICATION_STATUS_OPTIONS, applicationStatusStyle, type ApplicationStatus } from "@/lib/status";
import { useUniversityTimezone } from "@/lib/use-university-timezone";
import { isoToZonedDatetimeLocal, zonedDatetimeLocalToIso } from "@/lib/timezone";
import { SearchInput } from "@/components/ui/search-input";
import { ApplicantDetailDialog } from "./applicant-detail-dialog";
import { ExportApplicantsDialog } from "./export-applicants-dialog";

type SavePatch = {
  status: ApplicationStatus;
  interviewSlot?: string;
  interviewVenue?: string;
  selectedRoleId?: string;
};

// Interview slot/venue only apply once an applicant reaches these stages —
// the backend rejects them for any other status.
const SLOT_STATUSES: ApplicationStatus[] = ["OA_TEST", "INTERVIEW"];

function defaultSlot(timezone: string) {
  return isoToZonedDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), timezone);
}

export function ApplicantsPanel() {
  const { token } = useAuth();
  const { selectedYear } = useAcademicYear();
  const timezone = useUniversityTimezone();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState("");
  const [applicants, setApplicants] = useState<ApplicantEntry[] | null>(null);
  const [questions, setQuestions] = useState<ApplicationFormQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSlot, setBulkSlot] = useState("");
  const [bulkVenue, setBulkVenue] = useState("");
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus | "">("");
  const [bulkSelectedRoleId, setBulkSelectedRoleId] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const selectedDrive = drives.find((d) => d.id === selectedDriveId);

  useEffect(() => {
    if (!token) return;
    listDrives(token, selectedYear)
      .then(setDrives)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't load drives"));
  }, [token, selectedYear]);

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
      // Merge just this one row in place instead of refetching the whole
      // list. A full refetch briefly sets applicants to null (rendering the
      // Skeleton loading state for every row), which unmounts and remounts
      // every ApplicantRow — including ones the admin was still mid-edit on
      // elsewhere in the list, discarding their unsaved local state. Scoping
      // the update to just this applicant's id leaves every sibling row's
      // props/state completely untouched.
      setApplicants((prev) =>
        prev
          ? prev.map((a) => {
              if (a.id !== applicant.id) return a;
              const wasSelected = a.status === "SELECTED";
              const nowSelected = patch.status === "SELECTED";
              const selectedRole = patch.selectedRoleId
                ? (a.rolePreferences.find((p) => p.driveRole.id === patch.selectedRoleId)
                    ?.driveRole ?? a.selectedRole)
                : wasSelected && !nowSelected
                  ? null
                  : a.selectedRole;
              return {
                ...a,
                status: patch.status,
                interviewSlot: patch.interviewSlot ?? a.interviewSlot,
                interviewVenue: patch.interviewVenue ?? a.interviewVenue,
                selectedRole,
              };
            })
          : prev
      );
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

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }

  // Slot/venue fields make sense either when the status is being changed to
  // OA/Test or Interview, or when status is left untouched (a plain
  // reschedule for applicants already at that stage) — the backend enforces
  // the latter case by checking each selected applicant's current status.
  const bulkSlotAllowed = bulkStatus === "" || SLOT_STATUSES.includes(bulkStatus);
  const bulkSlotRequired = bulkStatus !== "" && SLOT_STATUSES.includes(bulkStatus);
  // A shared role is only meaningful — and only required — when the drive
  // actually has roles defined; a roleless drive can bulk-select freely.
  const bulkRoleRequired = bulkStatus === "SELECTED" && (selectedDrive?.roles.length ?? 0) > 0;

  async function handleBulkSchedule() {
    if (!token || !selectedDriveId) return;
    if (!bulkSlot && !bulkVenue && !bulkStatus) {
      toast.error("Set an interview slot, venue, or status first");
      return;
    }
    if (bulkSlotRequired && !bulkSlot) {
      toast.error("An interview slot is required for OA/Test or Interview status");
      return;
    }
    if (bulkSlotRequired && !bulkVenue.trim()) {
      toast.error("An interview venue is required for OA/Test or Interview status");
      return;
    }
    if (bulkRoleRequired && !bulkSelectedRoleId) {
      toast.error("Pick the role every selected applicant is being placed into");
      return;
    }
    setBulkSubmitting(true);
    try {
      await bulkSetInterviewSchedule(
        selectedDriveId,
        {
          applicationIds: [...selectedIds],
          interviewSlot: bulkSlotAllowed && bulkSlot ? zonedDatetimeLocalToIso(bulkSlot, timezone) : undefined,
          interviewVenue: bulkSlotAllowed && bulkVenue.trim() ? bulkVenue.trim() : undefined,
          status: bulkStatus || undefined,
          selectedRoleId: bulkStatus === "SELECTED" && bulkSelectedRoleId ? bulkSelectedRoleId : undefined,
        },
        token
      );
      toast.success(`Updated ${selectedIds.size} applicant(s)`);
      setBulkSlot("");
      setBulkVenue("");
      setBulkStatus("");
      setBulkSelectedRoleId("");
      loadApplicants(selectedDriveId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't apply bulk update");
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
            <SelectValue placeholder="Select a drive">
              {(value: string) => {
                const d = drives.find((drive) => drive.id === value);
                return d ? `${d.title} — ${d.company.name}` : null;
              }}
            </SelectValue>
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

      {selectedDrive && applicants && applicants.length > 0 && (
        <div className="flex items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search applicants…" />
          <ExportApplicantsDialog
            driveId={selectedDrive.id}
            driveTitle={selectedDrive.title}
            companyName={selectedDrive.company.name}
            questions={questions}
            hasRoles={selectedDrive.roles.length > 0}
          />
        </div>
      )}

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
        (() => {
          const filtered = applicants.filter((a) => {
            const q = query.toLowerCase();
            return (
              a.studentProfile.user.name.toLowerCase().includes(q) ||
              a.studentProfile.user.email.toLowerCase().includes(q)
            );
          });
          const filteredIds = filtered.map((a) => a.id);

          return (
            <>
              {selectedIds.size > 0 && (
                <Card size="sm" className="border-primary/40 bg-primary/5">
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-primary">
                      {selectedIds.size} selected — bulk update
                    </span>
                    <Select
                      value={bulkStatus}
                      onValueChange={(v) => {
                        const next = (v ?? "") as ApplicationStatus | "";
                        setBulkStatus(next);
                        if (next !== "" && SLOT_STATUSES.includes(next) && !bulkSlot) {
                          setBulkSlot(defaultSlot(timezone));
                        }
                        if (next !== "SELECTED") setBulkSelectedRoleId("");
                      }}
                    >
                      <SelectTrigger size="sm" className="w-[140px] text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLICATION_STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {applicationStatusStyle(s).label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bulkSlotAllowed && (
                      <>
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
                      </>
                    )}
                    {bulkRoleRequired && (
                      <Select
                        value={bulkSelectedRoleId}
                        onValueChange={(v) => setBulkSelectedRoleId(v ?? "")}
                      >
                        <SelectTrigger size="sm" className="w-[160px] text-xs">
                          <SelectValue placeholder="Pick role">
                            {(value: string) =>
                              selectedDrive?.roles.find((r) => r.id === value)?.title
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDrive?.roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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

              {filtered.length === 0 ? (
                <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                  No applicants match &quot;{query}&quot;.
                </p>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id))}
                      onChange={() => toggleSelectAll(filteredIds)}
                      className="size-4 rounded border-input"
                    />
                    Select all ({filtered.length})
                  </label>

                  <div className="flex flex-col gap-3">
                    {filtered.map((applicant) => (
                      <ApplicantRow
                        key={applicant.id}
                        applicant={applicant}
                        questions={questions}
                        timezone={timezone}
                        onSave={handleUpdate}
                        selected={selectedIds.has(applicant.id)}
                        onToggleSelect={() => toggleSelected(applicant.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}

function ApplicantRow({
  applicant,
  questions,
  timezone,
  onSave,
  selected,
  onToggleSelect,
}: {
  applicant: ApplicantEntry;
  questions: ApplicationFormQuestion[];
  timezone: string;
  onSave: (applicant: ApplicantEntry, patch: SavePatch) => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(applicant.status);
  const [interviewSlot, setInterviewSlot] = useState(
    applicant.interviewSlot ? isoToZonedDatetimeLocal(applicant.interviewSlot, timezone) : ""
  );
  const [interviewVenue, setInterviewVenue] = useState(applicant.interviewVenue ?? "");
  const [selectedRoleId, setSelectedRoleId] = useState(applicant.selectedRole?.id ?? "");
  const [slotTouched, setSlotTouched] = useState(false);

  // useUniversityTimezone() starts on a fallback default and resolves the
  // real value async — if that resolution lands after this row already
  // mounted, the initial conversion above used the (possibly wrong)
  // fallback. Resync once the real value arrives, as long as the admin
  // hasn't hand-edited the field yet.
  useEffect(() => {
    if (slotTouched) return;
    setInterviewSlot(applicant.interviewSlot ? isoToZonedDatetimeLocal(applicant.interviewSlot, timezone) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  const slotEditable = SLOT_STATUSES.includes(status);

  const dirty =
    status !== applicant.status ||
    (slotEditable &&
      (interviewVenue !== (applicant.interviewVenue ?? "") ||
        interviewSlot !==
          (applicant.interviewSlot ? isoToZonedDatetimeLocal(applicant.interviewSlot, timezone) : "")));

  const requiresRole = status === "SELECTED" && applicant.rolePreferences.length > 0;
  const canSave =
    dirty &&
    (!requiresRole || !!selectedRoleId) &&
    (!slotEditable || (!!interviewSlot && !!interviewVenue.trim()));

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
          {applicant.rolePreferences.length > 0 && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              Prefers:{" "}
              {applicant.rolePreferences
                .map((p) => `${p.rank}. ${p.driveRole.title}`)
                .join(", ")}
            </div>
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
          <Select
            value={selectedRoleId}
            onValueChange={(value) => value && setSelectedRoleId(value)}
          >
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
              interviewVenue: slotEditable && interviewVenue.trim() ? interviewVenue.trim() : undefined,
              selectedRoleId: requiresRole ? selectedRoleId : undefined,
            })
          }
        >
          Save
        </Button>

        <ApplicantDetailDialog applicant={applicant} questions={questions} />
      </CardContent>
    </Card>
  );
}
