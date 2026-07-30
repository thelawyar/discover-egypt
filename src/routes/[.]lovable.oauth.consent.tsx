import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/SiteHeader";

type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: RedirectResult | null; error: Error | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: RedirectResult | null; error: Error | null }>;
};

type AuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

type RedirectResult = { redirect_url?: string; redirect_to?: string };

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get(
      "authorization_id",
    )!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center p-6 text-center text-sm">
      تعذّر تحميل طلب التفويض: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "تطبيق خارجي";

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("لم يتم إرجاع رابط إعادة التوجيه من خادم التفويض.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Brand size="sm" />
      <div className="mt-8 w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-raised">
        <h1 className="text-lg font-bold">ربط {clientName} بحسابك</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          سيتمكن {clientName} من استخدام أدوات «اكتشف مدينتك» نيابةً عنك بنفس صلاحيات
          حسابك.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex gap-2">
          <Button
            className="flex-1 rounded-full"
            disabled={busy}
            onClick={() => decide(true)}
          >
            موافقة
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            disabled={busy}
            onClick={() => decide(false)}
          >
            رفض
          </Button>
        </div>
      </div>
    </main>
  );
}
