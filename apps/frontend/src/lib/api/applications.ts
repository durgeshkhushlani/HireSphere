import { apiFetch } from "./client";
import type { ApplicationStatus } from "@/lib/status";
import type { Drive } from "./drives";

export type Application = {
  id: string;
  driveId: string;
  studentProfileId: string;
  responses: Record<string, string>;
  resumeUrl: string | null;
  interviewSlot: string | null;
  interviewVenue: string | null;
  status: ApplicationStatus;
  resumeDispatchAt: string | null;
  resumeSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  drive: Drive;
};

export function listMyApplications(token: string) {
  return apiFetch<Application[]>("/applications/me", { token });
}
