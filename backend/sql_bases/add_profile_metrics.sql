-- Migration script to add missing metrics and fields
-- Run this on your actual database

-- 1. Add updated_at to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- 2. Add missing columns to student_metrics
DO $$ 
BEGIN
    -- Add completed_courses_count if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'completed_courses_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN completed_courses_count integer DEFAULT 0;
    END IF;
    
    -- Add subscriptions_count if it doesn't exist (based on favorites table)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'subscriptions_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN subscriptions_count integer DEFAULT 0;
    END IF;
END $$;

-- 3. Create student_metrics entries for existing users who don't have one
INSERT INTO student_metrics (user_id, courses_in_progress_count, achievements_count, total_study_time, completed_courses_count, subscriptions_count)
SELECT 
    p.id,
    0,
    0,
    '0 seconds'::interval,
    0,
    0
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM student_metrics sm WHERE sm.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create a function to update student metrics (can be called periodically or on events)
CREATE OR REPLACE FUNCTION update_student_metrics(user_uuid uuid)
RETURNS void AS $$
DECLARE
    v_courses_in_progress integer;
    v_completed_courses integer;
    v_achievements integer;
    v_subscriptions integer;
    v_total_time interval;
BEGIN
    -- Calculate metrics
    SELECT 
        COUNT(DISTINCT CASE WHEN ue.completion_status = 'in_progress' THEN ue.course_id END),
        COUNT(DISTINCT CASE WHEN ue.completion_status = 'completed' THEN ue.course_id END),
        COUNT(DISTINCT ua.achievement_id),
        COUNT(DISTINCT f.course_id),
        COALESCE(SUM(al.time_spent_minutes), 0) * INTERVAL '1 minute'
    INTO 
        v_courses_in_progress,
        v_completed_courses,
        v_achievements,
        v_subscriptions,
        v_total_time
    FROM profiles p
    LEFT JOIN user_enrollments ue ON ue.user_id = p.id
    LEFT JOIN user_achievements ua ON ua.user_id = p.id
    LEFT JOIN favorites f ON f.user_id = p.id
    LEFT JOIN activity_logs al ON al.user_id = p.id
    WHERE p.id = user_uuid
    GROUP BY p.id;

    -- Insert or update
    INSERT INTO student_metrics (
        user_id,
        courses_in_progress_count,
        completed_courses_count,
        achievements_count,
        subscriptions_count,
        total_study_time
    )
    VALUES (
        user_uuid,
        COALESCE(v_courses_in_progress, 0),
        COALESCE(v_completed_courses, 0),
        COALESCE(v_achievements, 0),
        COALESCE(v_subscriptions, 0),
        COALESCE(v_total_time, '0 seconds'::interval)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        courses_in_progress_count = EXCLUDED.courses_in_progress_count,
        completed_courses_count = EXCLUDED.completed_courses_count,
        achievements_count = EXCLUDED.achievements_count,
        subscriptions_count = EXCLUDED.subscriptions_count,
        total_study_time = EXCLUDED.total_study_time;
END;
$$ LANGUAGE plpgsql;
