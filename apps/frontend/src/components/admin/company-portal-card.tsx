"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { regenerateCompanyAccess, type CompanyAccessInfo } from "@/lib/api/drives";

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

export function CompanyPortalCard({
  driveId,
  companyAccess,
  defaultEmail,
  universityDomain,
}: {
  driveId: string;
  companyAccess: CompanyAccessInfo | null | undefined;
  defaultEmail: string | null;
  universityDomain: string | null;
}) {
  const { token } = useAuth();
  const [emails, setEmails] = useState<string[]>(defaultEmail ? [defaultEmail] : []);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<{ password: string } | null>(null);

  if (!companyAccess) return null;

  function addEmail() {
    const email = draft.trim();
    if (!email) return;
    setEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
    setDraft("");
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  async function handleSend() {
    if (!token) return;
    if (emails.length === 0) {
      toast.error("Add at least one recipient email");
      return;
    }
    setSubmitting(true);
    try {
      const result = await regenerateCompanyAccess(driveId, emails, token);
      setRevealed({ password: result.password });
      toast.success("New password generated and emailed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't regenerate access");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="text-sm font-bold">Company portal access</div>
        <p className="text-xs text-muted-foreground">
          Share this link with the company so they can review and update applicants for this
          drive only — nothing else on HireSphere is visible from it.
        </p>

        <PortalLink accessCode={companyAccess.accessCode} universityDomain={universityDomain} />

        {revealed && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex-1">
              <div className="text-xs font-semibold text-muted-foreground">
                New password (shown once — already emailed below)
              </div>
              <code className="text-xs">{revealed.password}</code>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={() => copy(revealed.password, "Password")}
            >
              <Copy />
            </Button>
          </div>
        )}

        <div>
          <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Regenerate &amp; send credentials to
          </Label>
          <div className="mb-2 flex flex-wrap gap-2">
            {emails.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recipients added yet.</p>
            ) : (
              emails.map((email) => (
                <span
                  key={email}
                  className="flex items-center gap-1 rounded-full bg-accent/15 py-1 pr-1 pl-2.5 text-xs font-semibold text-accent"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    aria-label={`Remove ${email}`}
                    className="rounded-full p-0.5 hover:bg-accent/20"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              placeholder="ceo@company.com"
              className="h-8 max-w-xs text-sm"
            />
            <Button type="button" size="icon-sm" variant="outline" onClick={addEmail}>
              <Plus />
            </Button>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          className="self-start"
          disabled={submitting}
          onClick={handleSend}
        >
          {submitting ? "Sending…" : "Regenerate & send"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PortalLink({
  accessCode,
  universityDomain,
}: {
  accessCode: string;
  universityDomain: string | null;
}) {
  const link = universityDomain
    ? `${window.location.origin}/${universityDomain}/${accessCode}`
    : null;

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
        {link ?? `Access code: ${accessCode}`}
      </code>
      {link && (
        <>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="shrink-0"
            aria-label="Open portal link in a new tab"
            onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="shrink-0"
            aria-label="Copy portal link"
            onClick={() => copy(link, "Portal link")}
          >
            <Copy />
          </Button>
        </>
      )}
    </div>
  );
}
