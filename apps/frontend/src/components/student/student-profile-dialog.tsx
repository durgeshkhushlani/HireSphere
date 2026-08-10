"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
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
import { RequiredDot } from "@/components/ui/required-dot";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { getMyProfile, updateMyProfile, type StudentProfile } from "@/lib/api/students";
import { uploadResumeToCloudinary } from "@/lib/cloudinary-upload";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export function StudentProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { token } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [tenth, setTenth] = useState("");
  const [twelfth, setTwelfth] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [uploadingResume, setUploadingResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  function syncFormState(p: StudentProfile) {
    setProfile(p);
    setStudentId(p.studentId ?? "");
    setTenth(p.tenthPercentage ?? "");
    setTwelfth(p.twelfthPercentage ?? "");
    setBloodGroup(p.bloodGroup ?? "");
    setAddress(p.address ?? "");
    setPhone(p.phone ?? "");
    setCustomValues(Object.fromEntries(p.customFields.map((f) => [f.id, f.value ?? ""])));
  }

  useEffect(() => {
    if (!open || !token) return;
    getMyProfile(token)
      .then(syncFormState)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Couldn't load your profile"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  if (!open) return null;

  const verified = profile?.verified ?? false;

  async function handleSave() {
    if (!token || !profile) return;
    setSaving(true);
    try {
      // null (not undefined) for a blanked field — undefined gets dropped by
      // JSON.stringify, which would make the server think the field was
      // never touched and silently keep the old value instead of rejecting
      // the blank as missing.
      const patch = verified
        ? { address: address || null, phone: phone || null }
        : {
            studentId: studentId || null,
            tenthPercentage: tenth === "" ? null : Number(tenth),
            twelfthPercentage: twelfth === "" ? null : Number(twelfth),
            bloodGroup: bloodGroup || null,
            address: address || null,
            phone: phone || null,
            customFieldValues: customValues,
          };
      const updated = await updateMyProfile(patch, token);
      syncFormState(updated);
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update your profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleResumeSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    if (file.type !== "application/pdf") {
      toast.error("Resume must be a PDF");
      return;
    }
    setUploadingResume(true);
    try {
      const url = await uploadResumeToCloudinary(file, token);
      const updated = await updateMyProfile({ resumeUrl: url }, token);
      syncFormState(updated);
      toast.success("Resume updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't upload resume");
    } finally {
      setUploadingResume(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{profile?.user.name ?? "Your profile"}</DialogTitle>
            <Badge variant={verified ? "default" : "outline"}>
              {verified ? "Verified" : "Not verified"}
            </Badge>
          </div>
          <DialogDescription>{profile?.user.email}</DialogDescription>
        </DialogHeader>

        {!profile ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Program" value={profile.program.name} />
              <Field label="University" value={profile.user.university.name} />
              <Field label="CGPA" value={profile.cgpa} />
              <Field label="Backlogs" value={profile.backlogCount} />
            </div>

            <div className="rounded-lg border p-3">
              <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Resume</Label>
              <div className="flex items-center justify-between gap-3">
                {profile.resumeUrl ? (
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-2"
                  >
                    <FileText className="size-4" /> View current resume ↗
                  </a>
                ) : (
                  <p className="text-xs text-destructive">
                    No resume on file — required before you can apply to any drive.
                  </p>
                )}
                {editing && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingResume}
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      <Upload /> {uploadingResume ? "Uploading…" : profile.resumeUrl ? "Update" : "Upload"}
                    </Button>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleResumeSelected}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {editing && !verified ? (
                <>
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Student ID <RequiredDot />
                    </Label>
                    <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      10th % <RequiredDot />
                    </Label>
                    <Input type="number" min={0} max={100} value={tenth} onChange={(e) => setTenth(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      12th % <RequiredDot />
                    </Label>
                    <Input type="number" min={0} max={100} value={twelfth} onChange={(e) => setTwelfth(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Blood group <RequiredDot />
                    </Label>
                    <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="O+" />
                  </div>
                </>
              ) : (
                <>
                  <Field label="Student ID" value={profile.studentId} />
                  <Field label="10th %" value={profile.tenthPercentage} />
                  <Field label="12th %" value={profile.twelfthPercentage} />
                  <Field label="Blood group" value={profile.bloodGroup} />
                </>
              )}

              {editing ? (
                <>
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Address {!verified && <RequiredDot />}
                    </Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                      Phone {!verified && <RequiredDot />}
                    </Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <Field label="Address" value={profile.address} />
                  <Field label="Phone" value={profile.phone} />
                </>
              )}
            </div>

            {profile.customFields.length > 0 && (
              <div>
                <Label className="mb-2 text-xs font-semibold text-muted-foreground">Additional details</Label>
                <div className="grid grid-cols-2 gap-4">
                  {profile.customFields.map((f) => (
                    <div key={f.id}>
                      {editing && !verified ? (
                        <>
                          <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                            {f.label}
                            {f.required && <RequiredDot />}
                          </Label>
                          {f.fieldType === "DROPDOWN" ? (
                            <Select
                              value={customValues[f.id] ?? ""}
                              onValueChange={(v) => v && setCustomValues((prev) => ({ ...prev, [f.id]: v }))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select…">
                                  {(value: string) => value || null}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {(f.options ?? []).map((o) => (
                                  <SelectItem key={o} value={o}>
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={f.fieldType === "NUMBER" ? "number" : f.fieldType === "DATE" ? "date" : "text"}
                              value={customValues[f.id] ?? ""}
                              onChange={(e) =>
                                setCustomValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                              }
                            />
                          )}
                        </>
                      ) : (
                        <Field label={f.label} value={f.value} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {verified && editing && (
              <p className="text-xs text-muted-foreground">
                Your profile is verified — only address and phone can be changed. Contact your
                placement cell for anything else.
              </p>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              {editing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (profile) syncFormState(profile);
                      setEditing(false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)}>Edit profile</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
