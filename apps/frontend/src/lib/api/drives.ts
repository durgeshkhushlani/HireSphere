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

export type DriveResult = { name: string; studentId: string | null };

// Non-secret — the code needed to build the company-portal URL. Only
// present when the caller is an admin viewing their own university's drive.
export type CompanyAccessInfo = { accessCode: string; createdAt: string; updatedAt: string };

export type Drive = {
  id: string;
  universityId: string;
  companyId: string;
  title: string;
  description: string | null;
  status: DriveStatus;
  minCgpa: string | null;
  maxBacklogs: number | null;
  resultsDeclared: boolean;
  resultsDeclaredAt: string | null;
  // Only present once resultsDeclared is true.
  results?: DriveResult[];
  // Stamped when an admin manually opens the drive — shown to students as
  // the drive's start date. Null if it's never been opened.
  openedAt: string | null;
  // Opt-in scheduled close time; null means the admin closes it manually.
  autoCloseAt: string | null;
  // Only present for an admin viewer.
  companyAccess?: CompanyAccessInfo | null;
  createdAt: string;
  updatedAt: string;
  company: Company;
  roles: DriveRole[];
};

// The plaintext password only ever appears in the response right after it
// was generated — at creation, or after an explicit regenerate.
export type CompanyAccessReveal = { accessCode: string; password: string };
export type DriveWithAccessReveal = Drive & { companyAccess: CompanyAccessReveal };

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
  return apiFetch<DriveWithAccessReveal>("/drives", { method: "POST", body: input, token });
}

export function regenerateCompanyAccess(driveId: string, emails: string[], token: string) {
  return apiFetch<CompanyAccessReveal>(`/drives/${driveId}/company-access/regenerate`, {
    method: "PATCH",
    body: { emails },
    token,
  });
}

export function updateDriveStatus(driveId: string, status: DriveStatus, token: string) {
  return apiFetch<Drive>(`/drives/${driveId}/status`, {
    method: "PATCH",
    body: { status },
    token,
  });
}

export function declareDriveResults(driveId: string, token: string) {
  return apiFetch<Drive>(`/drives/${driveId}/declare-results`, {
    method: "PATCH",
    token,
  });
}

// Pass null to disable a previously-set auto-close.
export function setDriveAutoClose(driveId: string, autoCloseAt: string | null, token: string) {
  return apiFetch<Drive>(`/drives/${driveId}/auto-close`, {
    method: "PATCH",
    body: { autoCloseAt },
    token,
  });
}

export function updateDriveDetails(
  driveId: string,
  input: { title?: string; description?: string; minCgpa?: number | null; maxBacklogs?: number | null },
  token: string
) {
  return apiFetch<Drive>(`/drives/${driveId}/details`, {
    method: "PATCH",
    body: input,
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
