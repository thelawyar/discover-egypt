import { useEffect, useRef } from "react";

export type MapPoint = {
  id: string;
  name: string;
  username: string;
  latitude: number;
  longitude: number;
};

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

function ensureLeafletCss() {
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS;
  document.head.appendChild(link);
}

/**
 * Client-only Leaflet map showing nearby places inside a city portal.
 * Leaflet is imported dynamically so it never runs during SSR.
 */
export function CityMap({ points, cityName }: { points: MapPoint[]; cityName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      if (!containerRef.current || points.length === 0) return;
      ensureLeafletCss();
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<span style="display:block;width:14px;height:14px;border-radius:9999px;background:hsl(var(--primary));border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const bounds = L.latLngBounds([]);
      points.forEach((p) => {
        const marker = L.marker([p.latitude, p.longitude], { icon }).addTo(map);
        marker.bindPopup(
          `<a href="/${p.username}" style="font-weight:700">${p.name}</a>`,
        );
        bounds.extend([p.latitude, p.longitude]);
      });
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });

      cleanup = () => map.remove();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [points]);

  if (!points.length) return null;

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={`خريطة أماكن في ${cityName}`}
      className="h-[340px] w-full overflow-hidden rounded-2xl border border-border bg-muted"
    />
  );
}

export default CityMap;
