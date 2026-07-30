import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

/** Light/dark switch — remembers the user's choice and follows the system by default. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, setMode } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الليلي"}
      title={isDark ? "الوضع الفاتح" : "الوضع الليلي"}
      className={`rounded-full ${className}`}
      onClick={() => setMode(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
