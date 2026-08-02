"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

function initialsFor(name: string | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function DashboardShell({
  roleLabel,
  children,
}: {
  roleLabel: string;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-card px-6 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand/icon.png"
            alt="HireSphere"
            width={30}
            height={30}
            className="rounded-[8px]"
          />
          <span className="font-heading text-base font-extrabold">HireSphere</span>
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {roleLabel}
          </span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="flex items-center gap-2.5" />}>
            <span className="text-sm font-semibold">{user?.name}</span>
            <Avatar size="sm">
              <AvatarFallback>{initialsFor(user?.name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  );
}
