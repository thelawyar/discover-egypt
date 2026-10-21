import { SiteVisitTracker } from "@/components/SiteVisitTracker";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { BrandingStyles, siteSettingsQuery } from "@/hooks/useSiteSettings";
import { NotFoundPage } from "@/components/NotFoundPage";
import { ThemeProvider, themeBootstrapScript } from "@/hooks/useTheme";
import { OfflineBanner } from "@/components/OfflineBanner";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { registerServiceWorker } from "@/lib/register-sw";

function NotFoundComponent() {
  return <NotFoundPage />;
}


function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Load branding on the server so the correct logo/name/colors are in the
  // first paint instead of flashing the defaults.
  loader: async ({ context }) => {
    const settings = await context.queryClient.ensureQueryData(siteSettingsQuery);
    return { iconUrl: settings.icon_url };
  },
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "google-site-verification",
        content: "Th541QFsYOebss9FJallNEtEVDihgKYKUEHLFIjjf4c",
      },

      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#1a73e8" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "اكتشف مدينتك" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
      },
      { title: "اكتشف مدينتك | دليل تجاري شامل للمدن المصرية" },
      {
        name: "description",
        content:
          "ابحث عن أي نشاط تجاري في مدينتك: عيادات، محلات، مصانع، مدارس وأكثر.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "اكتشف مدينتك" },
      { property: "og:locale", content: "ar_EG" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700&family=Almarai:wght@400;700&family=Amiri:wght@400;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: (loaderData as { iconUrl?: string | null } | undefined)?.iconUrl ?? "/favicon.png", type: "image/png" },
      {
        rel: "icon",
        href: (loaderData as { iconUrl?: string | null } | undefined)?.iconUrl ?? "/app-icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        rel: "apple-touch-icon",
        href: (loaderData as { iconUrl?: string | null } | undefined)?.iconUrl ?? "/apple-touch-icon.png",
        sizes: "180x180",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      // PWA splash screens (iOS shows these while the app boots).
      ...[
        { w: 1170, h: 2532, dppx: 3 },
        { w: 1284, h: 2778, dppx: 3 },
        { w: 1125, h: 2436, dppx: 3 },
        { w: 750, h: 1334, dppx: 2 },
        { w: 1620, h: 2160, dppx: 2 },
        { w: 1536, h: 2048, dppx: 2 },
      ].map(({ w, h, dppx }) => ({
        rel: "apple-touch-startup-image",
        href: `/splash/splash-${w}x${h}.png`,
        media: `(device-width: ${w / dppx}px) and (device-height: ${h / dppx}px) and (-webkit-device-pixel-ratio: ${dppx}) and (orientation: portrait)`,
      })),
    ],
    scripts: [
      {
        src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2179120672324882",
        async: true,
        crossOrigin: "anonymous",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED")
        return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  // Offline caching (published site only — never in dev/preview).
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrandingStyles />
          <OfflineBanner />
          <UpdatePrompt />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster position="top-center" dir="rtl" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


