-- Add columns for inspection details from inspector
ALTER TABLE public.corrective_actions
ADD COLUMN IF NOT EXISTS inspection_details text,
ADD COLUMN IF NOT EXISTS inspection_recommendations text,
ADD COLUMN IF NOT EXISTS inspection_images jsonb DEFAULT '[]'::jsonb;