import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Manager = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

/**
 * Lets the business owner (or an admin) grant edit access on this single
 * business to another registered user, by email.
 */
export function ManagersEditor({ businessId }: { businessId: string }) {
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["business-managers", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("business_list_managers", {
        _business_id: businessId,
      });
      if (error) throw error;
      return (data ?? []) as Manager[];
    },
    retry: false,
  });

  const add = useMutation({
    mutationFn: async () => {
      const value = email.trim();
      if (!value) throw new Error("اكتب بريد المستخدم");
      const { error } = await supabase.rpc("business_add_manager", {
        _business_id: businessId,
        _email: value,
      });
      if (error) {
        if (error.message.includes("user_not_found"))
          throw new Error("لا يوجد مستخدم مسجّل بهذا البريد");
        if (error.message.includes("forbidden"))
          throw new Error("لا تملك صلاحية إدارة هذا النشاط");
        throw error;
      }
    },
    onSuccess: () => {
      setEmail("");
      toast.success("تم منح صلاحية تعديل هذا النشاط");
      queryClient.invalidateQueries({ queryKey: ["business-managers", businessId] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "تعذّر منح الصلاحية"),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("business_remove_manager", {
        _business_id: businessId,
        _user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم سحب الصلاحية");
      queryClient.invalidateQueries({ queryKey: ["business-managers", businessId] });
    },
    onError: () => toast.error("تعذّر سحب الصلاحية"),
  });

  if (isError) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div>
        <h2 className="text-sm font-bold">المستخدمون المصرّح لهم بتعديل هذا النشاط</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          أضف بريد مستخدم مسجّل في الموقع ليتمكن من تعديل هذا النشاط فقط، دون
          الوصول لأي نشاط آخر.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          type="email"
          dir="ltr"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 max-w-xs flex-1"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          disabled={add.isPending}
          onClick={() => add.mutate()}
        >
          <UserPlus className="size-4" /> منح الصلاحية
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
      ) : !data?.length ? (
        <p className="text-xs text-muted-foreground">
          لا يوجد مستخدمون إضافيون لهذا النشاط.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.full_name || m.email}</p>
                <p dir="ltr" className="truncate text-right text-xs text-muted-foreground">
                  {m.email}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(m.user_id)}
              >
                <Trash2 className="size-3.5" /> سحب
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
