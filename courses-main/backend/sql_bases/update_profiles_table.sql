-- SQL script to update the profiles table
-- This script will:
-- 1. Drop the 'full_name' column if it exists.
-- 2. Add 'first_name', 'last_name', and 'patronymic' columns.

DO $$
BEGIN
    -- Check if 'full_name' column exists before dropping
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE profiles DROP COLUMN full_name;
        RAISE NOTICE 'Column full_name dropped from profiles table.';
    ELSE
        RAISE NOTICE 'Column full_name does not exist in profiles table. Skipping drop.';
    END IF;

    -- Add 'first_name' column if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Column first_name added to profiles table.';
    ELSE
        RAISE NOTICE 'Column first_name already exists in profiles table. Skipping add.';
    END IF;

    -- Add 'last_name' column if it does not exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Column last_name added to profiles table.';
    ELSE
        RAISE NOTICE 'Column last_name already exists in profiles table. Skipping add.';
    END IF;

    -- Add 'patronymic' column if it does not exist (optional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='patronymic') THEN
        ALTER TABLE profiles ADD COLUMN patronymic TEXT;
        RAISE NOTICE 'Column patronymic added to profiles table.';
    ELSE
        RAISE NOTICE 'Column patronymic already exists in profiles table. Skipping add.';
    END IF;

END $$;
