CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, 
    full_name text,
    avatar_url text,
    role text NOT NULL DEFAULT 'student',
    bio text,
    created_at timestamp with time zone DEFAULT now()
);


CREATE TABLE student_metrics (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    courses_in_progress_count integer DEFAULT 0,
    achievements_count integer DEFAULT 0,
    total_study_time interval DEFAULT '0 seconds' 
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
    id serial PRIMARY KEY,
    title text NOT NULL UNIQUE, -- Added UNIQUE constraint here
    description text,
    instructor_id uuid REFERENCES profiles(id) ON DELETE RESTRICT, 
    price numeric(10, 2) NOT NULL DEFAULT 0.00,
    cover_image_url text,
    duration_hours integer,
    difficulty text, 
    status text NOT NULL DEFAULT 'draft', 
    created_at timestamp with time zone DEFAULT now(),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[] -- New column for tags
);


CREATE TABLE sections (
    id serial PRIMARY KEY,
    course_id integer REFERENCES courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    "order" integer NOT NULL, 
    UNIQUE (course_id, "order")
);


CREATE TABLE lessons (
    id serial PRIMARY KEY,
    section_id integer REFERENCES sections(id) ON DELETE CASCADE,
    title text NOT NULL,
    type text NOT NULL, 
    duration_minutes integer,
    "order" integer NOT NULL, 
    UNIQUE (section_id, "order")
);


CREATE TABLE lesson_content (
    lesson_id integer PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
    html_content text, 
    video_url text
);


CREATE TABLE practice_tasks (
    lesson_id integer PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
    description text NOT NULL,
    initial_code jsonb,
    solution_code text,
    test_cases jsonb 
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
    lesson_id integer REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    time_spent_seconds integer DEFAULT 0, 
    PRIMARY KEY (user_id, lesson_id)
);


CREATE TABLE user_task_submissions (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    task_id integer REFERENCES practice_tasks(lesson_id) ON DELETE CASCADE, 
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
    source_lesson_id integer REFERENCES lessons(id) ON DELETE SET NULL, 
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
