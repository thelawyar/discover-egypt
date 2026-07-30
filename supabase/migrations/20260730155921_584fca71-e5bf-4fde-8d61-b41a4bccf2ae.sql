REVOKE EXECUTE ON FUNCTION public.business_list_managers(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.business_add_manager(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.business_remove_manager(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_business_owner(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_business_manager(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_business_owner(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_business(uuid, uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.business_list_managers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_add_manager(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_remove_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_business_owner(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_business(uuid, uuid) TO authenticated;