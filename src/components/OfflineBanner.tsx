import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** True when the browser reports an active connection. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/** Sticky bar telling the user they're browsing a cached copy of the directory. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-xs font-bold text-warning-foreground"
    >
      <WifiOff className="size-4 shrink-0" />
      لا يوجد اتصال بالإنترنت — تتصفح الآن نسخة محفوظة، وبعض النتائج قد تكون قديمة.
    </div>
  );
}
