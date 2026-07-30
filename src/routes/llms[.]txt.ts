import { createFileRoute } from "@tanstack/react-router";
import { agentListTaxonomy } from "@/lib/agent-data.server";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        const host = request.headers.get("host") ?? "";
        const origin = host ? `${proto}://${host}` : "";
        const tax = await agentListTaxonomy();

        const body = [
          "# اكتشف مدينتك (Discover Your Town)",
          "",
          "> دليل تجاري شامل للمدن المصرية — ابحث عن أي نشاط تجاري (عيادات، محلات، مصانع، مدارس، خدمات) حسب الاسم أو المجال أو المنتجات أو المدينة.",
          "",
          "الموقع باللغة العربية (RTL). كل صفحة عامة متاحة أيضًا بصيغة Markdown عبر إضافة `.md` إلى الرابط أو إرسال الترويسة `Accept: text/markdown`.",
          "",
          "## Pages",
          `- [الصفحة الرئيسية](${origin}/): البحث في الدليل.`,
          `- [نتائج البحث](${origin}/search): بحث مع فلاتر المدينة والتصنيف والمنتجات (\`?q=&city=&cat=&sort=\`).`,
          `- [تسجيل نشاط جديد](${origin}/auth): إنشاء حساب لإضافة نشاط تجاري.`,
          "",
          "## Machine interfaces",
          `- [MCP Server](${origin}/mcp): أدوات MCP للبحث في الدليل وقراءة بيانات الأنشطة (OAuth 2.1).`,
          `- [Markdown API](${origin}/api/public/md?path=/): نسخة Markdown لأي مسار عام.`,
          `- [Sitemap](${origin}/sitemap.xml)`,
          `- [robots.txt](${origin}/robots.txt)`,
          `- [Agent Skills](${origin}/.well-known/skills.json)`,
          `- [Agent card](${origin}/.well-known/agent.json)`,
          "",
          "## Categories",
          ...tax.categories.map(
            (c) => `- [${c.name}](${origin}/search?cat=${c.slug}): أنشطة ${c.name}.`,
          ),
          "",
          "## Cities",
          ...tax.cities
            .slice(0, 100)
            .map((c) => `- [${c.name}](${origin}/city/${c.slug}): دليل مدينة ${c.name}.`),
          "",
          "## Optional",
          `- [كل المدن](${origin}/api/public/md?path=/): القائمة الكاملة للمدن والتصنيفات بصيغة Markdown.`,
          "",
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
