-- Скрипт для добавления недостающих полей в таблицу courses
-- Проверяет наличие полей и добавляет их, если они отсутствуют

DO $$
BEGIN
    -- Добавляем cover_image, если его нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'cover_image'
    ) THEN
        ALTER TABLE courses ADD COLUMN cover_image TEXT;
        RAISE NOTICE 'Added cover_image column to courses';
    END IF;

    -- Добавляем tags, если его нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'tags'
    ) THEN
        ALTER TABLE courses ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Added tags column to courses';
    END IF;

    -- Добавляем specialty, если его нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'specialty'
    ) THEN
        ALTER TABLE courses ADD COLUMN specialty TEXT;
        RAISE NOTICE 'Added specialty column to courses';
    END IF;

    -- Добавляем target_audience, если его нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'target_audience'
    ) THEN
        ALTER TABLE courses ADD COLUMN target_audience TEXT;
        RAISE NOTICE 'Added target_audience column to courses';
    END IF;

    -- Добавляем about_course, если его нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'about_course'
    ) THEN
        ALTER TABLE courses ADD COLUMN about_course TEXT;
        RAISE NOTICE 'Added about_course column to courses';
    END IF;
END $$;
