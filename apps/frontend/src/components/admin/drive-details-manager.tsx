"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { getMe } from "@/lib/api/auth";
import { listUniversityPrograms, type Program } from "@/lib/api/universities";
import {
  getDrive,
  getApplicationForm,
  getEligiblePrograms,
  updateDriveDetails,
  setApplicationForm,
  setEligiblePrograms,
  setDriveRoles,
  declareDriveResults,
  setDriveAutoClose,
  type Drive,
  type OfferType,
  type ApplicationFormQuestion,
} from "@/lib/api/drives";
import { CompanyPortalCard } from "./company-portal-card";
import { useUniversityTimezone } from "@/lib/use-university-timezone";
import { formatInZone, isoToZonedDatetimeLocal, zonedDatetimeLocalToIso } from "@/lib/timezone";

let seq = 0;
function nextKey() {
  seq += 1;
  return `k${Date.now()}_${seq}`;
}

type RoleDraft = {
  key: string;
  id?: string;
  title: string;
  offerType: OfferType;
  description: string;
  amount: string;
};

function emptyDraft(): RoleDraft {
  return { key: nextKey(), title: "", offerType: "JOB", description: "", amount: "" };
}

function formatAmount(amount: string | null, suffix: string) {
  if (amount == null) return null;
  return `₹${Number(amount).toLocaleString("en-IN")}${suffix}`;
}

