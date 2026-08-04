"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMe } from "@/lib/api/auth";

// Module-level cache: the timezone rarely changes and every consumer on a
// page needs the same value, so one fetch per session is enough rather than
// one per component instance.
let cached: Promise<string> | null = null;

export function useUniversityTimezone(): string {
  const { token } = useAuth();
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  useEffect(() => {
    if (!token) return;
    if (!cached) {
      cached = getMe(token)
        .then((p) => p.university.timezone)
        .catch(() => "Asia/Kolkata");
    }
    cached.then(setTimezone);
  }, [token]);

  return timezone;
}
