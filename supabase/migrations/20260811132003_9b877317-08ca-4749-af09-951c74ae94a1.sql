-- Default PUBLIC EXECUTE must be revoked, otherwise anon/authenticated keep access.
REVOKE ALL ON FUNCTION public.enforce_review_moderation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_business_moderation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_business_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_event_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_new_report() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_username_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_event_location() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.admin_directory_stats(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_term_stats(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_page_events_export(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_page_stats(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.business_recent_contacts(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_event_reminders(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_list(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_directory_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_term_stats(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_page_events_export(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_page_stats(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_recent_contacts(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_event_reminders(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_list(uuid, uuid) TO authenticated, anon;