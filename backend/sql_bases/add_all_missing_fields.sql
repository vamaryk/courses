-- Скрипт для добавления всех недостающих полей в базу данных
-- Проверяет наличие полей и добавляет их, если они отсутствуют

DO $$
BEGIN
    -- Добавляем поля в таблицу courses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'cover_image'
    ) THEN
        ALTER TABLE courses ADD COLUMN cover_image TEXT;
        RAISE NOTICE 'Added cover_image column to courses';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'tags'
    ) THEN
        ALTER TABLE courses ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Added tags column to courses';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'specialty'
    ) THEN
        ALTER TABLE courses ADD COLUMN specialty TEXT;
        RAISE NOTICE 'Added specialty column to courses';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'target_audience'
    ) THEN
        ALTER TABLE courses ADD COLUMN target_audience TEXT;
        RAISE NOTICE 'Added target_audience column to courses';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'about_course'
    ) THEN
        ALTER TABLE courses ADD COLUMN about_course TEXT;
        RAISE NOTICE 'Added about_course column to courses';
    END IF;

    -- Добавляем поле canvas_data в таблицу chapters
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chapters' AND column_name = 'canvas_data'
    ) THEN
        ALTER TABLE chapters ADD COLUMN canvas_data JSONB;
        RAISE NOTICE 'Added canvas_data column to chapters';
    END IF;

    -- Добавляем недостающие поля в таблицу student_metrics
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'completed_courses_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN completed_courses_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added completed_courses_count column to student_metrics';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'subscriptions_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN subscriptions_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added subscriptions_count column to student_metrics';
    END IF;

    -- Обновляем существующие записи в student_metrics, устанавливая значения по умолчанию
    UPDATE student_metrics 
    SET completed_courses_count = COALESCE(completed_courses_count, 0),
        subscriptions_count = COALESCE(subscriptions_count, 0)
    WHERE completed_courses_count IS NULL OR subscriptions_count IS NULL;

    RAISE NOTICE 'Migration completed successfully';
END $$;
