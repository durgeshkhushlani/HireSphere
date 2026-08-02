"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { scheduleResumeDelivery, type ApplicantEntry } from "@/lib/api/applications";
import type { ApplicationFormQuestion } from "@/lib/api/drives";

export function ApplicantDetailDialog({
  applicant,
  questions,
  onScheduled,
}: {
  applicant: ApplicantEntry;
  questions: ApplicationFormQuestion[];
  onScheduled: () => void;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [dispatchAt, setDispatchAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSchedule() {
    if (!token || !dispatchAt) {
      toast.error("Pick a date and time");
      return;
    }
    setSubmitting(true);
    try {
      await scheduleResumeDelivery(applicant.id, new Date(dispatchAt).toISOString(), token);
      toast.success("Resume delivery scheduled");
      setDispatchAt("");
      onScheduled();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't schedule resume delivery");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Details</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{applicant.studentProfile.user.name}</DialogTitle>
          <DialogDescription>
            {applicant.studentProfile.user.email} · {applicant.studentProfile.program.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto">
          <div>
            <Label className="mb-2 text-xs font-semibold text-muted-foreground">
              Application responses
            </Label>
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground">This drive has no custom questions.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {questions.map((q) => (
                  <div key={q.id}>
                    <div className="text-xs font-semibold text-muted-foreground">{q.label}</div>
                    <div className="text-sm">{applicant.responses[q.id] || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 text-xs font-semibold text-muted-foreground">Resume</Label>
            {!applicant.resumeUrl ? (
              <p className="text-xs text-muted-foreground">No resume submitted.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <a
                  href={applicant.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary underline underline-offset-2"
                >
                  View resume ↗
                </a>

                {applicant.resumeSentAt ? (
                  <p className="text-xs text-muted-foreground">
                    Sent to the company on {new Date(applicant.resumeSentAt).toLocaleString()}
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        value={dispatchAt}
                        onChange={(e) => setDispatchAt(e.target.value)}
                        className="h-8 flex-1 text-sm"
                      />
                      <Button size="sm" onClick={handleSchedule} disabled={submitting}>
                        {submitting ? "Scheduling…" : "Schedule"}
                      </Button>
                    </div>
                    {applicant.resumeDispatchAt && (
                      <p className="text-xs text-muted-foreground">
                        Currently scheduled for{" "}
                        {new Date(applicant.resumeDispatchAt).toLocaleString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
