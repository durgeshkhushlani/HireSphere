// Status-badge palette ported from the design mockup. Data-driven (varies
// per row), so it's easiest to keep as a lookup returning inline styles
// rather than fighting Tailwind's arbitrary-value syntax for oklch() with
// spaces in it.
export type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "OA_TEST"
  | "INTERVIEW"
  | "SELECTED"
  | "NOT_SELECTED";

export type DriveStatus = "DRAFT" | "OPEN" | "CLOSED";

const APPLICATION_STATUS_STYLES: Record<
  ApplicationStatus,
  { bg: string; fg: string; label: string }
> = {
  APPLIED: { bg: "oklch(0.94 0.004 255)", fg: "oklch(0.4 0.01 255)", label: "Applied" },
  SHORTLISTED: {
    bg: "oklch(0.95 0.035 195)",
    fg: "oklch(0.4 0.09 195)",
    label: "Shortlisted",
  },
  OA_TEST: { bg: "oklch(0.95 0.045 80)", fg: "oklch(0.48 0.1 80)", label: "OA/Test" },
  INTERVIEW: {
    bg: "oklch(0.93 0.05 195)",
    fg: "oklch(0.35 0.09 195)",
    label: "Interview",
  },
  SELECTED: { bg: "oklch(0.5 0.1 195)", fg: "oklch(0.99 0.01 195)", label: "Selected" },
  NOT_SELECTED: {
    bg: "oklch(0.95 0.035 25)",
    fg: "oklch(0.45 0.1 25)",
    label: "Not Selected",
  },
};

const DRIVE_STATUS_STYLES: Record<DriveStatus, { bg: string; fg: string; label: string }> =
  {
    DRAFT: { bg: "oklch(0.95 0.045 80)", fg: "oklch(0.48 0.1 80)", label: "Draft" },
    OPEN: { bg: "oklch(0.95 0.03 195)", fg: "oklch(0.4 0.09 195)", label: "Open" },
    CLOSED: { bg: "oklch(0.93 0.004 255)", fg: "oklch(0.48 0.012 255)", label: "Closed" },
  };

export function applicationStatusStyle(status: ApplicationStatus) {
  const s = APPLICATION_STATUS_STYLES[status];
  return { style: { background: s.bg, color: s.fg }, label: s.label };
}

export function driveStatusStyle(status: DriveStatus) {
  const s = DRIVE_STATUS_STYLES[status];
  return { style: { background: s.bg, color: s.fg }, label: s.label };
}

export const APPLICATION_STATUS_OPTIONS: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "OA_TEST",
  "INTERVIEW",
  "SELECTED",
  "NOT_SELECTED",
];
