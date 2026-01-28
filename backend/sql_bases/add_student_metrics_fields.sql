-- Миграция для добавления недостающих полей в таблицу student_metrics
-- Добавляет поля: completed_courses_count, subscriptions_count
-- Этот скрипт безопасен для повторного запуска

DO $$
BEGIN
    -- Добавляем completed_courses_count (количество завершенных курсов)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'completed_courses_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN completed_courses_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added completed_courses_count column to student_metrics';
    ELSE
        RAISE NOTICE 'ℹ️  completed_courses_count column already exists in student_metrics';
    END IF;

    -- Добавляем subscriptions_count (количество подписок)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_metrics' AND column_name = 'subscriptions_count'
    ) THEN
        ALTER TABLE student_metrics ADD COLUMN subscriptions_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added subscriptions_count column to student_metrics';
    ELSE
        RAISE NOTICE 'ℹ️  subscriptions_count column already exists in student_metrics';
    END IF;

    -- Обновляем существующие записи, устанавливая значения по умолчанию
    UPDATE student_metrics 
    SET completed_courses_count = COALESCE(completed_courses_count, 0),
        subscriptions_count = COALESCE(subscriptions_count, 0)
    WHERE completed_courses_count IS NULL OR subscriptions_count IS NULL;
    
    RAISE NOTICE '✅ Updated existing student_metrics records with default values';
END $$;
