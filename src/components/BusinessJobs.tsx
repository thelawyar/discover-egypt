import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PublicJob = {
  id: string;
  title: string;
  description: string | null;
  employment_type: string | null;
  salary_range: string | null;
  contact: string | null;
};

/** Public "we are hiring" list on the business mini-site. */
export function BusinessJobs({ businessId }: { businessId: string }) {
  const { data } = useQuery({
    queryKey: ["public-business-jobs", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_jobs")
        .select("id,title,description,employment_type,salary_range,contact")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublicJob[];
    },
  });

  if (!data?.length) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <BriefcaseBusiness className="size-4" /> وظائف متاحة
      </h2>
      <div className="space-y-3">
        {data.map((job) => (
          <div
            key={job.id}
            className="rounded-xl border p-3"
            style={{ borderColor: "var(--biz-border)" }}
          >
            <p className="text-sm font-bold">{job.title}</p>
            <p className="text-[11px] opacity-70">
              {[job.employment_type, job.salary_range].filter(Boolean).join(" · ")}
            </p>
            {job.description ? (
              <p className="mt-1 text-xs opacity-80">{job.description}</p>
            ) : null}
            {job.contact ? (
              <p className="mt-2 text-xs font-medium" dir="auto">
                للتقديم: {job.contact}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
