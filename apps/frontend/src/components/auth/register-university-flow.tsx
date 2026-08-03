"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { createUniversity } from "@/lib/api/universities";

type VerificationMethod = "video" | "dns";

export function RegisterUniversityFlow() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [method, setMethod] = useState<VerificationMethod>("video");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !domain.trim() || !contactName.trim() || !contactEmail.trim()) {
      toast.error("Fill in every field");
      return;
    }
    setSubmitting(true);
    try {
      await createUniversity({
        name: name.trim(),
        domain: domain.trim().toLowerCase(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't submit your request");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Request received
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Thanks, {contactName.trim().split(" ")[0]} — someone from our team will reach out to{" "}
            <span className="font-semibold text-foreground">{contactEmail}</span> to schedule a
            quick verification video call. Once {name} is verified, come back and sign up as an
            admin using your university email.
          </p>
          <Button className="mt-8" nativeButton={false} render={<Link href="/" />}>
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center p-8 sm:p-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <Image src="/brand/icon.png" alt="" width={32} height={32} className="rounded-[9px]" />
          <span className="font-heading text-lg font-extrabold">HireSphere</span>
        </Link>

        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          Register your university
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every university is manually verified before its students and staff can sign up — no
          impersonation, no unverified drives.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              University name
            </Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="IIT Bombay"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Student &amp; staff email domain
            </Label>
            <Input
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="iitb.ac.in"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Your name
            </Label>
            <Input
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Placement cell contact"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Contact email
            </Label>
            <Input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="placements@iitb.ac.in"
            />
          </div>

          <div>
            <Label className="mb-2 text-xs font-semibold text-muted-foreground">
              Verification method
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("video")}
                aria-pressed={method === "video"}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  method === "video" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Video className="size-4 text-primary" />
                <div className="mt-2 text-sm font-bold">Video call</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  A quick call to confirm you represent the university
                </div>
              </button>

              <div
                aria-disabled
                className="relative cursor-not-allowed select-none rounded-xl border p-4 text-left opacity-60 blur-[0.3px]"
              >
                <span className="absolute top-3 right-3 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                  Beta
                </span>
                <ShieldCheck className="size-4 text-muted-foreground" />
                <div className="mt-2 text-sm font-bold">DNS TXT record</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Verify by adding a DNS record — coming soon
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Submitting…" : "Submit for verification"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/auth?mode=signup&role=admin" className="font-semibold text-primary">
            Sign up as admin
          </Link>
        </p>
      </div>
    </div>
  );
}
