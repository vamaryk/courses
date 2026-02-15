-- SQL script to add potentially missing columns to the profiles table
-- This script will add:
-- 'date_of_birth' (DATE)
-- 'phone_number' (TEXT)
-- 'address' (TEXT)
-- 'occupation' (TEXT)
-- 'bio' (TEXT)
-- 'avatar_url' (TEXT)
-- if they do not already exist.

DO $$
BEGIN
    -- Add 'date_of_birth' column if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='date_of_birth') THEN
        ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
        RAISE NOTICE 'Column date_of_birth added to profiles table.';
    ELSE
        RAISE NOTICE 'Column date_of_birth already exists in profiles table. Skipping add.';
    END IF;

    -- Add 'phone_number' column if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_number') THEN
        ALTER TABLE profiles ADD COLUMN phone_number TEXT;
        RAISE NOTICE 'Column phone_number added to profiles table.';
    ELSE
        RAISE NOTICE 'Column phone_number already exists in profiles table. Skipping add.';
    END IF;

    -- Add 'address' column if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='address') THEN
        ALTER TABLE profiles ADD COLUMN address TEXT;
        RAISE NOTICE 'Column address added to profiles table.';
    ELSE
        RAISE NOTICE 'Column address already exists in profiles table. Skipping add.';
    END IF;

    -- Add 'occupation' column if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='occupation') THEN
        ALTER TABLE profiles ADD COLUMN occupation TEXT;
        RAISE NOTICE 'Column occupation added to profiles table.';
    ELSE
        RAISE NOTICE 'Column occupation already exists in profiles table. Skipping add.';
    END IF;

    -- Add 'bio' column if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Column bio added to profiles table.';
    ELSE
        RAISE NOTICE 'Column bio already exists in profiles table. Skipping add.';
    END IF;

    -- Add 'avatar_url' column if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Column avatar_url added to profiles table.';
    ELSE
        RAISE NOTICE 'Column avatar_url already exists in profiles table. Skipping add.';
    END IF;

END $$;
