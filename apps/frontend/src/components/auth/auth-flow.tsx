"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OtpInput } from "@/components/auth/otp-input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";
import { listUniversities, listUniversityPrograms, type Program } from "@/lib/api/universities";

type Mode = "login" | "signup";
type Role = "student" | "admin";
type Step = "form" | "academic" | "otp";

export function AuthFlow({
  initialMode,
  initialRole,
}: {
  initialMode: Mode;
  initialRole: Role;
}) {
  const router = useRouter();
  const { login: setSession } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [programId, setProgramId] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universityName, setUniversityName] = useState<string | null>(null);
  const [universityId, setUniversityId] = useState<string | null>(null);

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);

  function switchMode(next: Mode) {
    setMode(next);
    setStep("form");
    setOtpDigits(["", "", "", "", "", ""]);
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { token, user } = await authApi.login(email, password);
      setSession(token, user);
      router.push(user.role === "ADMIN" ? "/admin" : "/student");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveUniversityForEmail(): Promise<string | null> {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      toast.error("Enter a valid university email");
      return null;
    }
    const universities = await listUniversities();
    const match = universities.find((u) => u.domain.toLowerCase() === domain);
    if (!match) {
      toast.error(
        "We couldn't find a verified university for that email domain. Ask your placement cell to register your university first."
      );
      return null;
    }
    setUniversityName(match.name);
    setUniversityId(match.id);
    return match.id;
  }

  async function requestCode() {
    try {
      await authApi.requestOtp(email);
      setStep("otp");
      toast.success("Verification code sent — check your inbox.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send a code");
    }
  }

  async function handleSignupInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Fill in every field");
      return;
    }
    setSubmitting(true);
    try {
      if (role === "student") {
        const uniId = await resolveUniversityForEmail();
        if (!uniId) return;
        const list = await listUniversityPrograms(uniId);
        if (list.length === 0) {
          toast.error("Your university hasn't added any programs yet — contact your placement cell.");
          return;
        }
        setPrograms(list);
        setStep("academic");
      } else {
        const uniId = await resolveUniversityForEmail();
        if (!uniId) return;
        await requestCode();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcademicSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cgpaNum = Number(cgpa);
    if (!programId) {
      toast.error("Select your program");
      return;
    }
    if (!cgpa || Number.isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      toast.error("Enter a valid CGPA between 0 and 10");
      return;
    }
    setSubmitting(true);
    try {
      await requestCode();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOtpSubmit() {
    const code = otpDigits.join("");
    if (code.length !== 6) {
      toast.error("Enter the full 6-digit code");
      return;
    }
    setSubmitting(true);
    try {
      const { verificationToken } = await authApi.verifyOtp(email, code);

      const payload =
        role === "admin"
          ? await authApi.registerAdmin({ verificationToken, email, password, name })
          : await authApi.registerStudent({
              verificationToken,
              email,
              password,
              name,
              programId,
              cgpa: Number(cgpa),
            });

      setSession(payload.token, payload.user);
      router.push(payload.user.role === "ADMIN" ? "/admin" : "/student");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full">
      <div className="hidden w-[42%] flex-col justify-between border-r bg-muted/60 p-14 lg:flex">
        <div className="flex flex-1 flex-col justify-center">
          <Image
            src="/brand/student-illustration.png"
            alt=""
            width={140}
            height={170}
            className="object-contain"
          />
          <p className="mt-4 max-w-xs text-xl font-bold leading-tight">
            Every drive, one place.
            <br />
            Zero spreadsheets.
          </p>
        </div>
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/icon.png" alt="" width={32} height={32} className="rounded-[9px]" />
          <span className="font-heading text-lg font-extrabold">HireSphere</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[420px]">
          {step !== "otp" && (
            <>
              <div className="mb-6 flex gap-6 border-b">
                <button
                  onClick={() => switchMode("login")}
                  className={`-mb-px border-b-2 pb-2.5 text-[15px] font-bold ${
                    mode === "login"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  Log in
                </button>
                <button
                  onClick={() => switchMode("signup")}
                  className={`-mb-px border-b-2 pb-2.5 text-[15px] font-bold ${
                    mode === "signup"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  Sign up
                </button>
              </div>

              {mode === "signup" && step === "form" && (
                <div className="mb-6 flex gap-2 rounded-lg bg-muted p-1">
                  <button
                    onClick={() => setRole("student")}
                    className={`flex-1 rounded-md py-2 text-sm font-bold ${
                      role === "student" ? "bg-card shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    Student
                  </button>
                  <button
                    onClick={() => setRole("admin")}
                    className={`flex-1 rounded-md py-2 text-sm font-bold ${
                      role === "admin" ? "bg-card shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    Placement Admin
                  </button>
                </div>
              )}
            </>
          )}

          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Email
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Password
                </Label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting ? "Signing in…" : "Continue"}
              </Button>
            </form>
          )}

          {mode === "signup" && step === "form" && (
            <form onSubmit={handleSignupInfoSubmit} className="flex flex-col gap-4">
              <div>
                <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Full name
                </Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aditi Sharma"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  University email
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Password
                </Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting ? "Checking…" : "Continue"}
              </Button>
            </form>
          )}

          {mode === "signup" && step === "academic" && (
            <form onSubmit={handleAcademicSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {universityName} — a couple more details before we send your code.
              </p>
              <div>
                <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Program
                </Label>
                <Select value={programId} onValueChange={(value) => setProgramId(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  CGPA
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.01}
                  required
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="8.4"
                />
              </div>
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting ? "Sending code…" : "Continue"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-left text-xs font-semibold text-muted-foreground"
              >
                ← Back
              </button>
            </form>
          )}

          {step === "otp" && (
            <div>
              <h2 className="font-heading text-xl font-extrabold">Verify your email</h2>
              <p className="mt-1.5 mb-6 text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-semibold">{email}</span>. Enter
                it below to confirm your identity.
              </p>
              <OtpInput value={otpDigits} onChange={setOtpDigits} />
              <Button
                onClick={handleOtpSubmit}
                disabled={submitting}
                className="mb-3.5 w-full"
              >
                {submitting ? "Verifying…" : "Verify & Continue"}
              </Button>
              <div className="flex justify-between text-[13px]">
                <button onClick={requestCode} className="font-semibold text-primary">
                  Resend code
                </button>
                <button
                  onClick={() => setStep(role === "student" && universityId ? "academic" : "form")}
                  className="font-semibold text-muted-foreground"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
