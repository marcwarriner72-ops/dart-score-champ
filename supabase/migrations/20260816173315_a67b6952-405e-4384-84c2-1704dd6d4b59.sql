ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'legs';
ALTER TABLE public.matches ADD CONSTRAINT matches_format_check CHECK (format IN ('legs','sets'));