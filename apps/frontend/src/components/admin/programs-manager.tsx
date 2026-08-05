"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import {
  listAllPrograms,
  listUniversityPrograms,
  createProgram,
  linkUniversityProgram,
  type Program,
} from "@/lib/api/universities";
import { SearchInput } from "@/components/ui/search-input";

const NEW_PROGRAM = "__new__";

export function ProgramsManager() {
  const { token, user } = useAuth();
  const [linked, setLinked] = useState<Program[] | null>(null);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [selected, setSelected] = useState("");
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  async function refresh() {
    if (!user) return;
    try {
      const [own, all] = await Promise.all([
        listUniversityPrograms(user.universityId),
        listAllPrograms(),
      ]);
      setLinked(own);
      setAllPrograms(all);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load programs");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.universityId]);

  const linkedIds = new Set((linked ?? []).map((p) => p.id));
  const availablePrograms = allPrograms.filter((p) => !linkedIds.has(p.id));

  async function handleAdd() {
    if (!token) return;
    if (!selected) {
      toast.error("Select a program");
      return;
    }
    setSubmitting(true);
    try {
      let programId = selected;
      if (selected === NEW_PROGRAM) {
        if (!newName.trim()) {
          toast.error("Enter a program name");
          return;
        }
        const program = await createProgram(newName.trim());
        programId = program.id;
      }
      await linkUniversityProgram(programId, token);
      toast.success("Program added");
      setSelected("");
      setNewName("");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't add program");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card size="sm">
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Program
            </Label>
            <Select value={selected} onValueChange={(value) => setSelected(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {availablePrograms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_PROGRAM}>+ Add a new program</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selected === NEW_PROGRAM && (
            <div className="min-w-[200px] flex-1">
              <Label className="mb-1.5 text-xs font-semibold text-muted-foreground">
                New program name
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Computer Science"
              />
            </div>
          )}

          <Button onClick={handleAdd} disabled={submitting || !selected}>
            {submitting ? "Adding…" : "Add"}
          </Button>
        </CardContent>
      </Card>

      {linked === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : linked.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No programs added yet — students can&apos;t sign up until at least one exists.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search programs…" />
          <div className="flex flex-wrap gap-2">
            {linked
              .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
              .map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold"
                >
                  {p.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
