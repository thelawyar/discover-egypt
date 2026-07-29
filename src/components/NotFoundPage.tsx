import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { getHomeStats, getTaxonomy } from "@/lib/directory.functions";
import { BusinessCard } from "@/components/BusinessCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Friendly 404 with search, popular cities and suggested businesses. */
export function NotFoundPage() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const { data: taxonomy } = useQuery({
    queryKey: ["taxonomy"],
    queryFn: () => getTaxonomy(),
    staleTime: 1000 * 60 * 30,
  });

  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: () => getHomeStats(),
    staleTime: 1000 * 60 * 5,
  });

  const cities = (taxonomy?.cities ?? []).slice(0, 12);
  const categories = (taxonomy?.categories ?? []).slice(0, 8);
  const suggestions = (stats?.featured ?? []).slice(0, 3);

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-6xl font-extrabold text-primary">404</p>
        <h1 className="mt-3 text-xl font-extrabold">
          الصفحة اللي بتدور عليها مش موجودة
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          يمكن الرابط اتغيّر أو النشاط اتشال. جرّب تبحث من هنا:
        </p>

        <form
          className="mx-auto mt-6 flex max-w-lg gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q: term.trim(), city: "", gov: "", cat: "", page: 1 } });
          }}
        >
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ابحث باسم النشاط أو المنتج أو المجال..."
            className="h-11 rounded-full"
            maxLength={100}
          />
          <Button type="submit" className="h-11 rounded-full px-6">
            <Search className="size-4" /> بحث
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/search"
              search={{ q: "", city: "", gov: "", cat: c.slug, page: 1 }}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium hover:bg-primary-soft"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 text-right">
          <h2 className="text-sm font-extrabold">مدن مقترحة</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link
                key={c.id}
                to="/city/$slug"
                params={{ slug: c.slug }}
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        {suggestions.length ? (
          <div className="mt-10 text-right">
            <h2 className="text-sm font-extrabold">أنشطة قد تهمّك</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((b) => (
                <BusinessCard key={b.id} item={b} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-10">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">العودة للصفحة الرئيسية</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
