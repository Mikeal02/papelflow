-- Add income categories for the user
-- Note: This adds default income categories that will be available to users

-- First, let's check if income categories exist by creating a function that users can call
-- to add default income categories to their account

CREATE OR REPLACE FUNCTION public.add_income_categories_for_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only insert if user doesn't have income categories
  IF NOT EXISTS (SELECT 1 FROM categories WHERE user_id = p_user_id AND type = 'income') THEN
    INSERT INTO categories (user_id, name, type, icon, color, category_group, is_default)
    VALUES
      (p_user_id, 'Salary', 'income', 'briefcase', '#10B981', 'Income', true),
      (p_user_id, 'Freelance', 'income', 'laptop', '#3B82F6', 'Income', true),
      (p_user_id, 'Investments', 'income', 'trending-up', '#8B5CF6', 'Income', true),
      (p_user_id, 'Rental Income', 'income', 'home', '#F59E0B', 'Income', true),
      (p_user_id, 'Gifts', 'income', 'gift', '#EC4899', 'Income', true),
      (p_user_id, 'Other Income', 'income', 'plus-circle', '#6B7280', 'Income', true);
  END IF;
END;
$$;