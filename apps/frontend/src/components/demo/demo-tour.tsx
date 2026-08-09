"use client";

import { useEffect } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./demo-tour.css";
import { getDemoSession } from "@/lib/demo-session";

// Same {admin, student}-id lookup DemoBanner uses for its switch target,
// just also returning a session-stable key (shared by both roles) so the
// general steps can be tracked independently of which specific role dismissed
// them — null means this user isn't part of an active demo session at all.
function resolveDemoContext(
  userId: string | undefined
): { role: "ADMIN" | "STUDENT"; sessionKey: string } | null {
  const session = getDemoSession();
  if (!session || !userId) return null;
  const sessionKey = `${session.admin.user.id}_${session.student.user.id}`;
  if (session.admin.user.id === userId) return { role: "ADMIN", sessionKey };
  if (session.student.user.id === userId) return { role: "STUDENT", sessionKey };
  return null;
}

// Points at the real, already-rendered elements (see the data-tour="..."
// attributes scattered across dashboard-shell.tsx, demo-banner.tsx,
// chat-widget.tsx, admin-dashboard.tsx, student-dashboard.tsx, etc.) rather
// than describing them in a floating modal — so a first-time visitor sees
// exactly what's being talked about, not just a paragraph about it.
//
// Three independently-dismissed tiers: GENERAL (shared by both roles, shown
// once per demo session regardless of which role you enter first), and
// ADMIN/STUDENT (shown once per role — so switching to a role you haven't
// toured yet still shows that role's cards, instead of either repeating the
// general cards or never showing the other role's cards at all).
const GENERAL_STEPS: DriveStep[] = [
  {
    popover: {
      title: "Welcome to HireSphere",
      description:
        "This is a fully working demo, pre-loaded with sample drives, applicants, and placements. Nothing you do here is saved permanently.",
    },
  },
  {
    element: '[data-tour="role-badge"]',
    popover: {
      title: "You're viewing this as this role",
      description: "Everything on screen right now is scoped to this role's view of the demo.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="demo-switch"]',
    popover: {
      title: "Switch sides anytime",
      description:
        "Jump to the other role's view to see the same demo data from the other side — as the placement cell running it, or as a student living through it.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="academic-year"]',
    popover: {
      title: "Placement seasons run July to June",
      description:
        "This shows the current academic year by default so the season stays focused — nothing from a previous year is ever deleted, and admins can switch back to see it anytime with this same picker.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="chat-bubble"]',
    popover: {
      title: "Ask the built-in assistant anything",
      description:
        "It can answer real questions about this demo's data — eligibility rules, drive details, even live stats.",
      side: "left",
    },
  },
];

const ADMIN_STEPS: DriveStep[] = [
  {
    element: '[data-tour="tab-drives"]',
    popover: {
      title: "Drives",
      description:
        "Create a hiring drive, define one or more roles with CTC/stipend, and move it from Draft to Open when you're ready for applications.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="new-drive-button"]',
    popover: {
      title: "Create a drive",
      description: "At least one role is required — a drive nobody can apply to a specific position under isn't much use.",
      side: "left",
    },
    disableActiveInteraction: true,
  },
  {
    element: '[data-tour="tab-applicants"]',
    popover: {
      title: "Applicants",
      description:
        "Review every applicant to a drive, update status individually, or bulk-schedule interviews and bulk-select a whole shortlist into the same role at once.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="tab-placements"]',
    popover: {
      title: "Placements",
      description:
        "See who's been placed, split by Job vs Internship with separate average CTC and stipend, and lock a placed student from further applications if your policy requires it.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="tab-companies"]',
    popover: {
      title: "Companies",
      description: "Maintain your company directory — it feeds straight into every drive you create.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="tab-notifications"]',
    popover: {
      title: "Notifications",
      description: "Subscribe any email address to be notified on new drives, new companies, or a student getting selected.",
      side: "bottom",
    },
  },
];

const STUDENT_STEPS: DriveStep[] = [
  {
    element: '[data-tour="tab-browse-drives"]',
    popover: {
      title: "Browse Drives",
      description:
        "See every drive currently open at your university, plus which programs it's eligible for — right in the details view, before you even apply.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="placement-banner"]',
    popover: {
      title: "Your placement, front and center",
      description: "Once you're placed, this banner shows your company, role type (Job or Internship), and package.",
      side: "bottom",
    },
    skipMissingElement: true,
  },
  {
    element: '[data-tour="tab-my-applications"]',
    popover: {
      title: "My Applications",
      description: "Track every application's status in real time, from Applied all the way to Selected or Not Selected.",
      side: "bottom",
    },
  },
];

export function DemoTour({ userId }: { userId: string | undefined }) {
  useEffect(() => {
    const context = resolveDemoContext(userId);
    if (!context) return;
    const { role, sessionKey } = context;

    // generalKey is shared by both roles within one demo session (startDemo()
    // mints fresh ids, so a new demo always gets the general steps again).
    // roleKey is per-user, i.e. per role within that session.
    const generalKey = `hiresphere.tour.general.${sessionKey}`;
    const roleKey = `hiresphere.tour.role.${userId}`;
    const showGeneral = !localStorage.getItem(generalKey);
    const showRole = !localStorage.getItem(roleKey);
    if (!showGeneral && !showRole) return;

    const steps = [
      ...(showGeneral ? GENERAL_STEPS : []),
      ...(showRole ? (role === "ADMIN" ? ADMIN_STEPS : STUDENT_STEPS) : []),
    ];
    const tour = driver({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.6,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Get started",
      steps,
      // Any way of leaving the tour — Next through the end, the X, ESC, or
      // an overlay click — counts as "seen it"; it never reappears uninvited.
      // Only the tiers actually included in this run get marked, so e.g.
      // skipping mid-way through general steps doesn't also silently mark a
      // not-yet-shown role tier as dismissed.
      onDestroyed: () => {
        if (showGeneral) localStorage.setItem(generalKey, "1");
        if (showRole) localStorage.setItem(roleKey, "1");
      },
    });

    // Tab content, the chat bubble, etc. are already in the DOM by the time
    // this effect runs (post-render) — a short delay just lets layout/fonts
    // settle so the very first highlight doesn't visibly jump.
    const timer = setTimeout(() => tour.drive(), 300);
    return () => {
      clearTimeout(timer);
      tour.destroy();
    };
  }, [userId]);

  return null;
}
