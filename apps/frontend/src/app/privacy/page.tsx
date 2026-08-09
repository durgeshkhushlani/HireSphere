import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Privacy Policy — HireSphere",
  description: "How HireSphere collects, uses, and protects data for students, admins, and companies.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-heading text-lg font-bold text-foreground">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/icon.png" alt="" width={32} height={32} className="rounded-[9px]" />
          <span className="font-heading text-lg font-extrabold">HireSphere</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-24 sm:px-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 2026</p>

        <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground">
          <Section title="1. Overview">
            <p>
              HireSphere is a campus placement platform used by university placement cells,
              students, and hiring companies to run drives, applications, and offers in one
              place. This policy explains what information the platform stores, who can see
              it, and — most importantly — what we as its operators do and don&apos;t do with
              it. It applies to every university instance running on HireSphere.
            </p>
          </Section>

          <Section title="2. Our Commitment: We Don't Look At Your Data">
            <p>
              HireSphere is infrastructure for your placement cell, not a service that studies
              your data. As a matter of routine, we do not browse, review, or analyze your
              university&apos;s information — not which companies are visiting your campus, not
              application details, not offer amounts, nothing. The platform stores and displays
              data back to the people your placement cell has configured to see it; that&apos;s
              automated processing to run the features you use, not human review by us.
            </p>
            <p>
              If you ever run into an issue and ask us for support, we&apos;ll only look at the
              specific record needed to help, only with your knowledge, and only for that
              purpose. Outside of that, your placement data is yours — you&apos;re free to use
              the platform however you like without us watching over it.
            </p>
            <p>
              Data is encrypted in transit (HTTPS) and at rest by default through our database
              provider. If your university wants additional protection — for example,
              field-level encryption on especially sensitive records — reach out and we&apos;ll
              work with you on it.
            </p>
          </Section>

          <Section title="3. What the Platform Stores">
            <p>
              We only store what a placement season actually needs to run — see §2 for how
              little we do with it beyond that:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold text-foreground">Profile basics</span> — your
                name, university email, phone, and program/branch.
              </li>
              <li>
                <span className="font-semibold text-foreground">Eligibility data</span> — CGPA
                and backlog count, which the platform uses to automatically check which drives
                you qualify for. Nothing beyond these two is required to use HireSphere — a few
                optional fields (10th/12th percentage, blood group, address) exist only if your
                university&apos;s process calls for them, and you choose whether to fill them in.
                Your university&apos;s placement cell can also configure additional optional
                fields of its own for its process.
              </li>
              <li>
                <span className="font-semibold text-foreground">Your resume</span> — uploaded
                directly from your browser to our file-storage provider when you apply; the file
                itself never passes through our servers (see §6).
              </li>
              <li>
                <span className="font-semibold text-foreground">Admin accounts</span> — name,
                university email, and the actions taken while managing drives and applicants.
              </li>
              <li>
                <span className="font-semibold text-foreground">Company information</span> —
                company name, industry, and contact email/phone, entered by your placement cell
                or by the company through their one-time portal login.
              </li>
              <li>
                <span className="font-semibold text-foreground">Application &amp; placement
                records</span> — which drives and roles you applied to, your answers to each
                drive&apos;s application questions, interview schedule and venue, application
                status history, and placement/package outcomes once declared.
              </li>
              <li>
                <span className="font-semibold text-foreground">Chat assistant messages</span> —
                if you use the in-app help assistant, your message text is sent to a third-party
                AI provider to generate a reply (see §6).
              </li>
            </ul>
            <p>
              We do not collect payment card numbers, bank details, or government ID numbers —
              HireSphere has no billing feature and never asks for this information.
            </p>
          </Section>

          <Section title="4. How We Use Your Information">
            <ul className="list-disc space-y-2 pl-5">
              <li>To run the core product — eligibility checks, applications, interview scheduling, and offer tracking.</li>
              <li>To verify you belong to the university you&apos;re signing up under, via a one-time code sent to your university email.</li>
              <li>To notify your placement cell&apos;s configured recipients about new drives, companies, and selections.</li>
              <li>To answer your questions through the built-in assistant, including questions about your own applications.</li>
              <li>To keep the platform secure — detecting abuse, enforcing rate limits, and investigating reported issues.</li>
            </ul>
            <p>
              We do not sell your data, analyze it for our own purposes, or use it for
              advertising.
            </p>
          </Section>

          <Section title="5. Who Can See Your Information">
            <p>
              Access is scoped by role and by university — nobody outside your own university
              instance can see your data, and that includes us (see §2):
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Your university&apos;s placement admins can see student profiles, applications, and placement records for their own university only.</li>
              <li>A company only sees applicants to its own drive, never applicants to another company&apos;s drive or students who haven&apos;t applied.</li>
              <li>Other students never see your profile, application answers, or contact details — only your name and student ID appear in a drive&apos;s results, and only once your placement cell declares them.</li>
            </ul>
          </Section>

          <Section title="6. Third-Party Services We Use">
            <p>
              We rely on a small set of infrastructure providers to run HireSphere. Each is a
              processor, not an analyst — they store or transmit data to keep the platform
              running, and none of them use your data for their own purposes:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li><span className="font-semibold text-foreground">Supabase</span> — hosts our PostgreSQL database (all platform data).</li>
              <li><span className="font-semibold text-foreground">Render</span> — hosts our backend application.</li>
              <li><span className="font-semibold text-foreground">Vercel</span> — hosts our frontend web application.</li>
              <li><span className="font-semibold text-foreground">Cloudinary</span> — stores the resume PDF you upload; it&apos;s sent directly from your browser and never passes through our servers.</li>
              <li><span className="font-semibold text-foreground">Brevo</span> — delivers transactional email (OTP codes, notifications, company portal credentials).</li>
              <li><span className="font-semibold text-foreground">A third-party AI provider</span> — processes messages you send to the in-app chat assistant to generate a reply. Only your message and the minimal platform data needed to answer it (e.g. your own application list) are sent — never your password or another student&apos;s data.</li>
            </ul>
          </Section>

          <Section title="7. Data Security">
            <ul className="list-disc space-y-2 pl-5">
              <li>Passwords are hashed (never stored in plain text) and one-time codes expire shortly after being issued.</li>
              <li>Access to the API requires a signed session token; every request is scoped to your role and your own university — a request for another university&apos;s data is rejected, not filtered client-side.</li>
              <li>Data is encrypted in transit (HTTPS) between your browser, our servers, and our database.</li>
              <li>Company portal access is single-use and can be revoked or regenerated by an admin at any time.</li>
            </ul>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We keep your data for as long as your account and your university&apos;s instance
              are active, so your application history remains available across placement
              seasons. Demo accounts (created via &quot;Try it out&quot;) are temporary and
              automatically deleted after a short trial period. If your university discontinues
              HireSphere, or you ask us to delete your account, we remove your personal data
              within a reasonable time, except where we&apos;re required to keep records for
              legal or audit reasons.
            </p>
          </Section>

          <Section title="9. Your Rights and Choices">
            <p>
              You can review and update most of your own profile details from your dashboard at
              any time. To request a copy of your data, a correction, or deletion of your
              account, contact your university&apos;s placement cell (who administers your
              account) or reach us directly using the contact option on our homepage.
            </p>
          </Section>

          <Section title="10. Cookies &amp; Local Storage">
            <p>
              HireSphere doesn&apos;t use advertising or third-party tracking cookies, and we
              don&apos;t run any analytics or ad-tracking scripts. We use your browser&apos;s
              local storage to keep you signed in between visits — clearing it, or logging out,
              ends your session.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              If we make a material change to how we collect or use data, we&apos;ll update this
              page and revise the date at the top. Continued use of HireSphere after a change
              means you accept the updated policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              Questions about this policy or your data can be sent through the &quot;Adopt
              HireSphere&quot; contact option on our{" "}
              <Link href="/" className="font-semibold text-primary hover:underline">
                homepage
              </Link>
              , or directed to your university&apos;s placement cell.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t pt-6">
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
