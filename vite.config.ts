// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "prompt",
        // Registration happens only from src/lib/register-sw.ts (guarded).
        injectRegister: null,
        filename: "sw.js",
        outDir: "dist/client",
        devOptions: { enabled: false },
        // The project ships its own hand-written manifest in public/.
        manifest: false,
        injectManifest: undefined,
        workbox: {
          globDirectory: "dist/client",
          globPatterns: ["**/*.{js,css,ico,png,jpg,svg,webp,woff2,webmanifest}"],
          globIgnores: ["**/node_modules/**", "sw.js", "workbox-*.js"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: false,
          skipWaiting: false,
          // Adds the SKIP_WAITING message handler used by the update prompt.
          importScripts: ["/sw-skip-waiting.js"],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              // Page navigations: fresh when online, cached copy when offline.
              urlPattern: ({ request }: { request: Request }) =>
                request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "durtown-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Directory data (search results / business pages) from the backend API.
              urlPattern: ({ url, request }: { url: URL; request: Request }) =>
                request.method === "GET" && /\/rest\/v1\//.test(url.pathname),
              handler: "NetworkFirst",
              options: {
                cacheName: "durtown-api",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 3 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }: { request: Request }) =>
                request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "durtown-images",
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }: { url: URL }) =>
                /fonts\.(googleapis|gstatic)\.com/.test(url.hostname),
              handler: "CacheFirst",
              options: {
                cacheName: "durtown-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
