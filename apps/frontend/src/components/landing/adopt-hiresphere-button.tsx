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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { submitAdoptionRequest } from "@/lib/api/adoption-requests";

const EMPTY = { name: "", email: "", universityName: "", message: "" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rendered twice (desktop nav + mobile menu) — each instance owns its own
// dialog/form state independently, which is fine since only one is ever
// visible at a time.
export function AdoptHireSphereButton({
  variant = "outline",
  className,
}: {
  variant?: "outline" | "ghost";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setForm(EMPTY);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Enter your name");
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      toast.error("Enter a valid email");
      return;
    }
    if (!form.universityName.trim()) {
      toast.error("Enter your university's name");
      return;
    }
    setSubmitting(true);
    try {
      await submitAdoptionRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        universityName: form.universityName.trim(),
        message: form.message.trim() || undefined,
      });
      toast.success("Thanks — we'll be in touch soon");
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't send your request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant={variant} className={className} />}>
        Adopt HireSphere
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adopt HireSphere for your university</DialogTitle>
          <DialogDescription>
            HireSphere is free to adopt right now. It currently runs on free-tier infrastructure,
            so for larger universities I may need to check in first to make sure it&apos;s a good fit
            before onboarding — either way, I&apos;ll personally follow up with you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Your name
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
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              University name
            </Label>
            <Input
              value={form.universityName}
              onChange={(e) => setForm((f) => ({ ...f, universityName: e.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Anything else? (optional)
            </Label>
            <Textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Roughly how many students, when you'd want to start, any questions…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
