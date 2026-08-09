import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Shield, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import durtownLogo from "@/assets/durtown-logo.png.asset.json";
import durtownLogoDark from "@/assets/durtown-logo-dark.png.asset.json";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Brand({ size = "sm" }: { size?: "sm" | "lg" }) {
  const {
    site_name: name,
    logo_url: logo,
    logo_dark_url: logoDark,
  } = useSiteSettings();
  const cls =
    size === "lg"
      ? "text-2xl sm:text-4xl md:text-5xl"
      : "truncate text-base sm:text-xl";
  const imgCls = size === "lg" ? "h-16 sm:h-24 md:h-28" : "h-9 sm:h-10";

  // Admin-uploaded logo wins; otherwise the durtown wordmark (light/dark variants).
  if (!logo) {
    return (
      <span className="inline-flex min-w-0 items-center justify-center">
        <img
          src={durtownLogo.url}
          alt={name}
          className={`${imgCls} w-auto shrink-0 dark:hidden`}
        />
        <img
          src={durtownLogoDark.url}
          alt={name}
          className={`${imgCls} hidden w-auto shrink-0 dark:block`}
        />
      </span>
    );
  }

  // Admin logo, with an optional dedicated dark-mode variant.
  if (logoDark) {
    return (
      <span className="inline-flex min-w-0 items-center justify-center">
        <img src={logo} alt={name} className={`${imgCls} w-auto shrink-0 dark:hidden`} />
        <img
          src={logoDark}
          alt={name}
          className={`${imgCls} hidden w-auto shrink-0 dark:block`}
        />
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center justify-center gap-2">
      <img src={logo} alt={name} className={`${imgCls} w-auto shrink-0`} />
      <span
        className={`font-extrabold tracking-tight text-foreground ${cls}`}
      >
        {name}
      </span>
    </span>
  );
}

export function SiteHeader() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-w-0 shrink items-center gap-1 sm:gap-2">
      <ThemeToggle />
      {loading ? null : user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 rounded-full">
              <UserRound className="size-4" />
              <span className="max-w-32 truncate text-xs">{user.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="gap-2">
                <LayoutDashboard className="size-4" />
                أنشطتي
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile" className="gap-2">
                <UserRound className="size-4" />
                الملف الشخصي
              </Link>
            </DropdownMenuItem>

            {isAdmin ? (
              <DropdownMenuItem asChild>
                <Link to="/admin" className="gap-2">
                  <Shield className="size-4" />
                  لوحة الإدارة
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="gap-2">
              <LogOut className="size-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full px-2 text-xs sm:px-3 sm:text-sm"
          >
            <Link to="/auth">دخول</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-3 text-xs sm:text-sm">
            <Link to="/auth">
              <span className="sm:hidden">أضف</span>
              <span className="hidden sm:inline">أضف نشاطك</span>
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  const { tagline } = useSiteSettings();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
          <Link to="/" className="min-w-0 shrink">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Link
              to="/events"
              search={{ city: "", gov: "", kind: "", when: "upcoming", page: 1 }}
              className="rounded-full px-3 py-1.5 hover:bg-muted"
              activeProps={{ className: "rounded-full px-3 py-1.5 bg-muted font-semibold" }}
            >
              العروض والأحداث
            </Link>
            <Link
              to="/lists"
              className="rounded-full px-3 py-1.5 hover:bg-muted"
              activeProps={{ className: "rounded-full px-3 py-1.5 bg-muted font-semibold" }}
            >
              القوائم
            </Link>
            <Link
              to="/discover"
              search={{ city: "", gov: "", good: "", vibe: "", price: 0, seed: 1 }}
              className="rounded-full px-3 py-1.5 hover:bg-muted"
              activeProps={{ className: "rounded-full px-3 py-1.5 bg-muted font-semibold" }}
            >
              🎲 اكتشف
            </Link>
          </nav>
          <SiteHeader />
        </div>
      </header>

      {children}
      <footer className="mt-16 border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground">
          <Brand />
          <p>{tagline} — durtown.com</p>
        </div>
      </footer>
    </div>
  );
}
