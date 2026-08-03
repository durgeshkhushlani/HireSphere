import { apiFetch } from "./client";
import type { ApplicationStatus } from "@/lib/status";
import type { Drive, DriveRole } from "./drives";

export type RolePreference = { rank: number; driveRole: DriveRole };

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
  rolePreferences: RolePreference[];
  selectedRole: DriveRole | null;
};

export function listMyApplications(token: string) {
  return apiFetch<Application[]>("/applications/me", { token });
}

export type ApplicantEntry = {
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
  studentProfile: {
    user: { id: string; name: string; email: string };
    program: { id: string; name: string };
  };
  rolePreferences: RolePreference[];
  selectedRole: DriveRole | null;
};

export function listApplicationsForDrive(driveId: string, token: string) {
  return apiFetch<ApplicantEntry[]>(`/drives/${driveId}/applications`, { token });
}

export function updateApplicationStatus(
  id: string,
  input: {
    status: ApplicationStatus;
    interviewSlot?: string;
    interviewVenue?: string;
    selectedRoleId?: string;
  },
  token: string
) {
  return apiFetch<ApplicantEntry>(`/applications/${id}/status`, {
    method: "PATCH",
    body: input,
    token,
  });
}

export function scheduleResumeDelivery(id: string, dispatchAt: string, token: string) {
  return apiFetch<{ id: string; resumeDispatchAt: string | null }>(
    `/applications/${id}/schedule-resume`,
    { method: "PATCH", body: { dispatchAt }, token }
  );
}

export function bulkSetInterviewSchedule(
  driveId: string,
  input: { applicationIds: string[]; interviewSlot?: string; interviewVenue?: string },
  token: string
) {
  return apiFetch<ApplicantEntry[]>(`/drives/${driveId}/applications/interview-schedule`, {
    method: "PATCH",
    body: input,
    token,
  });
}
