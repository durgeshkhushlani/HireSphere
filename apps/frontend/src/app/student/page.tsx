"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StudentDashboard } from "@/components/student/student-dashboard";
import { useAuth } from "@/lib/auth-context";

export default function StudentDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth?mode=login&role=student");
    } else if (user.role !== "STUDENT") {
      router.replace("/admin");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "STUDENT") return null;

  return (
    <DashboardShell roleLabel="Student">
      <StudentDashboard />
    </DashboardShell>
  );
}
