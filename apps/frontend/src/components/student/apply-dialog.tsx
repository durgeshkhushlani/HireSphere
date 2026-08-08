"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import {
  applyToDrive,
  getApplicationForm,
  type ApplicationFormQuestion,
  type Drive,
} from "@/lib/api/drives";
import { getMyProfile } from "@/lib/api/students";

export function ApplyDialog({
  drive,
  disabled,
  onApplied,
}: {
  drive: Drive;
  disabled: boolean;
  onApplied: () => void;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [questions, setQuestions] = useState<ApplicationFormQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [resumeOnFile, setResumeOnFile] = useState<string | null>(null);
  const [rolePreferences, setRolePreferences] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setResponses({});
      setRolePreferences([]);
      return;
    }
    if (!token) return;
    setLoadingForm(true);
    try {
      const [form, profile] = await Promise.all([
        getApplicationForm(drive.id, token).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return { questions: [] };
          throw err;
        }),
        getMyProfile(token),
      ]);
      setQuestions(form.questions);
      setResumeOnFile(profile.resumeUrl);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load the application form");
    } finally {
      setLoadingForm(false);
    }
  }

  function toggleRole(roleId: string) {
    setRolePreferences((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  async function handleSubmit() {
    if (!token) return;
    if (!resumeOnFile) {
      toast.error("Upload a resume to your profile before applying");
      return;
    }
    if (drive.roles.length > 0 && rolePreferences.length === 0) {
      toast.error("Pick at least one role, in order of preference");
      return;
    }
    const missing = questions.find((q) => !responses[q.id]?.trim());
    if (missing) {
      toast.error(`Please answer: ${missing.label}`);
      return;
    }
    setSubmitting(true);
    try {
      await applyToDrive(
        drive.id,
        {
          responses,
          rolePreferences: drive.roles.length > 0 ? rolePreferences : undefined,
        },
        token
      );
      toast.success(`Applied to ${drive.title} at ${drive.company.name}`);
      setOpen(false);
      setResponses({});
      setRolePreferences([]);
      onApplied();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't submit your application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" disabled={disabled} />}>
        {disabled ? "Not open" : "Apply"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to {drive.title}</DialogTitle>
          <DialogDescription>{drive.company.name}</DialogDescription>
        </DialogHeader>

        {loadingForm ? (
          <p className="text-sm text-muted-foreground">Loading application form…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {drive.roles.length > 0 && (
              <div>
                <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Roles — click in order of preference
                </Label>
                <div className="flex flex-col gap-1.5">
                  {drive.roles.map((role) => {
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
            )}
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
            {resumeOnFile ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5 shrink-0" />
                Your resume on file will be submitted automatically with this application.
              </p>
            ) : (
              <p className="text-xs text-destructive">
                You don&apos;t have a resume on file yet — upload one from your profile (top
                right) before applying.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || loadingForm || !resumeOnFile}>
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
