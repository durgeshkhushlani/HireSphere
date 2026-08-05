"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  listStudents,
  listFieldDefinitions,
  createFieldDefinition,
  deleteFieldDefinition,
  type StudentRosterEntry,
  type FieldDefinition,
  type StudentFieldType,
} from "@/lib/api/students";
import { StudentDetailDialog } from "./student-detail-dialog";
import { SearchInput } from "@/components/ui/search-input";

const FIELD_TYPE_LABELS: Record<StudentFieldType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DROPDOWN: "Dropdown",
  DATE: "Date",
};

function FieldDefinitionsManager() {
  const { token } = useAuth();
  const [definitions, setDefinitions] = useState<FieldDefinition[] | null>(null);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<StudentFieldType>("TEXT");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    if (!token) return;
    try {
      setDefinitions(await listFieldDefinitions(token));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load fields");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAdd() {
    if (!token) return;
    if (!label.trim()) {
      toast.error("Enter a field label");
      return;
    }
    const options = optionsText
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (fieldType === "DROPDOWN" && options.length === 0) {
      toast.error("Enter at least one comma-separated option");
      return;
    }
    setSubmitting(true);
    try {
      await createFieldDefinition(
        { label: label.trim(), fieldType, required, options: fieldType === "DROPDOWN" ? options : undefined },
        token
      );
      toast.success("Field added");
      setLabel("");
      setFieldType("TEXT");
      setRequired(false);
      setOptionsText("");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't add field");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    try {
      await deleteFieldDefinition(id, token);
      toast.success("Field removed");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't remove field");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-bold">Custom profile fields</h2>
      <p className="text-sm text-muted-foreground">
        Fields shown here appear on every student&apos;s profile at your university.
      </p>

      <Card size="sm">
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Hostel name" />
          </div>
          <div className="min-w-[140px]">
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">Type</Label>
            <Select value={fieldType} onValueChange={(v) => v && setFieldType(v as StudentFieldType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FIELD_TYPE_LABELS) as StudentFieldType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fieldType === "DROPDOWN" && (
            <div className="min-w-[220px] flex-1">
              <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                Options (comma-separated)
              </Label>
              <Input
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="S, M, L, XL"
              />
            </div>
          )}
          <label className="flex items-center gap-1.5 pb-2 text-sm font-semibold">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required
          </label>
          <Button onClick={handleAdd} disabled={submitting}>
            <Plus /> Add field
          </Button>
        </CardContent>
      </Card>

      {definitions === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : definitions.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          No custom fields yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {definitions.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{d.label}</span>
                <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[d.fieldType]}</span>
                {d.required && <Badge variant="outline">Required</Badge>}
                {d.fieldType === "DROPDOWN" && d.options && (
                  <span className="text-xs text-muted-foreground">({d.options.join(", ")})</span>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(d.id)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentRoster() {
  const { token } = useAuth();
  const [students, setStudents] = useState<StudentRosterEntry[] | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function refresh() {
    if (!token) return;
    try {
      setStudents(await listStudents(token));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load students");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-bold">Students</h2>

      {students === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : students.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          No students registered yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name or student ID…" />
          <div className="flex flex-col gap-2">
          {students
            .filter((s) => {
              const q = query.toLowerCase();
              return (
                s.user.name.toLowerCase().includes(q) ||
                s.user.email.toLowerCase().includes(q) ||
                (s.studentId ?? "").toLowerCase().includes(q)
              );
            })
            .map((s) => (
            <div key={s.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5">
              <div>
                <div className="text-sm font-bold">{s.user.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.studentId ? `${s.studentId} · ` : ""}
                  {s.user.email} · {s.program.name} · CGPA {s.cgpa}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={s.verified ? "default" : "outline"}>
                  {s.verified ? "Verified" : "Not verified"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDetailUserId(s.userId);
                    setDetailOpen(true);
                  }}
                >
                  View details
                </Button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      <StudentDetailDialog
        userId={detailUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onVerifiedChange={refresh}
      />
    </div>
  );
}

export function StudentsManager() {
  return (
    <div className="flex flex-col gap-8">
      <FieldDefinitionsManager />
      <StudentRoster />
    </div>
  );
}
