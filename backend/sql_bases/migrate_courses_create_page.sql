-- Миграция для интеграции страницы создания курса /courses/create
-- Добавляет все недостающие поля в базу данных на основе бэкапа и требований фронтенда
-- Этот скрипт безопасен для повторного запуска - проверяет наличие полей перед добавлением

DO $$
BEGIN
    -- ============================================
    -- 1. Добавляем поля в таблицу courses
    -- ============================================
    
    -- cover_image - изображение обложки курса
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'cover_image'
    ) THEN
        ALTER TABLE courses ADD COLUMN cover_image TEXT;
        RAISE NOTICE '✅ Added cover_image column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  cover_image column already exists in courses';
    END IF;

    -- tags - массив тегов для курса
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'tags'
    ) THEN
        ALTER TABLE courses ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added tags column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  tags column already exists in courses';
    END IF;

    -- specialty - специализация курса
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'specialty'
    ) THEN
        ALTER TABLE courses ADD COLUMN specialty TEXT;
        RAISE NOTICE '✅ Added specialty column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  specialty column already exists in courses';
    END IF;

    -- target_audience - целевая аудитория курса
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'target_audience'
    ) THEN
        ALTER TABLE courses ADD COLUMN target_audience TEXT;
        RAISE NOTICE '✅ Added target_audience column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  target_audience column already exists in courses';
    END IF;

    -- about_course - описание курса
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'about_course'
    ) THEN
        ALTER TABLE courses ADD COLUMN about_course TEXT;
        RAISE NOTICE '✅ Added about_course column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  about_course column already exists in courses';
    END IF;

    -- ============================================
    -- 2. Добавляем поле canvas_data в таблицу chapters
    -- ============================================
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chapters' AND column_name = 'canvas_data'
    ) THEN
        ALTER TABLE chapters ADD COLUMN canvas_data JSONB;
        RAISE NOTICE '✅ Added canvas_data column to chapters';
    ELSE
        RAISE NOTICE 'ℹ️  canvas_data column already exists in chapters';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chapters' AND column_name = 'short_description'
    ) THEN
        ALTER TABLE chapters ADD COLUMN short_description TEXT;
        RAISE NOTICE '✅ Added short_description column to chapters';
    ELSE
        RAISE NOTICE 'ℹ️  short_description column already exists in chapters';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chapters' AND column_name = 'study_minutes'
    ) THEN
        ALTER TABLE chapters ADD COLUMN study_minutes INTEGER;
        RAISE NOTICE '✅ Added study_minutes column to chapters';
    ELSE
        RAISE NOTICE 'ℹ️  study_minutes column already exists in chapters';
    END IF;

    -- ============================================
    -- 3. Добавляем недостающие поля в student_metrics
    -- ============================================
    
    -- completed_courses_count - количество завершенных курсов
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'completed_courses_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN completed_courses_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added completed_courses_count column to student_metrics';
    ELSE
        RAISE NOTICE 'ℹ️  completed_courses_count column already exists in student_metrics';
    END IF;

    -- subscriptions_count - количество подписок (избранное)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'subscriptions_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN subscriptions_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added subscriptions_count column to student_metrics';
    ELSE
        RAISE NOTICE 'ℹ️  subscriptions_count column already exists in student_metrics';
    END IF;

    -- Обновляем существующие записи в student_metrics, устанавливая значения по умолчанию
    UPDATE student_metrics 
    SET completed_courses_count = COALESCE(completed_courses_count, 0),
        subscriptions_count = COALESCE(subscriptions_count, 0)
    WHERE completed_courses_count IS NULL OR subscriptions_count IS NULL;

    -- ============================================
    -- 4. Создаем метрики для существующих пользователей, у которых их нет
    -- ============================================
    
    -- Создаем student_metrics для пользователей без метрик
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

    -- Создаем instructor_metrics для пользователей без метрик
    INSERT INTO instructor_metrics (user_id, courses_created_count, total_students_count, total_subscribers)
    SELECT 
        p.id,
        0,
        0,
        0
    FROM profiles p
    WHERE NOT EXISTS (
        SELECT 1 FROM instructor_metrics im WHERE im.user_id = p.id
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '📋 All required fields for /courses/create page are now available';
END $$;

-- ============================================
-- Проверка результата миграции
-- ============================================
-- Вы можете раскомментировать эти запросы для проверки:

-- Проверка полей в courses
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'courses' 
-- AND column_name IN ('cover_image', 'tags', 'specialty', 'target_audience', 'about_course')
-- ORDER BY column_name;

-- Проверка поля в chapters
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'chapters' 
-- AND column_name = 'canvas_data';

-- Проверка полей в student_metrics
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'student_metrics' 
-- AND column_name IN ('completed_courses_count', 'subscriptions_count')
-- ORDER BY column_name;

-- Проверка наличия метрик для всех пользователей
-- SELECT 
--     (SELECT COUNT(*) FROM profiles) as total_profiles,
--     (SELECT COUNT(*) FROM student_metrics) as total_student_metrics,
--     (SELECT COUNT(*) FROM instructor_metrics) as total_instructor_metrics;
