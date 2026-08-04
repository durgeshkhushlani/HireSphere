import { apiFetch } from "./client";
import type { AuthUser } from "@/lib/auth-context";

type AuthPayload = { token: string; user: AuthUser };

export type MyProfile = AuthUser & {
  university: {
    id: string;
    name: string;
    domain: string;
    verified: boolean;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    timezone: string;
  };
};

export function requestOtp(email: string) {
  return apiFetch<{ message: string }>("/auth/otp/request", {
    method: "POST",
    body: { email },
  });
}

export function verifyOtp(email: string, code: string) {
  return apiFetch<{ verificationToken: string }>("/auth/otp/verify", {
    method: "POST",
    body: { email, code },
  });
}

export function registerAdmin(input: {
  verificationToken: string;
  email: string;
  password: string;
  name: string;
}) {
  return apiFetch<AuthPayload>("/auth/register/admin", { method: "POST", body: input });
}

export function registerStudent(input: {
  verificationToken: string;
  programId: string;
  email: string;
  password: string;
  name: string;
  cgpa: number;
}) {
  return apiFetch<AuthPayload>("/auth/register/student", { method: "POST", body: input });
}

export function login(email: string, password: string) {
  return apiFetch<AuthPayload>("/auth/login", { method: "POST", body: { email, password } });
}

export function getMe(token: string) {
  return apiFetch<MyProfile>("/auth/me", { token });
}
