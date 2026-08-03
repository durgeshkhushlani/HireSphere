"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { getDrive, setDriveRoles, type Drive, type OfferType } from "@/lib/api/drives";

let draftSeq = 0;
function nextDraftKey() {
  draftSeq += 1;
  return `draft_${Date.now()}_${draftSeq}`;
}

type RoleDraft = {
  key: string;
  id?: string;
  title: string;
  offerType: OfferType;
  description: string;
  amount: string;
};

function emptyDraft(): RoleDraft {
  return { key: nextDraftKey(), title: "", offerType: "JOB", description: "", amount: "" };
}

export function DriveRolesManager({ driveId }: { driveId: string }) {
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [drive, setDrive] = useState<Drive | null>(null);
  const [drafts, setDrafts] = useState<RoleDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth?mode=login&role=admin");
    } else if (user.role !== "ADMIN") {
      router.replace("/student");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user || user.role !== "ADMIN" || !token) return;
    setLoading(true);
    getDrive(driveId, token)
      .then((d) => {
        setDrive(d);
        setDrafts(
          d.roles.length > 0
            ? d.roles.map((r) => ({
                key: r.id,
                id: r.id,
                title: r.title,
                offerType: r.offerType,
                description: r.description,
                amount: (r.offerType === "JOB" ? r.ctcAmount : r.stipendAmount) ?? "",
              }))
            : [emptyDraft()]
        );
      })
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Couldn't load the drive")
      )
      .finally(() => setLoading(false));
  }, [driveId, token, authLoading, user]);

  function updateDraft(key: string, patch: Partial<RoleDraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, emptyDraft()]);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }

  async function handleSave() {
    if (!token) return;
    if (drafts.length === 0) {
      toast.error("Add at least one role");
      return;
    }
    for (const d of drafts) {
      if (!d.title.trim() || !d.description.trim() || !d.amount.trim()) {
        toast.error("Fill in every field for each role");
        return;
      }
      if (Number.isNaN(Number(d.amount))) {
        toast.error(`Enter a valid number for ${d.title || "a role"}'s amount`);
        return;
      }
    }
    setSaving(true);
    try {
      await setDriveRoles(
        driveId,
        drafts.map((d) => ({
          id: d.id,
          title: d.title.trim(),
          offerType: d.offerType,
          description: d.description.trim(),
          ...(d.offerType === "JOB"
            ? { ctcAmount: Number(d.amount) }
            : { stipendAmount: Number(d.amount) }),
        })),
        token
      );
      toast.success("Roles saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save roles");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user || user.role !== "ADMIN") return null;

  return (
    <DashboardShell roleLabel="Admin">
      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Drives
        </Link>

        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          {drive ? `Roles for ${drive.title}` : "Manage roles"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {drive ? `${drive.company.name} — ` : ""}Each role has its own type, JD, and CTC or
          stipend.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {drafts.map((d) => (
              <Card key={d.key}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                        Role title
                      </Label>
                      <Input
                        value={d.title}
                        onChange={(e) => updateDraft(d.key, { title: e.target.value })}
                        placeholder="Software Engineer"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mt-5"
                      onClick={() => removeDraft(d.key)}
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Offer type
                    </Label>
                    <div className="flex gap-2 rounded-lg bg-muted p-1">
                      <button
                        type="button"
                        onClick={() => updateDraft(d.key, { offerType: "JOB" })}
                        className={`flex-1 rounded-md py-1.5 text-sm font-bold ${
                          d.offerType === "JOB" ? "bg-card shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        Job
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDraft(d.key, { offerType: "INTERNSHIP" })}
                        className={`flex-1 rounded-md py-1.5 text-sm font-bold ${
                          d.offerType === "INTERNSHIP"
                            ? "bg-card shadow-sm"
                            : "text-muted-foreground"
                        }`}
                      >
                        Internship
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Job description
                    </Label>
                    <Textarea
                      value={d.description}
                      onChange={(e) => updateDraft(d.key, { description: e.target.value })}
                      placeholder="What this role involves…"
                    />
                  </div>

                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      {d.offerType === "JOB" ? "CTC (per annum)" : "Stipend (per month)"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={d.amount}
                      onChange={(e) => updateDraft(d.key, { amount: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder={d.offerType === "JOB" ? "1200000" : "25000"}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button type="button" variant="outline" onClick={addDraft} className="self-start">
              <Plus /> Add another role
            </Button>

            <Button onClick={handleSave} disabled={saving} className="mt-2 self-start">
              {saving ? "Saving…" : "Save roles"}
            </Button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
