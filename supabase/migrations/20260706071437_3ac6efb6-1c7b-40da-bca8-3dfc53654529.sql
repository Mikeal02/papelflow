
-- Lock down SECURITY DEFINER trigger functions: revoke from public/anon/authenticated
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Harden add_income_categories_for_user: ignore client-supplied user id, use auth.uid()
CREATE OR REPLACE FUNCTION public.add_income_categories_for_user(p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM categories WHERE user_id = v_user_id AND type = 'income') THEN
    INSERT INTO categories (user_id, name, type, icon, color, category_group, is_default)
    VALUES
      (v_user_id, 'Salary', 'income', 'briefcase', '#10B981', 'Income', true),
      (v_user_id, 'Freelance', 'income', 'laptop', '#3B82F6', 'Income', true),
      (v_user_id, 'Investments', 'income', 'trending-up', '#8B5CF6', 'Income', true),
      (v_user_id, 'Rental Income', 'income', 'home', '#F59E0B', 'Income', true),
      (v_user_id, 'Gifts', 'income', 'gift', '#EC4899', 'Income', true),
      (v_user_id, 'Other Income', 'income', 'plus-circle', '#6B7280', 'Income', true);
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.add_income_categories_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_income_categories_for_user(uuid) TO authenticated;

-- Ensure the auth.users trigger still fires (owner-invoked, not via API)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
