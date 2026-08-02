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
