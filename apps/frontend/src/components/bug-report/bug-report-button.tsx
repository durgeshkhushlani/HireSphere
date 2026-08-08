"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bug } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import {
  submitBugReport,
  BUG_REPORT_CATEGORY_OPTIONS,
  type BugReportCategory,
} from "@/lib/api/bug-reports";

const EMPTY = { name: "", email: "", description: "", category: "" as BugReportCategory | "" };

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setForm(EMPTY);
  }

  async function handleSubmit() {
    if (!form.email.trim()) {
      toast.error("Enter your email so we can follow up if needed");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Describe the bug");
      return;
    }
    if (!form.category) {
      toast.error("Select where you ran into this");
      return;
    }
    setSubmitting(true);
    try {
      await submitBugReport({
        name: form.name.trim() || undefined,
        email: form.email.trim(),
        description: form.description.trim(),
        category: form.category,
      });
      toast.success("Thanks — the report was sent");
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't send the report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            aria-label="Report a bug"
            className="fixed bottom-5 left-5 z-50 flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted"
          />
        }
      >
        <Bug className="size-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a bug</DialogTitle>
          <DialogDescription>
            Found something broken? Let us know what happened.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Name (optional)
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Email</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Where did this happen?
            </Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, category: (v as BugReportCategory) ?? "" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an area" />
              </SelectTrigger>
              <SelectContent>
                {BUG_REPORT_CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              What&apos;s the bug?
            </Label>
            <Textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What did you do, what did you expect, what happened instead?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
