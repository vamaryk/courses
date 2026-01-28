-- Скрипт для выдачи достижений пользователю
-- Пользователь ID: e242f96d-13c1-4e06-bfc2-ef0640640a1b

-- Сначала проверяем, что пользователь существует
DO $$
DECLARE
    user_exists BOOLEAN;
    achievement1_id INTEGER;
    achievement2_id INTEGER;
BEGIN
    -- Проверяем существование пользователя
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = 'e242f96d-13c1-4e06-bfc2-ef0640640a1b') INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'Пользователь с ID e242f96d-13c1-4e06-bfc2-ef0640640a1b не найден';
    END IF;
    
    -- Получаем ID достижений (первые 2 из списка)
    SELECT id INTO achievement1_id FROM achievements WHERE name = 'Первый шаг' LIMIT 1;
    SELECT id INTO achievement2_id FROM achievements WHERE name = 'Неделя обучения' LIMIT 1;
    
    IF achievement1_id IS NULL OR achievement2_id IS NULL THEN
        RAISE EXCEPTION 'Достижения не найдены. Убедитесь, что seed-данные загружены.';
    END IF;
    
    -- Выдаем достижения пользователю (используем ON CONFLICT для предотвращения дублирования)
    INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES
    ('e242f96d-13c1-4e06-bfc2-ef0640640a1b', achievement1_id, NOW()),
    ('e242f96d-13c1-4e06-bfc2-ef0640640a1b', achievement2_id, NOW())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    RAISE NOTICE 'Достижения успешно выданы пользователю e242f96d-13c1-4e06-bfc2-ef0640640a1b';
    RAISE NOTICE 'Достижение 1 (ID: %): Первый шаг', achievement1_id;
    RAISE NOTICE 'Достижение 2 (ID: %): Неделя обучения', achievement2_id;
END $$;

-- Проверка результата
SELECT 
    ua.user_id,
    a.name AS achievement_name,
    a.description,
    ua.unlocked_at
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.user_id = 'e242f96d-13c1-4e06-bfc2-ef0640640a1b'
ORDER BY ua.unlocked_at DESC;
