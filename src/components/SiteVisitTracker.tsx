import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function visitorId(): string {
  try {
    let id = localStorage.getItem("dt_vid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("dt_vid", id);
    }
    return id;
  } catch {
    return "";
  }
}

function referrerSource(): string {
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host === window.location.hostname) return "internal";
    if (/google\./.test(host)) return "google";
    if (/facebook\.|fb\./.test(host)) return "facebook";
    if (/instagram\./.test(host)) return "instagram";
    if (/whatsapp|wa\.me/.test(host)) return "whatsapp";
    return host.slice(0, 60);
  } catch {
    return "direct";
  }
}

/** Records one visit per page navigation for the admin visit counter. */
export function SiteVisitTracker() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const first = useRef(true);
  useEffect(() => {
    const source = first.current ? referrerSource() : "internal";
    first.current = false;
    void supabase.rpc("track_site_visit", { _path: path, _visitor: visitorId(), _source: source });
  }, [path]);
  return null;
}
