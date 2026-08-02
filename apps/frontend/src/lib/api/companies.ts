import { apiFetch } from "./client";

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
};

export function listCompanies(token: string) {
  return apiFetch<Company[]>("/companies", { token });
}

export function createCompany(
  input: { name: string; industry?: string; contactEmail?: string; contactPhone?: string },
  token: string
) {
  return apiFetch<Company>("/companies", { method: "POST", body: input, token });
}

export function updateCompany(
  id: string,
  input: { name?: string; industry?: string; contactEmail?: string; contactPhone?: string },
  token: string
) {
  return apiFetch<Company>(`/companies/${id}`, { method: "PATCH", body: input, token });
}
