import { apiFetch } from "./client";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function askChat(input: { message: string; history?: ChatTurn[] }, token: string) {
  return apiFetch<{ reply: string }>("/chat", { method: "POST", body: input, token });
}
