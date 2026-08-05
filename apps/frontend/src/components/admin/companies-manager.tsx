"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { listCompanies, createCompany, updateCompany, type Company } from "@/lib/api/companies";
import { SearchInput } from "@/components/ui/search-input";

type CompanyForm = { name: string; industry: string; contactEmail: string; contactPhone: string };
const EMPTY_FORM: CompanyForm = { name: "", industry: "", contactEmail: "", contactPhone: "" };

export function CompaniesManager() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [query, setQuery] = useState("");

  async function refresh() {
    if (!token) return;
    try {
      setCompanies(await listCompanies(token));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load companies");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = (companies ?? []).filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search companies…" />
        <CompanyDialog title="Add a company" trigger="New Company" onSaved={refresh} />
      </div>

      {companies === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No companies yet — add one to start posting drives.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No companies match &quot;{query}&quot;.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((company) => (
            <Card key={company.id}>
              <CardContent className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{company.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {company.industry || "No industry set"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {company.contactEmail || "No contact email"}
                      {company.contactPhone ? ` · ${company.contactPhone}` : ""}
                    </div>
                  </div>
                </div>
                <CompanyDialog
                  title={`Edit ${company.name}`}
                  trigger="Edit"
                  company={company}
                  onSaved={refresh}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyDialog({
  title,
  trigger,
  company,
  onSaved,
}: {
  title: string;
  trigger: string;
  company?: Company;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setForm({
        name: company?.name ?? "",
        industry: company?.industry ?? "",
        contactEmail: company?.contactEmail ?? "",
        contactPhone: company?.contactPhone ?? "",
      });
    }
  }

  async function handleSubmit() {
    if (!token || !form.name.trim()) {
      toast.error("Enter a company name");
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      };
      if (company) {
        await updateCompany(company.id, input, token);
        toast.success(`${form.name} updated`);
      } else {
        await createCompany(input, token);
        toast.success(`${form.name} added`);
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save company");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant={company ? "outline" : "default"} size="sm" />}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Company details shown across your drives.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="TechNova Systems"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              placeholder="Software"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Contact email
            </Label>
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              placeholder="hiring@technova.com"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Contact phone
            </Label>
            <Input
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
