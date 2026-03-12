-- Миграция: добавление полей часов теории и практики в таблицу courses
-- Поля используются на странице управления курсом (/courses/:id/manage)
-- для явного указания продолжительности курса.

DO $$
BEGIN
    -- hours_practice - количество часов практики
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'hours_practice'
    ) THEN
        ALTER TABLE courses
        ADD COLUMN hours_practice INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added hours_practice column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  hours_practice column already exists in courses';
    END IF;

    -- hours_theory - количество часов теории
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'hours_theory'
    ) THEN
        ALTER TABLE courses
        ADD COLUMN hours_theory INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added hours_theory column to courses';
    ELSE
        RAISE NOTICE 'ℹ️  hours_theory column already exists in courses';
    END IF;
END $$;

