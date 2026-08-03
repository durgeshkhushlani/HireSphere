import { apiFetch } from "./client";
import type { DriveStatus } from "@/lib/status";

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export type OfferType = "INTERNSHIP" | "JOB";

export type DriveRole = {
  id: string;
  driveId: string;
  title: string;
  offerType: OfferType;
  description: string;
  ctcAmount: string | null;
  stipendAmount: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DriveRoleInput = {
  id?: string;
  title: string;
  offerType: OfferType;
  description: string;
  ctcAmount?: number;
  stipendAmount?: number;
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
  roles: DriveRole[];
};

export type ApplicationFormQuestion = { id: string; label: string; type?: string };
export type ApplicationForm = { id: string; driveId: string; questions: ApplicationFormQuestion[] };

export function listDrives(token: string) {
  return apiFetch<Drive[]>("/drives", { token });
}

export function getDrive(driveId: string, token: string) {
  return apiFetch<Drive>(`/drives/${driveId}`, { token });
}

export function getApplicationForm(driveId: string, token: string) {
  return apiFetch<ApplicationForm>(`/drives/${driveId}/application-form`, { token });
}

export function applyToDrive(
  driveId: string,
  input: {
    responses: Record<string, string>;
    resumeUrl?: string;
    rolePreferences?: string[];
  },
  token: string
) {
  return apiFetch<{ id: string }>(`/drives/${driveId}/applications`, {
    method: "POST",
    body: input,
    token,
  });
}

export function createDrive(
  input: {
    companyId: string;
    title: string;
    description?: string;
    minCgpa?: number;
    maxBacklogs?: number;
  },
  token: string
) {
  return apiFetch<Drive>("/drives", { method: "POST", body: input, token });
}

export function updateDriveStatus(driveId: string, status: DriveStatus, token: string) {
  return apiFetch<Drive>(`/drives/${driveId}/status`, {
    method: "PATCH",
    body: { status },
    token,
  });
}

export function setApplicationForm(
  driveId: string,
  questions: ApplicationFormQuestion[],
  token: string
) {
  return apiFetch<ApplicationForm>(`/drives/${driveId}/application-form`, {
    method: "PUT",
    body: { questions },
    token,
  });
}

export function getEligiblePrograms(driveId: string, token: string) {
  return apiFetch<{ id: string; name: string }[]>(`/drives/${driveId}/eligible-programs`, {
    token,
  });
}

export function setEligiblePrograms(driveId: string, programIds: string[], token: string) {
  return apiFetch<{ id: string; name: string }[]>(`/drives/${driveId}/eligible-programs`, {
    method: "PUT",
    body: { programIds },
    token,
  });
}

export function setDriveRoles(driveId: string, roles: DriveRoleInput[], token: string) {
  return apiFetch<DriveRole[]>(`/drives/${driveId}/roles`, {
    method: "PUT",
    body: { roles },
    token,
  });
}
