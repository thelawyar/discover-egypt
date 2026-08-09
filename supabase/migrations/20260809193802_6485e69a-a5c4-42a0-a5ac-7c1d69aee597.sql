
-- 1) business_reports: enforce reporter identity
DROP POLICY IF EXISTS "anyone can report" ON public.business_reports;
CREATE POLICY "anyone can report"
ON public.business_reports FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(coalesce(details, ''))) <= 1000
  AND (
    (auth.uid() IS NULL AND reporter_id IS NULL)
    OR (auth.uid() IS NOT NULL AND (reporter_id IS NULL OR reporter_id = auth.uid()))
  )
);

-- 2) business_username_history: no public read
DROP POLICY IF EXISTS "username history public read" ON public.business_username_history;
CREATE POLICY "username history managers read"
ON public.business_username_history FOR SELECT TO authenticated
USING (public.can_manage_business(business_id, auth.uid()));

REVOKE SELECT ON public.business_username_history FROM anon;

-- keep legacy /username links working without exposing rows
CREATE OR REPLACE FUNCTION public.resolve_legacy_handle(_username text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.username
  FROM public.business_username_history h
  JOIN public.businesses b ON b.id = h.business_id
  WHERE h.username = lower(btrim(coalesce(_username, '')))
    AND b.status = 'approved'
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_legacy_handle(text) TO anon, authenticated;

-- 3) lock down SECURITY DEFINER functions that should not be API-callable
-- trigger functions (triggers fire regardless of EXECUTE grants)
REVOKE ALL ON FUNCTION public.enforce_business_moderation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_category_moderation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_review_moderation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.log_business_moderation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_business_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_event_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_report() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.record_username_change() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_event_location() FROM anon, authenticated;

-- signed-in only operations: remove anonymous access
REVOKE ALL ON FUNCTION public.admin_directory_stats(integer) FROM anon;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_admin_role(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_business_owner(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.business_add_manager(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.business_list_managers(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.business_remove_manager(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.business_page_events_export(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.business_page_stats(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.business_recent_contacts(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.business_withdraw(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_admin_invite(text) FROM anon;
REVOKE ALL ON FUNCTION public.create_admin_invite(text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.run_event_reminders(integer) FROM anon;
REVOKE ALL ON FUNCTION public.search_term_stats(integer, integer) FROM anon;
