-- Egun (Gun) is an official language of the Church alongside Yorùbá, English and French: members may choose it again
alter table public.profiles drop constraint if exists profiles_preferred_language_check;
alter table public.profiles add constraint profiles_preferred_language_check
  check (preferred_language in ('en', 'yo', 'fr', 'egun'));
