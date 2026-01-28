-- Insert sample course categories
INSERT INTO course_categories (id, name) VALUES
(1, 'Programming'),
(2, 'Database'),
(3, 'Web Development'),
(4, 'Security');

-- Insert sample courses
INSERT INTO courses (id, title, description, instructor_id, price, cover_image_url, duration_hours, difficulty, status, tags) VALUES
(1, 'Introduction to React', 'Learn the fundamentals of React.js for building modern web applications.', NULL, 49.99, '/public/course-react.png', 20, 'Beginner', 'published', ARRAY['React', 'Frontend', 'JavaScript']),
(2, 'Advanced Python Programming', 'Dive deep into advanced Python concepts, data structures, and algorithms.', NULL, 79.99, '/public/course-python.png', 30, 'Intermediate', 'published', ARRAY['Python', 'Backend', 'Algorithms']),
(3, 'Database Design with SQL', 'Master relational database design, SQL queries, and database management.', NULL, 59.99, 'https://example.com/sql-course.png', 25, 'Intermediate', 'published', ARRAY['SQL', 'Database', 'Backend']),
(4, 'Web Security Fundamentals', 'Understand common web vulnerabilities and how to secure your applications.', NULL, 69.99, 'https://example.com/security-course.png', 15, 'Beginner', 'published', ARRAY['Security', 'Web', 'Cybersecurity']);

-- Link courses to categories
INSERT INTO course_category_pivot (course_id, category_id) VALUES
(1, 3), -- Introduction to React -> Web Development
(2, 1), -- Advanced Python Programming -> Programming
(3, 2), -- Database Design with SQL -> Database
(4, 4); -- Web Security Fundamentals -> Security

-- Insert achievements (геймификация)
-- Используем ON CONFLICT для предотвращения дублирования при повторном запуске
-- name имеет UNIQUE constraint, поэтому используем его для проверки конфликтов
INSERT INTO achievements (name, description, icon_url) VALUES
('Первый шаг', 'Завершите свой первый урок', '/icons/achievements/first-step.svg'),
('Неделя обучения', 'Занимайтесь 7 дней подряд', '/icons/achievements/week-streak.svg'),
('Мастер курса', 'Завершите полный курс', '/icons/achievements/course-master.svg'),
('Отличник', 'Получите 100% правильных ответов в 10 заданиях подряд', '/icons/achievements/straight-a.svg'),
('Знаток', 'Изучите 50 терминов в глоссарии', '/icons/achievements/knowledge-seeker.svg')
ON CONFLICT (name) DO NOTHING;
