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

export function Brand({ size = "sm" }: { size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-4xl sm:text-5xl" : "text-xl";
  const imgCls = size === "lg" ? "h-20 sm:h-24" : "h-9";
  return (
    <span className="inline-flex items-center gap-2">
      <img src={townLogo.url} alt="اكتشف مدينتك" className={`${imgCls} w-auto`} />
      <span className={`font-extrabold tracking-tight text-foreground ${cls}`}>اكتشف مدينتك</span>
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
    <div className="flex items-center gap-2">
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
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/auth">تسجيل الدخول</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/auth">أضف نشاطك</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="shrink-0">
            <Brand />
          </Link>
          <SiteHeader />
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground">
          <Brand />
          <p>دليل تجاري شامل لكل المدن المصرية — durtown.com</p>
        </div>
      </footer>
    </div>
  );
}
