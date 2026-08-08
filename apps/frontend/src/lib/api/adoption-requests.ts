import { apiFetch } from "./client";

export function submitAdoptionRequest(input: {
  name: string;
  email: string;
  universityName: string;
  message?: string;
}) {
  return apiFetch<{ message: string }>("/adoption-requests/submit", {
    method: "POST",
    body: input,
  });
}
