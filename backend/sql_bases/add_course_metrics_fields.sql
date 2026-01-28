-- Миграция для добавления недостающих полей в таблицу courses
-- Добавляет поля: level, language, price, duration_hours, rating
-- Этот скрипт безопасен для повторного запуска

DO $$
BEGIN
    -- Добавляем level (уровень сложности)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'level'
    ) THEN
        ALTER TABLE courses ADD COLUMN level TEXT 
            CHECK (level IN ('Начинающий', 'Средний', 'Продвинутый') OR level IS NULL);
        RAISE NOTICE '✅ Added level column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  level column already exists in courses';
    END IF;

    -- Добавляем language (язык курса)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'language'
    ) THEN
        ALTER TABLE courses ADD COLUMN language TEXT 
            CHECK (language IN ('Русский', 'Английский') OR language IS NULL);
        RAISE NOTICE '✅ Added language column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  language column already exists in courses';
    END IF;

    -- Добавляем price (цена курса)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'price'
    ) THEN
        ALTER TABLE courses ADD COLUMN price NUMERIC(10, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added price column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  price column already exists in courses';
    END IF;

    -- Добавляем duration_hours (длительность в часах)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'duration_hours'
    ) THEN
        ALTER TABLE courses ADD COLUMN duration_hours INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added duration_hours column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  duration_hours column already exists in courses';
    END IF;

    -- Добавляем rating (рейтинг курса)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'rating'
    ) THEN
        ALTER TABLE courses ADD COLUMN rating NUMERIC(3, 2) DEFAULT 0 
            CHECK (rating >= 0 AND rating <= 5);
        RAISE NOTICE '✅ Added rating column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  rating column already exists in courses';
    END IF;
END $$;
