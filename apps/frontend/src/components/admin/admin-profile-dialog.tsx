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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { getMe, type MyProfile } from "@/lib/api/auth";
import { updateMyUniversity } from "@/lib/api/universities";

// Native, no external API call needed — Intl ships the full IANA zone
// database and stays in sync with it automatically.
const TIMEZONES: string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Asia/Kolkata", "UTC"];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function AdminProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { token } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [placementLockEnabled, setPlacementLockEnabled] = useState(true);

  function syncForm(p: MyProfile) {
    setProfile(p);
    setContactEmail(p.university.contactEmail ?? "");
    setContactPhone(p.university.contactPhone ?? "");
    setTimezone(p.university.timezone);
    setPlacementLockEnabled(p.university.placementLockEnabled);
  }

  useEffect(() => {
    if (!open || !token) return;
    getMe(token)
      .then(syncForm)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't load your profile"));
  }, [open, token]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      await updateMyUniversity({ contactEmail, contactPhone, timezone, placementLockEnabled }, token);
      const refreshed = await getMe(token);
      syncForm(refreshed);
      setEditing(false);
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-8">
            <div>
              <DialogTitle>{profile?.name ?? "Your profile"}</DialogTitle>
              <DialogDescription>{profile?.email}</DialogDescription>
            </div>
            {profile && !editing && (
              <Button size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {!profile ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="text-sm font-bold">{profile.university.name}</div>
                <Badge variant={profile.university.verified ? "default" : "outline"}>
                  {profile.university.verified ? "Verified" : "Not verified"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Domain" value={profile.university.domain} />
                <Field label="Role" value="Placement Admin" />
                <Field label="Contact name" value={profile.university.contactName} />

                {editing ? (
                  <>
                    <div>
                      <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                        Contact email
                      </Label>
                      <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                        Contact phone
                      </Label>
                      <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                        Time zone
                      </Label>
                      <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue>{(value: string) => value}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Governs how interview slot times are entered and displayed everywhere at
                        your university.
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={placementLockEnabled}
                          onChange={(e) => setPlacementLockEnabled(e.target.checked)}
                          className="size-4 rounded border-input"
                        />
                        Placement lock
                      </label>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Enabling this lets you lock any placed student from sitting in further
                        drives, from the Placements tab. Leave this off if your university allows
                        placed students to keep applying for a better offer.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="Contact email" value={profile.university.contactEmail} />
                    <Field label="Contact phone" value={profile.university.contactPhone} />
                    <Field label="Time zone" value={profile.university.timezone} />
                    <Field
                      label="Placement lock"
                      value={profile.university.placementLockEnabled ? "Enabled" : "Disabled"}
                    />
                  </>
                )}
              </div>
            </div>

            {editing && (
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    syncForm(profile);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
