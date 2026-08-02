"use client";

import { useAuth } from "@/lib/auth-context";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  return (
    <div className="p-10">
      <h1 className="text-2xl font-extrabold">Welcome, {user?.name ?? "student"}</h1>
      <p className="mt-2 text-muted-foreground">Student dashboard — under construction.</p>
    </div>
  );
}
