import { apiFetch } from "./client";

export type CompanyPortalSession = {
  token: string;
  drive: {
    id: string;
    title: string;
    companyName: string;
    universityTimezone: string;
  };
};

export function companyPortalLogin(input: {
  universityDomain: string;
  accessCode: string;
  password: string;
}) {
  return apiFetch<CompanyPortalSession>("/company-portal/login", {
    method: "POST",
    body: input,
  });
}
