"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { applicationStatusStyle } from "@/lib/status";
import { useUniversityTimezone } from "@/lib/use-university-timezone";
import { formatInZone } from "@/lib/timezone";
import { getApplicationForm, type ApplicationFormQuestion } from "@/lib/api/drives";
import { withdrawApplication, updateMyApplication, type Application } from "@/lib/api/applications";
import { normalizeUrl } from "@/lib/url";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function StudentApplicationDetailDialog({
  application,
  open,
  onOpenChange,
  onChanged,
}: {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const timezone = useUniversityTimezone();
  const [questions, setQuestions] = useState<ApplicationFormQuestion[]>([]);
  const [editing, setEditing] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [rolePreferences, setRolePreferences] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!open || !application || !token) return;
    getApplicationForm(application.driveId, token)
      .then((form) => setQuestions(form.questions))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setQuestions([]);
          return;
        }
        toast.error(err instanceof ApiError ? err.message : "Couldn't load the application form");
      });
  }, [open, application, token]);

  useEffect(() => {
    if (!open || !application) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the local edit draft to match whichever application was just opened
    setEditing(false);
    setConfirmingWithdraw(false);
    setResponses(application.responses);
    setRolePreferences(application.rolePreferences.map((p) => p.driveRole.id));
  }, [open, application]);

  if (!application) return null;
  const { style, label } = applicationStatusStyle(application.status);
  const editable = application.status === "APPLIED" && application.drive.status === "OPEN";

  function toggleRole(roleId: string) {
    setRolePreferences((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  async function handleSaveEdit() {
    if (!token || !application) return;
    const missing = questions.find((q) => !responses[q.id]?.trim());
    if (missing) {
      toast.error(`Please answer: ${missing.label}`);
      return;
    }
    if (application.drive.roles.length > 0 && rolePreferences.length === 0) {
      toast.error("Pick at least one role, in order of preference");
      return;
    }
    setSaving(true);
    try {
      await updateMyApplication(
        application.id,
        {
          responses,
          rolePreferences: application.drive.roles.length > 0 ? rolePreferences : undefined,
        },
        token
      );
      toast.success("Application updated");
      onOpenChange(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update your application");
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw() {
    if (!token || !application) return;
    setWithdrawing(true);
    try {
      await withdrawApplication(application.id, token);
      toast.success("Application withdrawn");
      onOpenChange(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't withdraw your application");
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{application.drive.title}</DialogTitle>
            <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={style}>
              {label}
            </span>
          </div>
          <DialogDescription>{application.drive.company.name}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
          {editing && application.drive.roles.length > 0 ? (
            <div>
              <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                Roles — click in order of preference
              </Label>
              <div className="flex flex-col gap-1.5">
                {application.drive.roles.map((role) => {
                  const rank = rolePreferences.indexOf(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        rank >= 0 ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <span className="font-semibold">{role.title}</span>
                      {rank >= 0 && (
                        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                          {rank + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            application.rolePreferences.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  Ranked role preferences
                </div>
                <ul className="list-inside list-decimal text-sm">
                  {application.rolePreferences.map((p) => (
                    <li key={p.driveRole.id}>{p.driveRole.title}</li>
                  ))}
                </ul>
              </div>
            )
          )}

          {application.selectedRole && (
            <div className="rounded-lg border p-3">
              <div className="text-xs font-semibold text-muted-foreground">Selected role</div>
              <div className="text-sm font-bold">{application.selectedRole.title}</div>
              <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                {application.selectedRole.description}
              </p>
            </div>
          )}

          {(application.status === "OA_TEST" || application.status === "INTERVIEW") && (
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Interview slot"
                value={application.interviewSlot ? formatInZone(application.interviewSlot, timezone) : null}
              />
              <Field label="Venue" value={application.interviewVenue} />
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-muted-foreground">Resume</div>
            {application.resumeUrl ? (
              <a
                href={normalizeUrl(application.resumeUrl)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary underline underline-offset-2"
              >
                View resume ↗
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No resume submitted.</p>
            )}
            {application.resumeSentAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sent to the company on {new Date(application.resumeSentAt).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              Application responses
            </div>
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                This drive had no custom questions — you only submitted a resume link.
              </p>
            ) : editing ? (
              <div className="flex flex-col gap-3">
                {questions.map((q) => (
                  <div key={q.id}>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      {q.label}
                    </Label>
                    <Textarea
                      value={responses[q.id] ?? ""}
                      onChange={(e) =>
                        setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {questions.map((q) => (
                  <div key={q.id}>
                    <div className="text-xs font-semibold text-muted-foreground">{q.label}</div>
                    <div className="text-sm">{application.responses[q.id] || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {editable && (
          <DialogFooter>
            {editing ? (
              <>
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : confirmingWithdraw ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmingWithdraw(false)}
                  disabled={withdrawing}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleWithdraw} disabled={withdrawing}>
                  {withdrawing ? "Withdrawing…" : "Confirm withdraw"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setConfirmingWithdraw(true)}>
                  Withdraw
                </Button>
                <Button onClick={() => setEditing(true)}>Edit application</Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
