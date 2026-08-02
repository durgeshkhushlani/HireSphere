import { AuthFlow } from "@/components/auth/auth-flow";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; role?: string }>;
}) {
  const { mode, role } = await searchParams;

  return (
    <AuthFlow
      initialMode={mode === "signup" ? "signup" : "login"}
      initialRole={role === "admin" ? "admin" : "student"}
    />
  );
}