export function DriveDetailsManager({ driveId }: { driveId: string }) {
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const timezone = useUniversityTimezone();

  const [drive, setDrive] = useState<Drive | null>(null);
  const [universityDomain, setUniversityDomain] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);
  const [autoCloseInput, setAutoCloseInput] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [maxBacklogs, setMaxBacklogs] = useState("");
  const [eligibleIds, setEligibleIds] = useState<Set<string>>(new Set());
  const [questions, setQuestions] = useState<ApplicationFormQuestion[]>([]);
  const [drafts, setDrafts] = useState<RoleDraft[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth?mode=login&role=admin");
    } else if (user.role !== "ADMIN") {
      router.replace("/student");
    }
  }, [authLoading, user, router]);

  async function load() {
    if (!token || !user) return;
    setLoading(true);
    try {
      let formQuestions: ApplicationFormQuestion[] = [];
      try {
        const form = await getApplicationForm(driveId, token);
        formQuestions = form.questions;
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
      const [d, eligible, allPrograms, me] = await Promise.all([
        getDrive(driveId, token),
        getEligiblePrograms(driveId, token),
        listUniversityPrograms(user.universityId),
        getMe(token),
      ]);
      setDrive(d);
      setUniversityDomain(me.university.domain);
      setAutoCloseEnabled(d.autoCloseAt != null);
      setAutoCloseInput(d.autoCloseAt ? isoToZonedDatetimeLocal(d.autoCloseAt, timezone) : "");
      setTitle(d.title);
      setDescription(d.description ?? "");
      setMinCgpa(d.minCgpa ?? "");
      setMaxBacklogs(d.maxBacklogs != null ? String(d.maxBacklogs) : "");
      setEligibleIds(new Set(eligible.map((p) => p.id)));
      setPrograms(allPrograms);
      setQuestions(formQuestions);
      setDrafts(
        d.roles.length > 0
          ? d.roles.map((r) => ({
              key: r.id,
              id: r.id,
              title: r.title,
              offerType: r.offerType,
              description: r.description,
              amount: (r.offerType === "JOB" ? r.ctcAmount : r.stipendAmount) ?? "",
            }))
          : [emptyDraft()]
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load the drive");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user || user.role !== "ADMIN" || !token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driveId, token, authLoading, user]);

  function toggleProgram(id: string) {
    setEligibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateDraft(key: string, patch: Partial<RoleDraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, emptyDraft()]);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { id: nextKey(), label: "", type: "text" }]);
  }

  function updateQuestionLabel(id: string, label: string) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, label } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function handleSave() {
    if (!token) return;
    if (!title.trim()) {
      toast.error("Enter a drive title");
      return;
    }
    const blankQuestion = questions.find((q) => !q.label.trim());
    if (blankQuestion) {
      toast.error("Every application question needs a label");
      return;
    }
    for (const d of drafts) {
      if (!d.title.trim() || !d.description.trim() || !d.amount.trim()) {
        toast.error("Fill in every field for each role");
        return;
      }
      if (Number.isNaN(Number(d.amount))) {
        toast.error(`Enter a valid number for ${d.title || "a role"}'s amount`);
        return;
      }
    }

    setSaving(true);
    try {
      await Promise.all([
        updateDriveDetails(
          driveId,
          {
            title: title.trim(),
            description: description.trim(),
            minCgpa: minCgpa ? Number(minCgpa) : null,
            maxBacklogs: maxBacklogs ? Number(maxBacklogs) : null,
          },
          token
        ),
        setEligiblePrograms(driveId, [...eligibleIds], token),
        setApplicationForm(driveId, questions, token),
        setDriveRoles(
          driveId,
          drafts.map((d) => ({
            id: d.id,
            title: d.title.trim(),
            offerType: d.offerType,
            description: d.description.trim(),
            ...(d.offerType === "JOB" ? { ctcAmount: Number(d.amount) } : { stipendAmount: Number(d.amount) }),
          })),
          token
        ),
      ]);
      toast.success("Drive details saved");
      setEditing(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save drive details");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeclareResults() {
    if (!token) return;
    setDeclaring(true);
    try {
      await declareDriveResults(driveId, token);
      toast.success("Results declared — visible to every student now");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't declare results");
    } finally {
      setDeclaring(false);
    }
  }

  async function handleSaveSchedule() {
    if (!token) return;
    if (autoCloseEnabled && !autoCloseInput) {
      toast.error("Pick a date and time for auto-close, or turn the toggle off");
      return;
    }
    setSavingSchedule(true);
    try {
      await setDriveAutoClose(
        driveId,
        autoCloseEnabled ? zonedDatetimeLocalToIso(autoCloseInput, timezone) : null,
        token
      );
      toast.success(autoCloseEnabled ? "Auto-close scheduled" : "Auto-close disabled");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update the schedule");
    } finally {
      setSavingSchedule(false);
    }
  }

  if (authLoading || !user || user.role !== "ADMIN") return null;

  const eligiblePrograms = programs.filter((p) => eligibleIds.has(p.id));

  return (
    <DashboardShell roleLabel="Admin">
      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Drives
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">
              {drive ? drive.title : "Drive details"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {drive ? `${drive.company.name} — ` : ""}Company, eligibility, application questions,
              and roles, all in one place.
            </p>
          </div>
          {!loading && !editing && (
            <Button onClick={() => setEditing(true)} className="shrink-0">
              Edit
            </Button>
          )}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : editing ? (
          <div className="mt-6 flex flex-col gap-6">
            <Card>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                    Drive name
                  </Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                    Description
                  </Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Min CGPA
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.01}
                      value={minCgpa}
                      onChange={(e) => setMinCgpa(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Max backlogs
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={maxBacklogs}
                      onChange={(e) => setMaxBacklogs(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label className="mb-2 text-xs font-semibold text-muted-foreground">
                Eligible programs
              </Label>
              {programs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Your university hasn&apos;t added any programs yet.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="mb-1 text-xs text-muted-foreground">
                    Leave all unchecked to open this drive to every program.
                  </p>
                  {programs.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={eligibleIds.has(p.id)}
                        onChange={() => toggleProgram(p.id)}
                        className="size-4 rounded border-input"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Application questions
                </Label>
                <Button type="button" variant="ghost" size="icon-sm" onClick={addQuestion}>
                  <Plus />
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {questions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No custom questions — applicants will only submit a resume link.
                  </p>
                )}
                {questions.map((q) => (
                  <div key={q.id} className="flex items-center gap-2">
                    <Input
                      value={q.label}
                      onChange={(e) => updateQuestionLabel(q.id, e.target.value)}
                      placeholder="Question"
                    />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeQuestion(q.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 text-xs font-semibold text-muted-foreground">Roles</Label>
              <div className="flex flex-col gap-4">
                {drafts.map((d) => (
                  <Card key={d.key}>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                            Role title
                          </Label>
                          <Input
                            value={d.title}
                            onChange={(e) => updateDraft(d.key, { title: e.target.value })}
                            placeholder="Software Engineer"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="mt-5"
                          onClick={() => removeDraft(d.key)}
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <div>
                        <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                          Offer type
                        </Label>
                        <div className="flex gap-2 rounded-lg bg-muted p-1">
                          <button
                            type="button"
                            onClick={() => updateDraft(d.key, { offerType: "JOB" })}
                            className={`flex-1 rounded-md py-1.5 text-sm font-bold ${
                              d.offerType === "JOB" ? "bg-card shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            Job
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDraft(d.key, { offerType: "INTERNSHIP" })}
                            className={`flex-1 rounded-md py-1.5 text-sm font-bold ${
                              d.offerType === "INTERNSHIP" ? "bg-card shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            Internship
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                          Job description
                        </Label>
                        <Textarea
                          value={d.description}
                          onChange={(e) => updateDraft(d.key, { description: e.target.value })}
                          placeholder="What this role involves…"
                        />
                      </div>

                      <div>
                        <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                          {d.offerType === "JOB" ? "CTC (per annum)" : "Stipend (per month)"}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={d.amount}
                          onChange={(e) => updateDraft(d.key, { amount: e.target.value })}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder={d.offerType === "JOB" ? "1200000" : "25000"}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button type="button" variant="outline" onClick={addDraft} className="self-start">
                  <Plus /> Add another role
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  load();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
          drive && (
            <div className="mt-6 flex flex-col gap-6">
              <Card>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{drive.status}</Badge>
                  </div>
                  {drive.description && (
                    <p className="text-sm text-muted-foreground">{drive.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Min CGPA</div>
                      <div className="text-sm">{drive.minCgpa ?? "No restriction"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Max backlogs</div>
                      <div className="text-sm">{drive.maxBacklogs ?? "No restriction"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-3">
                  <div className="text-sm font-bold">Schedule</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Opened</div>
                      <div className="text-sm">
                        {drive.openedAt ? formatInZone(drive.openedAt, timezone) : "Not opened yet"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Auto-close</div>
                      <div className="text-sm">
                        {drive.autoCloseAt ? formatInZone(drive.autoCloseAt, timezone) : "Not scheduled"}
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoCloseEnabled}
                      onChange={(e) => setAutoCloseEnabled(e.target.checked)}
                      className="size-4 rounded border-input"
                    />
                    Auto-close this drive at a scheduled date and time
                  </label>
                  {autoCloseEnabled && (
                    <Input
                      type="datetime-local"
                      value={autoCloseInput}
                      onChange={(e) => setAutoCloseInput(e.target.value)}
                      className="w-[220px]"
                    />
                  )}
                  <Button
                    size="sm"
                    className="self-start"
                    disabled={savingSchedule}
                    onClick={handleSaveSchedule}
                  >
                    {savingSchedule ? "Saving…" : "Save schedule"}
                  </Button>
                </CardContent>
              </Card>

              <CompanyPortalCard
                driveId={drive.id}
                companyAccess={drive.companyAccess}
                defaultEmail={drive.company.contactEmail}
                universityDomain={universityDomain}
              />

              {drive.status === "CLOSED" && (
                <Card>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold">Results</div>
                      {drive.resultsDeclared && (
                        <Badge variant="outline">
                          Declared{" "}
                          {drive.resultsDeclaredAt
                            ? new Date(drive.resultsDeclaredAt).toLocaleDateString()
                            : ""}
                        </Badge>
                      )}
                    </div>
                    {!drive.resultsDeclared ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Not declared yet — students won&apos;t see who was selected until you
                          declare results.
                        </p>
                        <Button
                          size="sm"
                          className="self-start"
                          disabled={declaring}
                          onClick={handleDeclareResults}
                        >
                          {declaring ? "Declaring…" : "Declare results"}
                        </Button>
                      </>
                    ) : drive.results && drive.results.length > 0 ? (
                      <ul className="list-inside list-disc text-sm">
                        {drive.results.map((r, i) => (
                          <li key={i}>
                            {r.name}
                            {r.studentId ? ` (${r.studentId})` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No students were selected.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  Eligible programs
                </div>
                <p className="text-sm">
                  {eligiblePrograms.length === 0
                    ? "Open to every program"
                    : eligiblePrograms.map((p) => p.name).join(", ")}
                </p>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  Application questions
                </div>
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No custom questions — applicants only submit a resume link.
                  </p>
                ) : (
                  <ul className="list-inside list-disc text-sm">
                    {questions.map((q) => (
                      <li key={q.id}>{q.label}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Roles</div>
                {drive.roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No roles have been added yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {drive.roles.map((r) => (
                      <Card key={r.id} size="sm">
                        <CardContent>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-bold">{r.title}</div>
                            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                              {r.offerType === "JOB" ? "Job" : "Internship"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-primary">
                            {r.offerType === "JOB"
                              ? formatAmount(r.ctcAmount, " CTC")
                              : formatAmount(r.stipendAmount, "/mo stipend")}
                          </div>
                          <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
                            {r.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </DashboardShell>
  );
}
