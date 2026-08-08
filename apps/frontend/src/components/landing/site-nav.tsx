import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AdoptHireSphereButton } from "./adopt-hiresphere-button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "#for-universities", label: "For Universities" },
  { href: "#for-students", label: "For Students" },
  { href: "#how-it-works", label: "How it works" },
];

export function SiteNav() {
  return (
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/brand/icon.png" alt="HireSphere" width={34} height={34} className="rounded-[9px]" />
        <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
          HireSphere
        </span>
      </Link>

      <div className="hidden items-center gap-6 md:flex">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        <AdoptHireSphereButton />
        <Button variant="outline" nativeButton={false} render={<Link href="/demo" />}>
          Try it out
        </Button>
        <Button variant="ghost" nativeButton={false} render={<Link href="/auth?mode=login" />}>
          Log in
        </Button>
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          nativeButton={false}
          render={<Link href="/auth?mode=signup" />}
        >
          Get started
        </Button>
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <ThemeToggle />
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right">
          <SheetHeader>
            <SheetTitle className="font-heading">HireSphere</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t pt-4">
              <AdoptHireSphereButton className="w-full" />
              <Button variant="outline" nativeButton={false} render={<Link href="/demo" />}>
                Try it out
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/auth?mode=login" />}
              >
                Log in
              </Button>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                nativeButton={false}
                render={<Link href="/auth?mode=signup" />}
              >
                Get started
              </Button>
            </div>
          </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
