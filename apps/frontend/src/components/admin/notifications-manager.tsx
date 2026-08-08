"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import {
  listNotificationRecipients,
  addNotificationRecipient,
  removeNotificationRecipient,
  NOTIFICATION_EVENT_OPTIONS,
  type NotificationRecipient,
  type NotificationEvent,
} from "@/lib/api/notifications";

export function NotificationsManager() {
  const { token } = useAuth();
  const [recipients, setRecipients] = useState<NotificationRecipient[] | null>(null);
  const [drafts, setDrafts] = useState<Record<NotificationEvent, string>>({
    NEW_COMPANY: "",
    NEW_DRIVE: "",
    STUDENT_SELECTED: "",
  });
  const [submittingEvent, setSubmittingEvent] = useState<NotificationEvent | null>(null);

  async function refresh() {
    if (!token) return;
    try {
      setRecipients(await listNotificationRecipients(token));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load notification recipients");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAdd(event: NotificationEvent) {
    if (!token) return;
    const email = drafts[event].trim();
    if (!email) {
      toast.error("Enter an email first");
      return;
    }
    setSubmittingEvent(event);
    try {
      await addNotificationRecipient({ event, email }, token);
      setDrafts((prev) => ({ ...prev, [event]: "" }));
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't add recipient");
    } finally {
      setSubmittingEvent(null);
    }
  }

  async function handleRemove(id: string) {
    if (!token) return;
    try {
      await removeNotificationRecipient(id, token);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't remove recipient");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-bold">Email notifications</h2>
        <p className="text-sm text-muted-foreground">
          Choose who gets emailed when things happen — add as many addresses as you want per
          event.
        </p>
      </div>

      {recipients === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        NOTIFICATION_EVENT_OPTIONS.map((opt) => {
          const forEvent = recipients.filter((r) => r.event === opt.value);
          return (
            <Card key={opt.value} size="sm">
              <CardContent className="flex flex-col gap-3">
                <div>
                  <div className="text-sm font-bold">{opt.label}</div>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {forEvent.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No recipients configured.</p>
                  ) : (
                    forEvent.map((r) => (
                      <span
                        key={r.id}
                        className="flex items-center gap-1 rounded-full bg-accent/15 py-1 pr-1 pl-2.5 text-xs font-semibold text-accent"
                      >
                        {r.email}
                        <button
                          type="button"
                          onClick={() => handleRemove(r.id)}
                          aria-label={`Remove ${r.email}`}
                          className="rounded-full p-0.5 hover:bg-accent/20"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={drafts[opt.value]}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [opt.value]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAdd(opt.value);
                      }
                    }}
                    placeholder="name@example.com"
                    className="h-8 max-w-xs text-sm"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    disabled={submittingEvent === opt.value}
                    onClick={() => handleAdd(opt.value)}
                  >
                    <Plus />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
