-- The helper only inserts default income categories for the caller, which the
-- caller's own RLS policy already permits. Elevated privileges are unnecessary,
-- so drop SECURITY DEFINER (least privilege).
CREATE OR REPLACE FUNCTION public.add_income_categories_for_user(p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.categories (user_id, name, icon, color, type)
  SELECT v_user, c.name, c.icon, c.color, 'income'
  FROM (VALUES
    ('Salary', 'Wallet', '#22c55e'),
    ('Freelance', 'Briefcase', '#3b82f6'),
    ('Investments', 'TrendingUp', '#8b5cf6'),
    ('Gifts', 'Gift', '#ec4899'),
    ('Other Income', 'Plus', '#64748b')
  ) AS c(name, icon, color)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories ec
    WHERE ec.user_id = v_user AND ec.name = c.name AND ec.type = 'income'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_income_categories_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_income_categories_for_user(uuid) TO authenticated;
