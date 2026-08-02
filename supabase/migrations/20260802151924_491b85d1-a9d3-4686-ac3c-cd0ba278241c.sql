DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, email text, full_name text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, is_admin boolean, banned_until timestamp with time zone, is_banned boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
    u.banned_until,
    (u.banned_until IS NOT NULL AND u.banned_until > now())
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY u.created_at DESC
  LIMIT 500;
$function$;