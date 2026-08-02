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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { listCompanies, createCompany, type Company } from "@/lib/api/companies";
import { createDrive } from "@/lib/api/drives";

const NEW_COMPANY = "__new__";

export function CreateDriveDialog({ onCreated }: { onCreated: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [maxBacklogs, setMaxBacklogs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCompanyId("");
    setNewCompanyName("");
    setTitle("");
    setDescription("");
    setMinCgpa("");
    setMaxBacklogs("");
  }

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen || !token) return;
    try {
      setCompanies(await listCompanies(token));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load companies");
    }
  }

  async function resolveCompanyId(): Promise<string | null> {
    if (companyId === NEW_COMPANY) {
      if (!newCompanyName.trim()) {
        toast.error("Enter the new company's name");
        return null;
      }
      const company = await createCompany({ name: newCompanyName.trim() }, token!);
      return company.id;
    }
    if (!companyId) {
      toast.error("Select a company");
      return null;
    }
    return companyId;
  }

  async function handleSubmit() {
    if (!token) return;
    if (!title.trim()) {
      toast.error("Enter a drive title");
      return;
    }
    setSubmitting(true);
    try {
      const resolvedCompanyId = await resolveCompanyId();
      if (!resolvedCompanyId) return;
      await createDrive(
        {
          companyId: resolvedCompanyId,
          title: title.trim(),
          description: description.trim() || undefined,
          minCgpa: minCgpa ? Number(minCgpa) : undefined,
          maxBacklogs: maxBacklogs ? Number(maxBacklogs) : undefined,
        },
        token
      );
      toast.success(`${title} created`);
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create drive");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>New Drive</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a drive</DialogTitle>
          <DialogDescription>
            Starts in Draft — open it once you&apos;re ready for applications.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Company</Label>
            <Select value={companyId} onValueChange={(value) => setCompanyId(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_COMPANY}>+ Add a new company</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {companyId === NEW_COMPANY && (
            <div>
              <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                New company name
              </Label>
              <Input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="TechNova Systems"
              />
            </div>
          )}

          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Drive title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Software Engineer"
            />
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
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create drive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
