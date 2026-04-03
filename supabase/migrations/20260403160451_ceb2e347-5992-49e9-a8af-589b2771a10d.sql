
ALTER TABLE public.profiles
  ADD COLUMN telegram TEXT DEFAULT '',
  ADD COLUMN linkedin TEXT DEFAULT '',
  ADD COLUMN phone TEXT DEFAULT '',
  ADD COLUMN custom_link TEXT DEFAULT '';
