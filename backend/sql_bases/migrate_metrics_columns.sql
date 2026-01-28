-- Migration script to add missing metrics columns
-- This script adds completed_courses_count and subscriptions_count to student_metrics table
-- if they don't exist

-- Check and add completed_courses_count column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'student_metrics' 
        AND column_name = 'completed_courses_count'
    ) THEN
        ALTER TABLE public.student_metrics 
        ADD COLUMN completed_courses_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Column completed_courses_count added to student_metrics';
    ELSE
        RAISE NOTICE 'Column completed_courses_count already exists in student_metrics';
    END IF;
END $$;

-- Check and add subscriptions_count column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'student_metrics' 
        AND column_name = 'subscriptions_count'
    ) THEN
        ALTER TABLE public.student_metrics 
        ADD COLUMN subscriptions_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Column subscriptions_count added to student_metrics';
    ELSE
        RAISE NOTICE 'Column subscriptions_count already exists in student_metrics';
    END IF;
END $$;

-- Update existing rows to set default values for new columns
UPDATE public.student_metrics 
SET 
    completed_courses_count = COALESCE(completed_courses_count, 0),
    subscriptions_count = COALESCE(subscriptions_count, 0)
WHERE completed_courses_count IS NULL OR subscriptions_count IS NULL;
