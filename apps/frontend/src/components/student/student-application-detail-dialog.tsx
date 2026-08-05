"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { applicationStatusStyle } from "@/lib/status";
import { useUniversityTimezone } from "@/lib/use-university-timezone";
import { formatInZone } from "@/lib/timezone";
import { getApplicationForm, type ApplicationFormQuestion } from "@/lib/api/drives";
import type { Application } from "@/lib/api/applications";
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
}: {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { token } = useAuth();
  const timezone = useUniversityTimezone();
  const [questions, setQuestions] = useState<ApplicationFormQuestion[]>([]);

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

  if (!application) return null;
  const { style, label } = applicationStatusStyle(application.status);

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
          {application.rolePreferences.length > 0 && (
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
      </DialogContent>
    </Dialog>
  );
}
