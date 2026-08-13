REVOKE EXECUTE ON FUNCTION public.can_manage_business(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_manager(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_owner(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_list(uuid, uuid) FROM anon, authenticated;