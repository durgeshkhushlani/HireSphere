"use client";

import { useState } from "react";
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
import { type ApplicantEntry } from "@/lib/api/applications";
import type { ApplicationFormQuestion } from "@/lib/api/drives";
import { normalizeUrl } from "@/lib/url";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function ApplicantDetailDialog({
  applicant,
  questions,
}: {
  applicant: ApplicantEntry;
  questions: ApplicationFormQuestion[];
}) {
  const [open, setOpen] = useState(false);

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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Student ID" value={applicant.studentProfile.studentId} />
            <Field label="CGPA" value={applicant.studentProfile.cgpa} />
            <Field label="Email" value={applicant.studentProfile.user.email} />
            <Field label="Program" value={applicant.studentProfile.program.name} />
          </div>

          {applicant.rolePreferences.length > 0 && (
            <div>
              <Label className="mb-2 text-xs font-semibold text-muted-foreground">
                Ranked role preferences
              </Label>
              <ul className="list-inside list-decimal text-sm">
                {applicant.rolePreferences.map((p) => (
                  <li key={p.driveRole.id}>{p.driveRole.title}</li>
                ))}
              </ul>
            </div>
          )}

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
              <a
                href={normalizeUrl(applicant.resumeUrl)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary underline underline-offset-2"
              >
                View resume ↗
              </a>
            )}
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
