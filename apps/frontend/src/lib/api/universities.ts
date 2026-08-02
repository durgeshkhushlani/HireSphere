import { apiFetch } from "./client";

export type University = {
  id: string;
  name: string;
  domain: string;
  verified: boolean;
};

export type Program = { id: string; name: string };

export function listUniversities() {
  return apiFetch<University[]>("/universities");
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

export function linkUniversityProgram(programId: string, token: string) {
  return apiFetch<{ id: string; universityId: string; programId: string; program: Program }>(
    "/university-programs",
    { method: "POST", body: { programId }, token }
  );
}
