-- Drop the trigger and function that seeds default categories for new users
DROP TRIGGER IF EXISTS on_profile_created_seed_categories ON public.profiles;
DROP FUNCTION IF EXISTS public.seed_default_categories() CASCADE;