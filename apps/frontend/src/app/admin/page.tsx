"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useAuth } from "@/lib/auth-context";

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth?mode=login&role=admin");
    } else if (user.role !== "ADMIN") {
      router.replace("/student");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") return null;

  return (
    <DashboardShell roleLabel="Admin">
      <AdminDashboard />
    </DashboardShell>
  );
}
