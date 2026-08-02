import { apiFetch } from "./client";
import type { DriveStatus } from "@/lib/status";

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type Drive = {
  id: string;
  universityId: string;
  companyId: string;
  title: string;
  description: string | null;
  status: DriveStatus;
  minCgpa: string | null;
  maxBacklogs: number | null;
  createdAt: string;
  updatedAt: string;
  company: Company;
};

export type ApplicationFormQuestion = { id: string; label: string; type?: string };
export type ApplicationForm = { id: string; driveId: string; questions: ApplicationFormQuestion[] };

export function listDrives(token: string) {
  return apiFetch<Drive[]>("/drives", { token });
}

export function getApplicationForm(driveId: string, token: string) {
  return apiFetch<ApplicationForm>(`/drives/${driveId}/application-form`, { token });
}

export function applyToDrive(
  driveId: string,
  input: { responses: Record<string, string>; resumeUrl?: string },
  token: string
) {
  return apiFetch<{ id: string }>(`/drives/${driveId}/applications`, {
    method: "POST",
    body: input,
    token,
  });
}
