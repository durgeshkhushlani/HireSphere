import { apiFetch } from "./client";
import type { AuthUser } from "@/lib/auth-context";

export type DemoSession = {
  admin: { token: string; user: AuthUser };
  student: { token: string; user: AuthUser };
  expiresAt: string;
};

export function startDemo() {
  return apiFetch<DemoSession>("/demo/start", { method: "POST" });
}
