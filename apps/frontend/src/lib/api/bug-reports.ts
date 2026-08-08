import { apiFetch } from "./client";

export type BugReportCategory =
  | "ADMIN_VIEW"
  | "STUDENT_VIEW"
  | "HOME_PAGE"
  | "AUTH_FLOW"
  | "OTHER";

export const BUG_REPORT_CATEGORY_OPTIONS: { value: BugReportCategory; label: string }[] = [
  { value: "ADMIN_VIEW", label: "Admin view" },
  { value: "STUDENT_VIEW", label: "Student view" },
  { value: "HOME_PAGE", label: "Home page" },
  { value: "AUTH_FLOW", label: "Signup or login flow" },
  { value: "OTHER", label: "Other" },
];

export function submitBugReport(input: {
  name?: string;
  email: string;
  description: string;
  category: BugReportCategory;
}) {
  return apiFetch<{ message: string }>("/bug-reports/submit", {
    method: "POST",
    body: input,
  });
}
