"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Drive } from "@/lib/api/drives";

function formatAmount(amount: string | null, suffix: string) {
  if (amount == null) return null;
  return `₹${Number(amount).toLocaleString("en-IN")}${suffix}`;
}

export function DriveDetailsDialog({ drive }: { drive: Drive }) {
  const [selectedRoleId, setSelectedRoleId] = useState(drive.roles[0]?.id ?? "");
  const selectedRole = drive.roles.find((r) => r.id === selectedRoleId) ?? drive.roles[0];

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Details</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{drive.title}</DialogTitle>
          <DialogDescription>{drive.company.name}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {drive.description && (
            <p className="text-sm text-muted-foreground">{drive.description}</p>
          )}

          {drive.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles have been added yet.</p>
          ) : (
            <>
              {drive.roles.length > 1 && (
                <Select
                  value={selectedRoleId}
                  onValueChange={(value) => value && setSelectedRoleId(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => drive.roles.find((r) => r.id === value)?.title}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {drive.roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedRole && (
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold">{selectedRole.title}</div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                      {selectedRole.offerType === "JOB" ? "Job" : "Internship"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-primary">
                    {selectedRole.offerType === "JOB"
                      ? formatAmount(selectedRole.ctcAmount, " CTC")
                      : formatAmount(selectedRole.stipendAmount, "/mo stipend")}
                  </div>
                  <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">
                    {selectedRole.description}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
