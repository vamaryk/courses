-- Миграция: Добавление поля updated_at в таблицу profiles
-- Этот файл можно выполнить напрямую через psql или другой SQL клиент
-- если миграции через node-pg-migrate не работают

-- Проверяем, существует ли поле updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'updated_at'
    ) THEN
        -- Добавляем поле updated_at
        ALTER TABLE profiles 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Поле updated_at успешно добавлено в таблицу profiles';
    ELSE
        RAISE NOTICE 'Поле updated_at уже существует в таблице profiles';
    END IF;
END $$;
