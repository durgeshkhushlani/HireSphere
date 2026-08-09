"use client";

import { useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { askChat, type ChatTurn } from "@/lib/api/chat";
import { useChatPageContext } from "@/lib/chat-page-context";

export function ChatWidget() {
  const { token } = useAuth();
  const { pageContext } = useChatPageContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  if (!token) return null;

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const { reply } = await askChat({ message: text, history, pageContext }, token!);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "The assistant is unavailable right now"
      );
    } finally {
      setSending(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    }
  }

  return (
    <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end">
      {open && (
        // Capped at 320px on larger screens, but shrinks to fit narrow
        // phones instead of overflowing past the left edge of the viewport.
        <div className="mb-3 flex h-[420px] w-[min(320px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-lg ring-1 ring-foreground/10">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <span className="flex items-center gap-1.5 text-sm font-bold">
              HireSphere Assistant
              <span className="rounded-full bg-primary-foreground/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
                BETA
              </span>
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="size-4" />
            </button>
          </div>
          <div className="border-b bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent">
            Beta — can get things wrong. Please double-check anything important.
          </div>
          <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Ask about eligibility, drives, applications, interview prep, or live placement stats.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Thinking…
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t p-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question…"
              className="h-8"
            />
            <Button size="icon-sm" onClick={handleSend} disabled={sending || !input.trim()}>
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
      <Button
        size="icon-lg"
        className="rounded-full shadow-lg"
        data-tour="chat-bubble"
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle className="size-5" />
      </Button>
    </div>
  );
}
