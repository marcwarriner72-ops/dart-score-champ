ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS session text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS round text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_label text;