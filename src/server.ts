import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Markdown content negotiation for AI agents: a `.md` suffix or an
 * `Accept: text/markdown` request for a public page is served from the
 * Markdown renderer instead of the HTML app.
 */
function markdownRewrite(request: Request): Request | null {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  const path = url.pathname;
  if (
    path.startsWith("/api/") ||
    path.startsWith("/_") ||
    path.startsWith("/.well-known/") ||
    path === "/mcp" ||
    path.startsWith("/mcp/") ||
    path === "/llms.txt" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
  ) {
    return null;
  }

  const accept = request.headers.get("accept") ?? "";
  const wantsMarkdown =
    /text\/markdown|text\/x-markdown/i.test(accept) && !/text\/html/i.test(accept);
  const hasMdSuffix = path.endsWith(".md");
  if (!wantsMarkdown && !hasMdSuffix) return null;

  const target = new URL("/api/public/md", url.origin);
  target.searchParams.set(
    "path",
    (hasMdSuffix ? path.slice(0, -3) : path) + url.search,
  );
  return new Request(target, { headers: request.headers });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const rewritten = markdownRewrite(request);
      const response = await handler.fetch(rewritten ?? request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

