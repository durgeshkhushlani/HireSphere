import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteNav } from "@/components/landing/site-nav";
import { Typewriter } from "@/components/landing/typewriter";

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Dynamic Application Forms",
    body: "Every drive can ask its own questions — configured per company, no code changes needed.",
  },
  {
    icon: CheckCircle2,
    title: "Automatic Eligibility",
    body: "CGPA, branch, and backlog rules are checked instantly — no manual shortlist filtering.",
  },
  {
    icon: Lock,
    title: "Placement Lock",
    body: "Lock a selected student from further drives with one click — your call, not automatic, so students can still pursue a better offer if your policy allows it.",
  },
  {
    icon: MessageCircle,
    title: "Built-in Help Assistant",
    body: "A chat assistant answers eligibility, process, and status questions instantly — for every student.",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Verify with university email",
    body: "Sign up and confirm your student status via a one-time code.",
  },
  {
    n: 2,
    title: "Apply to eligible drives",
    body: "See only drives you qualify for, and apply in a few clicks.",
  },
  {
    n: 3,
    title: "Track status in real time",
    body: "From applied to selected — always know where you stand.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <div
        className="bg-muted/60"
        style={{
          backgroundImage: "radial-gradient(var(--dot-pattern) 1.5px, transparent 1.5px)",
          backgroundSize: "26px 26px",
        }}
      >
        <SiteNav />

        <section className="mx-auto max-w-3xl px-6 pb-16 pt-10 text-center sm:pb-20 sm:pt-14">
          <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-6xl">
            campus placements,
            <br />
            <Typewriter />
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            One platform for admins to manage company drives and students to discover, apply,
            and track — effortlessly.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-5">
            <Link
              href="/auth?mode=signup&role=student"
              className="w-full max-w-[300px] rounded-2xl border bg-card p-8 text-center shadow-sm transition-colors hover:border-primary"
            >
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-bold">Student</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse open drives, submit applications, and track your placement journey.
              </p>
            </Link>
            <Link
              href="/register-university"
              className="w-full max-w-[300px] rounded-2xl border bg-card p-8 text-center shadow-sm transition-colors hover:border-primary"
            >
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="size-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-bold">Placement Admin</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create drives, manage student pools, and shortlist candidates.
              </p>
            </Link>
          </div>
        </section>
      </div>

      <section className="border-y bg-card px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="size-5 text-primary" />
              </div>
              <h3 className="font-heading text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="for-universities" className="px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="size-3.5" /> For Universities
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight">
              Replace spreadsheets with one verified system of record
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every university is manually verified before its students can register — no
              impersonation, no unverified drives. Once live, your placement cell manages the
              entire season from one dashboard.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Post drives with custom eligibility (CGPA, branch, backlogs) — checked automatically",
                "Build a per-drive application form in minutes, no engineering needed",
                "Move applicants through Applied → Shortlisted → Interview → Selected with one click",
                "Bulk-schedule interviews for every shortlisted candidate at once",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90"
              nativeButton={false}
              render={<Link href="/register-university" />}
            >
              Register your university <ArrowRight className="size-4" />
            </Button>
          </div>
          <Card className="border-none bg-primary/5 p-8 shadow-none">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["6", "status pipeline stages"],
                ["100%", "eligibility automated"],
                ["0", "spreadsheets needed"],
                ["1", "dashboard for everything"],
              ].map(([stat, label]) => (
                <div key={label} className="rounded-xl bg-card p-5 shadow-sm">
                  <div className="font-heading text-3xl font-extrabold text-primary">{stat}</div>
                  <div className="mt-1 text-xs font-semibold text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section id="for-students" className="border-y bg-muted/40 px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Card className="order-2 flex flex-col gap-3 border-none p-6 shadow-sm lg:order-1">
            {[
              { company: "TechNova Systems", role: "Software Engineer", status: "Open" },
              { company: "Meridian Analytics", role: "Data Analyst", status: "Open" },
              { company: "Orbit Cloud", role: "DevOps Engineer", status: "Closed" },
            ].map((d) => (
              <div
                key={d.company}
                className="flex items-center justify-between rounded-xl border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 font-heading font-extrabold text-primary">
                    {d.company.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{d.company}</div>
                    <div className="text-xs text-muted-foreground">{d.role}</div>
                  </div>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={
                    d.status === "Open"
                      ? { background: "oklch(0.95 0.03 195)", color: "oklch(0.4 0.09 195)" }
                      : { background: "oklch(0.93 0.004 255)", color: "oklch(0.48 0.012 255)" }
                  }
                >
                  {d.status}
                </span>
              </div>
            ))}
          </Card>
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
              <Sparkles className="size-3.5" /> For Students
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight">
              Only see drives you can actually apply to
            </h2>
            <p className="mt-4 text-muted-foreground">
              No more scrolling past roles you don&apos;t qualify for. Eligibility is checked the
              moment a drive opens, and your application status updates in real time — all the
              way through to placement.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Sign up in minutes with OTP verification via your university email",
                "Apply only to drives that match your CGPA, branch, and backlog record",
                "Track every application's status without emailing the placement cell",
                "Ask the built-in assistant anything about the process, any time",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-8 border-primary text-primary hover:bg-primary/10"
              nativeButton={false}
              render={<Link href="/auth?mode=signup&role=student" />}
            >
              Get started as a student <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">How it works</h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary font-heading text-lg font-extrabold text-primary-foreground">
                {s.n}
              </div>
              <h3 className="text-base font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-16 sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground sm:py-16">
          <Image src="/brand/icon.png" alt="" width={40} height={40} className="rounded-[10px]" />
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Ready to run this season without a spreadsheet?
          </h2>
          <p className="max-w-md text-primary-foreground/85">
            Get your university verified and your first drive live in one sitting.
          </p>
          <Button
            size="lg"
            className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90"
            nativeButton={false}
            render={<Link href="/auth?mode=signup" />}
          >
            Get started <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t bg-muted/60 px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2.5">
          <Image src="/brand/icon.png" alt="HireSphere" width={28} height={28} className="rounded-lg" />
          <span className="font-heading text-sm font-bold">HireSphere</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} HireSphere. Built for Placement Cells — by Durgesh
            Khushlani
          </span>
          <Link href="/privacy" className="font-semibold transition-colors hover:text-primary">
            Privacy Policy
          </Link>
          <div className="flex items-center gap-2.5">
            <a
              href="https://www.linkedin.com/in/durgesh-khushlani-912366324/"
              target="_blank"
              rel="noreferrer"
              aria-label="Durgesh Khushlani on LinkedIn"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.446-2.136 2.94v5.666H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.554V9h3.565v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://github.com/durgeshkhushlani"
              target="_blank"
              rel="noreferrer"
              aria-label="Durgesh Khushlani on GitHub"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
