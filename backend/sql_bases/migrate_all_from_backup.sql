-- Comprehensive migration script based on backup database
-- Adds all missing columns and tables from lms_backup_last.sql
-- Safe to run multiple times - checks for existence before adding

-- ============================================
-- 1. Add missing columns to student_metrics
-- ============================================
DO $$
BEGIN
    -- completed_courses_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'student_metrics' 
        AND column_name = 'completed_courses_count'
    ) THEN
        ALTER TABLE public.student_metrics 
        ADD COLUMN completed_courses_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added completed_courses_count to student_metrics';
    ELSE
        RAISE NOTICE 'ℹ️  completed_courses_count already exists in student_metrics';
    END IF;

    -- subscriptions_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'student_metrics' 
        AND column_name = 'subscriptions_count'
    ) THEN
        ALTER TABLE public.student_metrics 
        ADD COLUMN subscriptions_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added subscriptions_count to student_metrics';
    ELSE
        RAISE NOTICE 'ℹ️  subscriptions_count already exists in student_metrics';
    END IF;
END $$;

-- Update existing rows to set default values
UPDATE public.student_metrics 
SET 
    completed_courses_count = COALESCE(completed_courses_count, 0),
    subscriptions_count = COALESCE(subscriptions_count, 0)
WHERE completed_courses_count IS NULL OR subscriptions_count IS NULL;

-- ============================================
-- 2. Add missing columns to courses (if not already added)
-- ============================================
DO $$
BEGIN
    -- cover_image
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'cover_image'
    ) THEN
        ALTER TABLE courses ADD COLUMN cover_image TEXT;
        RAISE NOTICE '✅ Added cover_image to courses';
    END IF;

    -- tags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'tags'
    ) THEN
        ALTER TABLE courses ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added tags to courses';
    END IF;

    -- specialty
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'specialty'
    ) THEN
        ALTER TABLE courses ADD COLUMN specialty TEXT;
        RAISE NOTICE '✅ Added specialty to courses';
    END IF;

    -- target_audience
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'target_audience'
    ) THEN
        ALTER TABLE courses ADD COLUMN target_audience TEXT;
        RAISE NOTICE '✅ Added target_audience to courses';
    END IF;

    -- about_course
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'about_course'
    ) THEN
        ALTER TABLE courses ADD COLUMN about_course TEXT;
        RAISE NOTICE '✅ Added about_course to courses';
    END IF;
END $$;

-- ============================================
-- 3. Add canvas_data to chapters (if not already added)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chapters' AND column_name = 'canvas_data'
    ) THEN
        ALTER TABLE chapters ADD COLUMN canvas_data JSONB;
        RAISE NOTICE '✅ Added canvas_data to chapters';
    END IF;
END $$;

-- ============================================
-- Summary
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
END $$;
