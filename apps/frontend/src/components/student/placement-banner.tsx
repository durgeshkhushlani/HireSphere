import { PartyPopper } from "lucide-react";
import type { MyPlacement } from "@/lib/api/placements";

function formatPackage(amount: string | null) {
  if (amount == null) return null;
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function PlacementBanner({ placement }: { placement: MyPlacement }) {
  const packageLabel = formatPackage(placement.packageAmount);

  return (
    <div
      data-tour="placement-banner"
      className="mb-6 flex items-center gap-3 rounded-xl bg-primary px-5 py-4 text-primary-foreground"
    >
      <PartyPopper className="size-5 shrink-0" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-bold">
            You&apos;re placed at {placement.company.name}
            {placement.drive ? ` — ${placement.drive.title}` : ""}
          </div>
          {placement.driveRole && (
            <span className="shrink-0 rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-bold">
              {placement.driveRole.offerType === "JOB" ? "Job" : "Internship"}
            </span>
          )}
        </div>
        <div className="text-xs text-primary-foreground/85">
          {placement.driveRole ? `${placement.driveRole.title} · ` : ""}
          {packageLabel ? `${packageLabel} · ` : ""}
          {new Date(placement.placedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
