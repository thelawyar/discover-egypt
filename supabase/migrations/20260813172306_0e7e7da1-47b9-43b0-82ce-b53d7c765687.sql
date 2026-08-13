GRANT EXECUTE ON FUNCTION public.can_manage_business(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_list(uuid, uuid) TO authenticated;