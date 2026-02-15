-- Объединенная миграция для добавления всех недостающих полей
-- Применяет все изменения из бекапа базы данных
-- Этот скрипт безопасен для повторного запуска

-- ============================================
-- 1. Добавляем поля в таблицу courses
-- ============================================

DO $$
BEGIN
    -- cover_image
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'cover_image'
    ) THEN
        ALTER TABLE courses ADD COLUMN cover_image TEXT;
        RAISE NOTICE '✅ Added cover_image column to courses';
    END IF;

    -- tags
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'tags'
    ) THEN
        ALTER TABLE courses ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added tags column to courses';
    END IF;

    -- specialty
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'specialty'
    ) THEN
        ALTER TABLE courses ADD COLUMN specialty TEXT;
        RAISE NOTICE '✅ Added specialty column to courses';
    END IF;

    -- target_audience
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'target_audience'
    ) THEN
        ALTER TABLE courses ADD COLUMN target_audience TEXT;
        RAISE NOTICE '✅ Added target_audience column to courses';
    END IF;

    -- about_course
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'about_course'
    ) THEN
        ALTER TABLE courses ADD COLUMN about_course TEXT;
        RAISE NOTICE '✅ Added about_course column to courses';
    END IF;

    -- course_skills (навыки после обучения)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'course_skills'
    ) THEN
        ALTER TABLE courses ADD COLUMN course_skills TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added course_skills column to courses';
    END IF;

    -- course_tools (инструменты курса)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'course_tools'
    ) THEN
        ALTER TABLE courses ADD COLUMN course_tools TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added course_tools column to courses';
    END IF;

    -- certificate_text (описание сертификата)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'certificate_text'
    ) THEN
        ALTER TABLE courses ADD COLUMN certificate_text TEXT;
        RAISE NOTICE '✅ Added certificate_text column to courses';
    END IF;

    -- job_title (должность/роль после курса)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'job_title'
    ) THEN
        ALTER TABLE courses ADD COLUMN job_title TEXT;
        RAISE NOTICE '✅ Added job_title column to courses';
    END IF;

    -- level (уровень сложности)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'level'
    ) THEN
        ALTER TABLE courses ADD COLUMN level TEXT 
            CHECK (level IN ('Начинающий', 'Средний', 'Продвинутый') OR level IS NULL);
        RAISE NOTICE '✅ Added level column to courses';
    END IF;

    -- language (язык курса)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'language'
    ) THEN
        ALTER TABLE courses ADD COLUMN language TEXT 
            CHECK (language IN ('Русский', 'Английский') OR language IS NULL);
        RAISE NOTICE '✅ Added language column to courses';
    END IF;

    -- price (цена курса)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'price'
    ) THEN
        ALTER TABLE courses ADD COLUMN price NUMERIC(10, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added price column to courses';
    END IF;

    -- duration_hours (длительность в часах)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'duration_hours'
    ) THEN
        ALTER TABLE courses ADD COLUMN duration_hours INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added duration_hours column to courses';
    END IF;

    -- rating (рейтинг курса)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'rating'
    ) THEN
        ALTER TABLE courses ADD COLUMN rating NUMERIC(3, 2) DEFAULT 0 
            CHECK (rating >= 0 AND rating <= 5);
        RAISE NOTICE '✅ Added rating column to courses';
    END IF;
END $$;

-- ============================================
-- 2. Добавляем поля в таблицу student_metrics
-- ============================================

DO $$
BEGIN
    -- completed_courses_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'completed_courses_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN completed_courses_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added completed_courses_count column to student_metrics';
    END IF;

    -- subscriptions_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'subscriptions_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN subscriptions_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added subscriptions_count column to student_metrics';
    END IF;

    -- Обновляем существующие записи
    UPDATE student_metrics 
    SET completed_courses_count = COALESCE(completed_courses_count, 0),
        subscriptions_count = COALESCE(subscriptions_count, 0)
    WHERE completed_courses_count IS NULL OR subscriptions_count IS NULL;
    
    RAISE NOTICE '✅ Updated existing student_metrics records';
END $$;

-- ============================================
-- 3. Добавляем canvas_data в таблицу chapters (если нужно)
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chapters' AND column_name = 'canvas_data'
    ) THEN
        ALTER TABLE chapters ADD COLUMN canvas_data JSONB;
        RAISE NOTICE '✅ Added canvas_data column to chapters';
    END IF;
END $$;

-- ============================================
-- 4. Расширяем типы content_blocks (добавляем test)
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'content_blocks' AND column_name = 'type'
    ) THEN
        -- Снимаем старый check, если он есть, и добавляем новый.
        BEGIN
            ALTER TABLE content_blocks DROP CONSTRAINT IF EXISTS content_blocks_type_check;
        EXCEPTION WHEN undefined_object THEN
            NULL;
        END;

        ALTER TABLE content_blocks
            ADD CONSTRAINT content_blocks_type_check
            CHECK (type IN ('theory', 'task', 'test'));

        RAISE NOTICE '✅ Updated content_blocks.type check with test';
    END IF;
END $$;

-- ============================================
-- 5. Проверяем наличие таблицы profiles и добавляем недостающие поля
-- ============================================

DO $$
BEGIN
    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to profiles';
    END IF;
END $$;

-- ============================================
-- 6. Таблица ответов пользователей по блокам контента
-- ============================================

CREATE TABLE IF NOT EXISTS user_content_block_answers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_block_id INTEGER NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
    subchapter_id INTEGER NOT NULL REFERENCES subchapters(id) ON DELETE CASCADE,
    user_answer TEXT NOT NULL DEFAULT '',
    is_correct BOOLEAN NOT NULL DEFAULT false,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, content_block_id)
);

CREATE INDEX IF NOT EXISTS idx_ucba_user_subchapter
    ON user_content_block_answers (user_id, subchapter_id);

DO $$
BEGIN
    RAISE NOTICE 'All migrations completed successfully!';
END $$;
