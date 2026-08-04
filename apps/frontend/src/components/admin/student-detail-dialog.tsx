"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { getStudentProfile, setStudentVerified, type StudentProfile } from "@/lib/api/students";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function StudentDetailDialog({
  userId,
  open,
  onOpenChange,
  onVerifiedChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerifiedChange: () => void;
}) {
  const { token } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !userId || !token) {
      setProfile(null);
      return;
    }
    getStudentProfile(userId, token)
      .then(setProfile)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't load this student's profile"));
  }, [open, userId, token]);

  async function handleToggleVerified() {
    if (!token || !profile) return;
    setSubmitting(true);
    try {
      const updated = await setStudentVerified(profile.userId, !profile.verified, token);
      setProfile((prev) => (prev ? { ...prev, verified: updated.verified } : prev));
      toast.success(updated.verified ? "Student verified" : "Marked as not verified");
      onVerifiedChange();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update verification status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{profile?.user.name ?? "Student details"}</DialogTitle>
            {profile && (
              <Badge variant={profile.verified ? "default" : "outline"}>
                {profile.verified ? "Verified" : "Not verified"}
              </Badge>
            )}
          </div>
          <DialogDescription>{profile?.user.email}</DialogDescription>
        </DialogHeader>

        {!profile ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Program" value={profile.program.name} />
              <Field label="CGPA" value={profile.cgpa} />
              <Field label="Backlogs" value={profile.backlogCount} />
              <Field label="Placement locked" value={profile.placementLocked ? "Yes" : "No"} />
              <Field label="10th %" value={profile.tenthPercentage} />
              <Field label="12th %" value={profile.twelfthPercentage} />
              <Field label="Blood group" value={profile.bloodGroup} />
              <Field label="Phone" value={profile.phone} />
              <Field label="Address" value={profile.address} />
            </div>

            {profile.customFields.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">Additional details</div>
                <div className="grid grid-cols-2 gap-4">
                  {profile.customFields.map((f) => (
                    <Field key={f.id} label={f.label} value={f.value} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t pt-4">
              <Button onClick={handleToggleVerified} disabled={submitting}>
                {submitting ? "Updating…" : profile.verified ? "Unverify" : "Verify"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
