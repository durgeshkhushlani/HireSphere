import { apiFetch } from "./client";
import type { ChatPageContext } from "@/lib/chat-page-context";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function askChat(
  input: { message: string; history?: ChatTurn[]; pageContext?: ChatPageContext | null },
  token: string
) {
  return apiFetch<{ reply: string }>("/chat", { method: "POST", body: input, token });
}
