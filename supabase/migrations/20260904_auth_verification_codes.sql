-- Migration: Add auth verification codes and tracking
-- Date: 2026-09-04

CREATE TABLE IF NOT EXISTS public.auth_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'signin',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_verification_codes_email_code 
ON public.auth_verification_codes (email, code, used, expires_at);

ALTER TABLE public.auth_verification_codes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_verified_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
