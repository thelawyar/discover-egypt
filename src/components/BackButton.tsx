import { ArrowRight } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** Back button for admin pages: uses browser history, falls back to a route. */
export function BackButton({
  fallback = "/",
  label = "رجوع",
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.history.back();
        } else {
          router.navigate({ to: fallback });
        }
      }}
    >
      <ArrowRight className="size-3.5" /> {label}
    </Button>
  );
}
