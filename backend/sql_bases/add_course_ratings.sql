-- Таблица оценок курсов пользователями (только записанные на курс, не авторы)
-- Один пользователь — одна оценка на курс (1–5).

CREATE TABLE IF NOT EXISTS course_ratings (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_ratings_course_id ON course_ratings(course_id);

COMMENT ON TABLE course_ratings IS 'Оценки курсов от пользователей (только записанных на курс)';
