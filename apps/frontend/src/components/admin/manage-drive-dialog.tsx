"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { listUniversityPrograms, type Program } from "@/lib/api/universities";
import {
  getApplicationForm,
  getEligiblePrograms,
  setApplicationForm,
  setEligiblePrograms,
  type ApplicationFormQuestion,
  type Drive,
} from "@/lib/api/drives";

let questionSeq = 0;
function nextQuestionId() {
  questionSeq += 1;
  return `q${Date.now()}_${questionSeq}`;
}

export function ManageDriveDialog({ drive }: { drive: Drive }) {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<ApplicationFormQuestion[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [eligibleIds, setEligibleIds] = useState<Set<string>>(new Set());

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen || !token || !user) return;
    setLoading(true);
    try {
      let formQuestions: ApplicationFormQuestion[] = [];
      try {
        const form = await getApplicationForm(drive.id, token);
        formQuestions = form.questions;
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
      const [eligible, allPrograms] = await Promise.all([
        getEligiblePrograms(drive.id, token),
        listUniversityPrograms(user.universityId),
      ]);
      setQuestions(formQuestions);
      setEligibleIds(new Set(eligible.map((p) => p.id)));
      setPrograms(allPrograms);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load drive settings");
    } finally {
      setLoading(false);
    }
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { id: nextQuestionId(), label: "", type: "text" }]);
  }

  function updateQuestionLabel(id: string, label: string) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, label } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function toggleProgram(id: string) {
    setEligibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!token) return;
    const blank = questions.find((q) => !q.label.trim());
    if (blank) {
      toast.error("Every question needs a label");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        setApplicationForm(drive.id, questions, token),
        setEligiblePrograms(drive.id, [...eligibleIds], token),
      ]);
      toast.success("Drive settings saved");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save drive settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Manage</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage {drive.title}</DialogTitle>
          <DialogDescription>Application questions and program eligibility.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

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
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
