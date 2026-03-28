DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS user_glossary_status CASCADE;
DROP TABLE IF EXISTS term_relationships CASCADE;
DROP TABLE IF EXISTS glossary_terms CASCADE;
DROP TABLE IF EXISTS glossary_maps CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_task_submissions CASCADE;
DROP TABLE IF EXISTS user_lesson_progress CASCADE;
DROP TABLE IF EXISTS user_enrollments CASCADE;
DROP TABLE IF EXISTS practice_tasks CASCADE;
DROP TABLE IF EXISTS lesson_content CASCADE;
DROP TABLE IF EXISTS content_blocks CASCADE;
DROP TABLE IF EXISTS subchapters CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS course_access CASCADE;
DROP TABLE IF EXISTS course_category_pivot CASCADE;
DROP TABLE IF EXISTS course_categories CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS instructor_metrics CASCADE;
DROP TABLE IF EXISTS student_metrics CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE; -- Add this line to drop sessions table if it exists

DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    patronymic TEXT, -- Optional
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    bio TEXT,
    date_of_birth DATE,
    phone_number TEXT,
    address TEXT,
    occupation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE student_metrics (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    courses_in_progress_count integer DEFAULT 0,
    achievements_count integer DEFAULT 0,
    total_study_time interval DEFAULT '0 seconds',
    completed_courses_count integer DEFAULT 0,
    subscriptions_count integer DEFAULT 0
);


CREATE TABLE instructor_metrics (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    courses_created_count integer DEFAULT 0,
    total_students_count integer DEFAULT 0,
    total_subscribers integer DEFAULT 0
);


CREATE TABLE achievements (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    icon_url text
);


CREATE TABLE user_achievements (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id integer REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, achievement_id)
);


CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    course_tools TEXT[] DEFAULT ARRAY[]::TEXT[],
    certificate_text TEXT,
    job_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE course_access (
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, user_id)
);

CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    short_description TEXT,
    study_minutes INTEGER,
    UNIQUE (course_id, "order")
);

CREATE TABLE subchapters (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    UNIQUE (chapter_id, "order")
);

CREATE TABLE content_blocks (
    id SERIAL PRIMARY KEY,
    subchapter_id INTEGER REFERENCES subchapters(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('theory', 'task', 'test')),
    content TEXT,
    answer TEXT,
    "order" INTEGER NOT NULL
);


CREATE TABLE user_enrollments (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    course_id integer REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at timestamp with time zone DEFAULT now(),
    completion_status text NOT NULL DEFAULT 'in_progress',
    PRIMARY KEY (user_id, course_id)
);


CREATE TABLE user_lesson_progress (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id integer REFERENCES subchapters(id) ON DELETE CASCADE,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    time_spent_seconds integer DEFAULT 0,
    PRIMARY KEY (user_id, lesson_id)
);


CREATE TABLE user_task_submissions (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    task_id integer REFERENCES content_blocks(id) ON DELETE CASCADE,
    submitted_code text,
    passed_tests boolean,
    submitted_at timestamp with time zone DEFAULT now(),
    is_final_submission boolean DEFAULT false
);


CREATE TABLE activity_logs (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    activity_date date NOT NULL,
    time_spent_minutes integer DEFAULT 0,
    course_id integer REFERENCES courses(id) ON DELETE SET NULL,
    UNIQUE (user_id, activity_date, course_id)
);


CREATE TABLE favorites (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    course_id integer REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, course_id)
);

CREATE TABLE calendar_events (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    event_type text NOT NULL,
    location text,
    created_at timestamp with time zone DEFAULT now()
);


CREATE TABLE event_attendees (
    event_id integer REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    attendance_status text DEFAULT 'pending',
    PRIMARY KEY (event_id, user_id)
);


CREATE TABLE glossary_maps (
    id serial PRIMARY KEY,
    course_id integer REFERENCES courses(id) ON DELETE CASCADE,
    generated_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    generation_timestamp timestamp with time zone DEFAULT now(),
    ai_model_version text
);

CREATE TABLE glossary_terms (
    id serial PRIMARY KEY,
    map_id integer REFERENCES glossary_maps(id) ON DELETE CASCADE,
    term_name text NOT NULL,
    definition text,
    source_lesson_id integer REFERENCES subchapters(id) ON DELETE SET NULL,
    UNIQUE (map_id, term_name)
);

CREATE TABLE term_relationships (
    id serial PRIMARY KEY,
    map_id integer REFERENCES glossary_maps(id) ON DELETE CASCADE,
    source_term_id integer REFERENCES glossary_terms(id) ON DELETE CASCADE,
    target_term_id integer REFERENCES glossary_terms(id) ON DELETE CASCADE,
    relationship_type text
);

CREATE TABLE user_glossary_status (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    term_id integer REFERENCES glossary_terms(id) ON DELETE CASCADE,
    is_unlocked boolean DEFAULT false,
    unlocked_at timestamp with time zone,
    PRIMARY KEY (user_id, term_id)
);

CREATE TABLE app_settings (
    setting_key text PRIMARY KEY,
    setting_value text NOT NULL
);

CREATE TABLE user_settings (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme text DEFAULT 'light',
    notifications_enabled boolean DEFAULT true,
    preferences jsonb
);

-- Add a new table for course categories
CREATE TABLE course_categories (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE
);

-- Add a pivot table to link courses to categories (many-to-many relationship)
CREATE TABLE course_category_pivot (
    course_id integer REFERENCES courses(id) ON DELETE CASCADE,
    category_id integer REFERENCES course_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, category_id)
);
