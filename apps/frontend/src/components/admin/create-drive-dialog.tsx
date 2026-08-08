"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
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
import { getMe } from "@/lib/api/auth";
import { listCompanies, createCompany, type Company } from "@/lib/api/companies";
import { listUniversityPrograms, type Program } from "@/lib/api/universities";
import { createDrive, setEligiblePrograms } from "@/lib/api/drives";

const NEW_COMPANY = "__new__";

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

export function CreateDriveDialog({ onCreated }: { onCreated: () => void }) {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [maxBacklogs, setMaxBacklogs] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [eligibleIds, setEligibleIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<{
    accessCode: string;
    password: string;
    universityDomain: string;
  } | null>(null);

  function reset() {
    setCompanyId("");
    setNewCompanyName("");
    setTitle("");
    setDescription("");
    setMinCgpa("");
    setMaxBacklogs("");
    setEligibleIds(new Set());
    setRevealed(null);
  }

  function toggleProgram(id: string) {
    setEligibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      return;
    }
    if (!token || !user) return;
    try {
      const [companyList, programList] = await Promise.all([
        listCompanies(token),
        listUniversityPrograms(user.universityId),
      ]);
      setCompanies(companyList);
      setPrograms(programList);
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
      const drive = await createDrive(
        {
          companyId: resolvedCompanyId,
          title: title.trim(),
          description: description.trim() || undefined,
          minCgpa: minCgpa ? Number(minCgpa) : undefined,
          maxBacklogs: maxBacklogs ? Number(maxBacklogs) : undefined,
        },
        token
      );
      if (eligibleIds.size > 0) {
        await setEligiblePrograms(drive.id, [...eligibleIds], token);
      }
      toast.success(`${title} created`);
      const me = await getMe(token);
      setRevealed({
        accessCode: drive.companyAccess.accessCode,
        password: drive.companyAccess.password,
        universityDomain: me.university.domain,
      });
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

        {revealed ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {title} is live. Here&apos;s the company&apos;s one-time portal password — copy it
              now, since it can&apos;t be shown again (only regenerated).
            </p>
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div>
                <Label className="mb-1 text-xs font-semibold text-muted-foreground">
                  Portal link
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
                    {window.location.origin}/{revealed.universityDomain}/{revealed.accessCode}
                  </code>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() =>
                      copy(
                        `${window.location.origin}/${revealed.universityDomain}/${revealed.accessCode}`,
                        "Portal link"
                      )
                    }
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="mb-1 text-xs font-semibold text-muted-foreground">
                  Password
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
                    {revealed.password}
                  </code>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => copy(revealed.password, "Password")}
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Already emailed to the company&apos;s contact address if one is on file. You can
              resend or regenerate it any time from the drive&apos;s Details page.
            </p>
          </div>
        ) : (
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto">
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Company</Label>
            <Select value={companyId} onValueChange={(value) => setCompanyId(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a company">
                  {(value: string) =>
                    value === NEW_COMPANY
                      ? "+ Add a new company"
                      : (companies.find((c) => c.id === value)?.name ?? null)
                  }
                </SelectValue>
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
              Drive name
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="TechNova Systems — 2026 Hiring"
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

          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Eligible programs
            </Label>
            {programs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Your university hasn&apos;t added any programs yet.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <p className="mb-1 text-xs text-muted-foreground">
                  Leave all unchecked to open this drive to every program — students from other
                  branches will still see the drive, but can&apos;t apply.
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
          {revealed ? (
            <Button
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Done
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating…" : "Create drive"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
