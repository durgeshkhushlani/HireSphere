import { apiFetch } from "./client";

export type NotificationEvent = "NEW_COMPANY" | "NEW_DRIVE" | "STUDENT_SELECTED";

export const NOTIFICATION_EVENT_OPTIONS: {
  value: NotificationEvent;
  label: string;
  description: string;
}[] = [
  {
    value: "NEW_COMPANY",
    label: "New company added",
    description: "Sent whenever an admin adds a company to the catalog.",
  },
  {
    value: "NEW_DRIVE",
    label: "New drive created",
    description: "Sent whenever a new hiring drive is created.",
  },
  {
    value: "STUDENT_SELECTED",
    label: "Student selected",
    description: "Sent whenever a student is marked Selected for a drive.",
  },
];

export type NotificationRecipient = {
  id: string;
  universityId: string;
  event: NotificationEvent;
  email: string;
};

export function listNotificationRecipients(token: string) {
  return apiFetch<NotificationRecipient[]>("/notification-recipients", { token });
}

export function addNotificationRecipient(
  input: { event: NotificationEvent; email: string },
  token: string
) {
  return apiFetch<NotificationRecipient>("/notification-recipients", {
    method: "POST",
    body: input,
    token,
  });
}

export function removeNotificationRecipient(id: string, token: string) {
  return apiFetch<void>(`/notification-recipients/${id}`, { method: "DELETE", token });
}
