import { apiFetch } from "./client";

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
  user: { id: string; name: string; email: string; placementLocked: boolean };
};

export function listPlacements(token: string) {
  return apiFetch<Placement[]>("/placements", { token });
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
};

export function listMyPlacements(token: string) {
  return apiFetch<MyPlacement[]>("/placements/me", { token });
}
