-- 1) Internal trigger functions must never be callable via the API
REVOKE ALL ON FUNCTION public.enforce_review_moderation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.log_business_moderation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_business_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_event_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_report() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.record_username_change() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_event_location() FROM anon, authenticated;

-- 2) Admin/owner-only reporting functions: not callable anonymously
REVOKE ALL ON FUNCTION public.admin_directory_stats(integer) FROM anon;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM anon;
REVOKE ALL ON FUNCTION public.search_term_stats(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.business_page_events_export(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.business_page_stats(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.business_recent_contacts(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.run_event_reminders(integer) FROM anon;
REVOKE ALL ON FUNCTION public.owns_list(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_legacy_handle(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resolve_legacy_handle(text) TO anon;

-- 3) Explicit admin-only write policies on user_roles (blocks privilege escalation)
DROP POLICY IF EXISTS "admins insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins update roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins delete roles" ON public.user_roles;

CREATE POLICY "admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));