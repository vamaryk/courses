-- Скрипт для проверки результата миграции
-- Проверяет наличие всех необходимых полей

-- Проверка полей в courses
SELECT 
    'courses' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'courses' 
AND column_name IN ('cover_image', 'tags', 'specialty', 'target_audience', 'about_course')
ORDER BY column_name;

-- Проверка поля в chapters
SELECT 
    'chapters' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chapters' 
AND column_name = 'canvas_data';

-- Проверка полей в student_metrics
SELECT 
    'student_metrics' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'student_metrics' 
AND column_name IN ('completed_courses_count', 'subscriptions_count')
ORDER BY column_name;

-- Проверка наличия метрик для всех пользователей
SELECT 
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM student_metrics) as total_student_metrics,
    (SELECT COUNT(*) FROM instructor_metrics) as total_instructor_metrics,
    CASE 
        WHEN (SELECT COUNT(*) FROM profiles) = (SELECT COUNT(*) FROM student_metrics) 
         AND (SELECT COUNT(*) FROM profiles) = (SELECT COUNT(*) FROM instructor_metrics)
        THEN 'OK - All users have metrics'
        ELSE 'WARNING - Some users missing metrics'
    END as metrics_status;
