import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { userId: string; action: "ban" | "unban" | "delete" };

/**
 * Admin-only user management: disable (ban), enable (unban) or delete a user.
 * The caller's admin role is verified with their own token before any
 * privileged Auth Admin API call.
 */
export const adminManageUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input?.userId) throw new Error("missing_user");
    if (!["ban", "unban", "delete"].includes(input.action))
      throw new Error("bad_action");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleError || !isAdmin) throw new Error("forbidden");
    if (data.userId === context.userId) throw new Error("self_action");

    // Never allow removing/disabling the last remaining admin.
    const { data: targetIsAdmin } = await context.supabase.rpc("has_role", {
      _user_id: data.userId,
      _role: "admin",
    });
    if (targetIsAdmin) throw new Error("target_is_admin");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "delete") {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.action === "ban" ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
