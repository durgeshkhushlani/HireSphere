import { apiFetch } from "./client";

export type University = {
  id: string;
  name: string;
  domain: string;
  verified: boolean;
  // Only present on GET /universities (the public, verified list) — lets
  // signup reject a second admin before OTP is sent, not just at the final
  // register step.
  hasAdmin?: boolean;
};

export type Program = { id: string; name: string };

export function listUniversities() {
  return apiFetch<University[]>("/universities");
}

export function listPendingUniversities() {
  return apiFetch<University[]>("/universities/pending");
}

export function createUniversity(input: {
  name: string;
  domain: string;
  contactName: string;
  contactEmail: string;
}) {
  return apiFetch<University>("/universities", { method: "POST", body: input });
}

export function listUniversityPrograms(universityId: string) {
  return apiFetch<Program[]>(`/universities/${universityId}/programs`);
}

export function listAllPrograms() {
  return apiFetch<Program[]>("/programs");
}

export function createProgram(name: string) {
  return apiFetch<Program>("/programs", { method: "POST", body: { name } });
}

export function updateMyUniversity(
  input: { contactEmail?: string; contactPhone?: string; timezone?: string },
  token: string
) {
  return apiFetch<University & { contactPhone: string | null; timezone: string }>(
    "/universities/me",
    { method: "PATCH", body: input, token }
  );
}

export function linkUniversityProgram(programId: string, token: string) {
  return apiFetch<{ id: string; universityId: string; programId: string; program: Program }>(
    "/university-programs",
    { method: "POST", body: { programId }, token }
  );
}
