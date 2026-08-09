import { apiFetch } from "./client";
import type { OfferType } from "./drives";

export type Placement = {
  id: string;
  universityId: string;
  userId: string;
  companyId: string;
  driveId: string | null;
  packageAmount: string | null;
  placedAt: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  drive: { id: string; title: string } | null;
  driveRole: { id: string; title: string; offerType: OfferType } | null;
  user: { id: string; name: string; email: string; placementLocked: boolean };
};

// academicYear (e.g. "2026-27") filters to placements made within that
// season — omit to get every placement regardless of season.
export function listPlacements(token: string, academicYear?: string) {
  const query = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : "";
  return apiFetch<Placement[]>(`/placements${query}`, { token });
}

export type MyPlacement = {
  id: string;
  userId: string;
  companyId: string;
  driveId: string | null;
  packageAmount: string | null;
  placedAt: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  drive: { id: string; title: string } | null;
  driveRole: { id: string; title: string; offerType: OfferType } | null;
};

export function listMyPlacements(token: string) {
  return apiFetch<MyPlacement[]>("/placements/me", { token });
}
