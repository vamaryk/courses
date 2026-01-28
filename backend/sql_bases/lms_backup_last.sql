--
-- PostgreSQL database dump
--

\restrict LEMKuUFPDiS7GowdmAPgdHJkMtsw8zK029uwV1cvYbXri26tv8uj5vuNU1Ugycu

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2026-01-22 09:05:37

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 229 (class 1259 OID 57647)
-- Name: achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achievements (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    icon_url text
);


ALTER TABLE public.achievements OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 57646)
-- Name: achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.achievements_id_seq OWNER TO postgres;

--
-- TOC entry 5133 (class 0 OID 0)
-- Dependencies: 228
-- Name: achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.achievements_id_seq OWNED BY public.achievements.id;


--
-- TOC entry 244 (class 1259 OID 57806)
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id uuid,
    activity_date date NOT NULL,
    time_spent_minutes integer DEFAULT 0,
    course_id integer
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 57805)
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5134 (class 0 OID 0)
-- Dependencies: 243
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- TOC entry 256 (class 1259 OID 57954)
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    setting_key text NOT NULL,
    setting_value text NOT NULL
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 57841)
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_events (
    id integer NOT NULL,
    user_id uuid,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    event_type text NOT NULL,
    location text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.calendar_events OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 57840)
-- Name: calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.calendar_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.calendar_events_id_seq OWNER TO postgres;

--
-- TOC entry 5135 (class 0 OID 0)
-- Dependencies: 246
-- Name: calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.calendar_events_id_seq OWNED BY public.calendar_events.id;


--
-- TOC entry 235 (class 1259 OID 57706)
-- Name: chapters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chapters (
    id integer NOT NULL,
    course_id integer,
    title text NOT NULL,
    "order" integer NOT NULL
);


ALTER TABLE public.chapters OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 57705)
-- Name: chapters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chapters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chapters_id_seq OWNER TO postgres;

--
-- TOC entry 5136 (class 0 OID 0)
-- Dependencies: 234
-- Name: chapters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chapters_id_seq OWNED BY public.chapters.id;


--
-- TOC entry 239 (class 1259 OID 57738)
-- Name: content_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_blocks (
    id integer NOT NULL,
    subchapter_id integer,
    type text NOT NULL,
    content text,
    answer text,
    "order" integer NOT NULL,
    CONSTRAINT content_blocks_type_check CHECK ((type = ANY (ARRAY['theory'::text, 'task'::text])))
);


ALTER TABLE public.content_blocks OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 57737)
-- Name: content_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.content_blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.content_blocks_id_seq OWNER TO postgres;

--
-- TOC entry 5137 (class 0 OID 0)
-- Dependencies: 238
-- Name: content_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.content_blocks_id_seq OWNED BY public.content_blocks.id;


--
-- TOC entry 233 (class 1259 OID 57690)
-- Name: course_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_access (
    course_id integer NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.course_access OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 57976)
-- Name: course_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_categories (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.course_categories OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 57975)
-- Name: course_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.course_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.course_categories_id_seq OWNER TO postgres;

--
-- TOC entry 5138 (class 0 OID 0)
-- Dependencies: 258
-- Name: course_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.course_categories_id_seq OWNED BY public.course_categories.id;


--
-- TOC entry 260 (class 1259 OID 57986)
-- Name: course_category_pivot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_category_pivot (
    course_id integer NOT NULL,
    category_id integer NOT NULL
);


ALTER TABLE public.course_category_pivot OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 32967)
-- Name: course_tag_pivot; Type: TABLE; Schema: public; Owner: dirtysas
--

CREATE TABLE public.course_tag_pivot (
    course_id integer NOT NULL,
    tag_id integer NOT NULL
);


ALTER TABLE public.course_tag_pivot OWNER TO dirtysas;

--
-- TOC entry 263 (class 1259 OID 58043)
-- Name: course_tags; Type: TABLE; Schema: public; Owner: dirtysas
--

CREATE TABLE public.course_tags (
    course_id integer NOT NULL,
    tag_id integer NOT NULL
);


ALTER TABLE public.course_tags OWNER TO dirtysas;

--
-- TOC entry 232 (class 1259 OID 57674)
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    is_public boolean DEFAULT false NOT NULL,
    author_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 57673)
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO postgres;

--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 231
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- TOC entry 248 (class 1259 OID 57855)
-- Name: event_attendees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_attendees (
    event_id integer NOT NULL,
    user_id uuid NOT NULL,
    attendance_status text DEFAULT 'pending'::text
);


ALTER TABLE public.event_attendees OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 57825)
-- Name: favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    course_id integer NOT NULL
);


ALTER TABLE public.favorites OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 57874)
-- Name: glossary_maps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.glossary_maps (
    id integer NOT NULL,
    course_id integer,
    generated_by_user_id uuid,
    generation_timestamp timestamp with time zone DEFAULT now(),
    ai_model_version text
);


ALTER TABLE public.glossary_maps OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 57873)
-- Name: glossary_maps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.glossary_maps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.glossary_maps_id_seq OWNER TO postgres;

--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 249
-- Name: glossary_maps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.glossary_maps_id_seq OWNED BY public.glossary_maps.id;


--
-- TOC entry 252 (class 1259 OID 57894)
-- Name: glossary_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.glossary_terms (
    id integer NOT NULL,
    map_id integer,
    term_name text NOT NULL,
    definition text,
    source_lesson_id integer
);


ALTER TABLE public.glossary_terms OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 57893)
-- Name: glossary_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.glossary_terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.glossary_terms_id_seq OWNER TO postgres;

--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 251
-- Name: glossary_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.glossary_terms_id_seq OWNED BY public.glossary_terms.id;


--
-- TOC entry 227 (class 1259 OID 57633)
-- Name: instructor_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instructor_metrics (
    user_id uuid NOT NULL,
    courses_created_count integer DEFAULT 0,
    total_students_count integer DEFAULT 0,
    total_subscribers integer DEFAULT 0
);


ALTER TABLE public.instructor_metrics OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 41920)
-- Name: lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons (
    id integer NOT NULL,
    section_id integer,
    title text NOT NULL,
    type text NOT NULL,
    duration_minutes integer,
    "order" integer NOT NULL
);


ALTER TABLE public.lessons OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 41919)
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lessons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lessons_id_seq OWNER TO postgres;

--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 221
-- Name: lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;


--
-- TOC entry 224 (class 1259 OID 57594)
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    patronymic text,
    avatar_url text,
    role text DEFAULT 'student'::text NOT NULL,
    bio text,
    date_of_birth date,
    phone_number text,
    address text,
    occupation text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 41904)
-- Name: sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sections (
    id integer NOT NULL,
    course_id integer,
    title text NOT NULL,
    "order" integer NOT NULL
);


ALTER TABLE public.sections OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 41903)
-- Name: sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sections_id_seq OWNER TO postgres;

--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 219
-- Name: sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sections_id_seq OWNED BY public.sections.id;


--
-- TOC entry 225 (class 1259 OID 57608)
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    session_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 57620)
-- Name: student_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_metrics (
    user_id uuid NOT NULL,
    courses_in_progress_count integer DEFAULT 0,
    achievements_count integer DEFAULT 0,
    total_study_time interval DEFAULT '00:00:00'::interval
);


ALTER TABLE public.student_metrics OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 57722)
-- Name: subchapters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subchapters (
    id integer NOT NULL,
    chapter_id integer,
    title text NOT NULL,
    "order" integer NOT NULL
);


ALTER TABLE public.subchapters OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 57721)
-- Name: subchapters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subchapters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subchapters_id_seq OWNER TO postgres;

--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 236
-- Name: subchapters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subchapters_id_seq OWNED BY public.subchapters.id;


--
-- TOC entry 262 (class 1259 OID 58033)
-- Name: tags; Type: TABLE; Schema: public; Owner: dirtysas
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.tags OWNER TO dirtysas;

--
-- TOC entry 261 (class 1259 OID 58032)
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: dirtysas
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO dirtysas;

--
-- TOC entry 5145 (class 0 OID 0)
-- Dependencies: 261
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dirtysas
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- TOC entry 254 (class 1259 OID 57915)
-- Name: term_relationships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.term_relationships (
    id integer NOT NULL,
    map_id integer,
    source_term_id integer,
    target_term_id integer,
    relationship_type text
);


ALTER TABLE public.term_relationships OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 57914)
-- Name: term_relationships_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.term_relationships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.term_relationships_id_seq OWNER TO postgres;

--
-- TOC entry 5146 (class 0 OID 0)
-- Dependencies: 253
-- Name: term_relationships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.term_relationships_id_seq OWNED BY public.term_relationships.id;


--
-- TOC entry 230 (class 1259 OID 57657)
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_achievements (
    user_id uuid NOT NULL,
    achievement_id integer NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_achievements OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 57752)
-- Name: user_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_enrollments (
    user_id uuid NOT NULL,
    course_id integer NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now(),
    completion_status text DEFAULT 'in_progress'::text NOT NULL
);


ALTER TABLE public.user_enrollments OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 57938)
-- Name: user_glossary_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_glossary_status (
    user_id uuid NOT NULL,
    term_id integer NOT NULL,
    is_unlocked boolean DEFAULT false,
    unlocked_at timestamp with time zone
);


ALTER TABLE public.user_glossary_status OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 58059)
-- Name: user_history; Type: TABLE; Schema: public; Owner: dirtysas
--

CREATE TABLE public.user_history (
    id integer NOT NULL,
    user_id uuid,
    course_id integer,
    viewed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_history OWNER TO dirtysas;

--
-- TOC entry 264 (class 1259 OID 58058)
-- Name: user_history_id_seq; Type: SEQUENCE; Schema: public; Owner: dirtysas
--

CREATE SEQUENCE public.user_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_history_id_seq OWNER TO dirtysas;

--
-- TOC entry 5147 (class 0 OID 0)
-- Dependencies: 264
-- Name: user_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dirtysas
--

ALTER SEQUENCE public.user_history_id_seq OWNED BY public.user_history.id;


--
-- TOC entry 241 (class 1259 OID 57771)
-- Name: user_lesson_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_lesson_progress (
    user_id uuid NOT NULL,
    lesson_id integer NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    time_spent_seconds integer DEFAULT 0
);


ALTER TABLE public.user_lesson_progress OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 57961)
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_settings (
    user_id uuid NOT NULL,
    theme text DEFAULT 'light'::text,
    notifications_enabled boolean DEFAULT true,
    preferences jsonb
);


ALTER TABLE public.user_settings OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 57788)
-- Name: user_task_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_task_submissions (
    user_id uuid,
    task_id integer,
    submitted_code text,
    passed_tests boolean,
    submitted_at timestamp with time zone DEFAULT now(),
    is_final_submission boolean DEFAULT false
);


ALTER TABLE public.user_task_submissions OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 57583)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 4775 (class 2604 OID 57650)
-- Name: achievements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements ALTER COLUMN id SET DEFAULT nextval('public.achievements_id_seq'::regclass);


--
-- TOC entry 4790 (class 2604 OID 57809)
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- TOC entry 4792 (class 2604 OID 57844)
-- Name: calendar_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events ALTER COLUMN id SET DEFAULT nextval('public.calendar_events_id_seq'::regclass);


--
-- TOC entry 4781 (class 2604 OID 57709)
-- Name: chapters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters ALTER COLUMN id SET DEFAULT nextval('public.chapters_id_seq'::regclass);


--
-- TOC entry 4783 (class 2604 OID 57741)
-- Name: content_blocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_blocks ALTER COLUMN id SET DEFAULT nextval('public.content_blocks_id_seq'::regclass);


--
-- TOC entry 4802 (class 2604 OID 57979)
-- Name: course_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_categories ALTER COLUMN id SET DEFAULT nextval('public.course_categories_id_seq'::regclass);


--
-- TOC entry 4777 (class 2604 OID 57677)
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- TOC entry 4795 (class 2604 OID 57877)
-- Name: glossary_maps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_maps ALTER COLUMN id SET DEFAULT nextval('public.glossary_maps_id_seq'::regclass);


--
-- TOC entry 4797 (class 2604 OID 57897)
-- Name: glossary_terms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_terms ALTER COLUMN id SET DEFAULT nextval('public.glossary_terms_id_seq'::regclass);


--
-- TOC entry 4762 (class 2604 OID 41923)
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);


--
-- TOC entry 4761 (class 2604 OID 41907)
-- Name: sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections ALTER COLUMN id SET DEFAULT nextval('public.sections_id_seq'::regclass);


--
-- TOC entry 4782 (class 2604 OID 57725)
-- Name: subchapters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subchapters ALTER COLUMN id SET DEFAULT nextval('public.subchapters_id_seq'::regclass);


--
-- TOC entry 4803 (class 2604 OID 58036)
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- TOC entry 4798 (class 2604 OID 57918)
-- Name: term_relationships id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_relationships ALTER COLUMN id SET DEFAULT nextval('public.term_relationships_id_seq'::regclass);


--
-- TOC entry 4804 (class 2604 OID 58062)
-- Name: user_history id; Type: DEFAULT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.user_history ALTER COLUMN id SET DEFAULT nextval('public.user_history_id_seq'::regclass);


--
-- TOC entry 5091 (class 0 OID 57647)
-- Dependencies: 229
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achievements (id, name, description, icon_url) FROM stdin;
1	Первый шаг	Завершите свой первый урок	/icons/achievements/first-step.svg
2	Неделя обучения	Занимайтесь 7 дней подряд	/icons/achievements/week-streak.svg
3	Мастер курса	Завершите полный курс	/icons/achievements/course-master.svg
4	Отличник	Получите 100% правильных ответов в 10 заданиях подряд	/icons/achievements/straight-a.svg
5	Знаток	Изучите 50 терминов в глоссарии	/icons/achievements/knowledge-seeker.svg
\.


--
-- TOC entry 5106 (class 0 OID 57806)
-- Dependencies: 244
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, user_id, activity_date, time_spent_minutes, course_id) FROM stdin;
\.


--
-- TOC entry 5118 (class 0 OID 57954)
-- Dependencies: 256
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (setting_key, setting_value) FROM stdin;
\.


--
-- TOC entry 5109 (class 0 OID 57841)
-- Dependencies: 247
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.calendar_events (id, user_id, title, description, start_time, end_time, event_type, location, created_at) FROM stdin;
\.


--
-- TOC entry 5097 (class 0 OID 57706)
-- Dependencies: 235
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chapters (id, course_id, title, "order") FROM stdin;
1	1	Введение	1
5	1	Основы React	2
6	1	Состояние компонентов	3
7	1	Работа с формами	4
9	1	Маршрутизация	5
10	2	Python: Привет, Мир!	1
11	3	Новая глава 1	1
12	3	Новая глава 2	2
20	3	Новая глава 2	3
21	3	Новая глава 4	4
22	4	Новая глава 1	1
23	5	Скачивание нужных программ	1
24	5	Введение в программирование на языке Python	2
25	5	Глава 3	3
\.


--
-- TOC entry 5101 (class 0 OID 57738)
-- Dependencies: 239
-- Data for Name: content_blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_blocks (id, subchapter_id, type, content, answer, "order") FROM stdin;
1	1	theory	Ключевые преимущества обеспечения качества (QA):\n\n    понимание текущего качества разрабатываемого ПО и возможность влиять на него;\n    предсказуемость поведения системы благодаря контролю качества и поиску дефектов — все элементы интерфейса и фрагменты кода будут под контролем;\n    предоставление клиентам валидного и корректно работающего продукта, а удовлетворённость клиентов — залог успеха и получения желаемой выручки;\n    оптимизация бюджета на исправление дефектов после релиза.\n	\N	1
2	3	theory	Изучение нового языка программирования традиционно начинается с 'Hello, World!'. Это простая программа, которая выводит приветствие на экран и заодно знакомит с новым языком — его синтаксисом и структурой программы.\n\nHello, World!\n\nЭтой традиции уже больше сорока лет, поэтому и мы не будем нарушать ее. В первом уроке мы напишем программу Hello, World!. На Python это программа выглядит так:\n\nprint('Hello, World!')\n\nprint() — это команда, которая работает по определённому шаблону: в скобках указывается текст для вывода на экран. Мы можем передавать туда любой другой текст.\n\nprint('Хекслет - школа программирования')\n\nКоманда остаётся той же, меняется только содержимое скобок. Чтобы программа понимала, что это именно текст, он заключается в кавычки. Можно использовать одинарные '...' или двойные "...", главное — чтобы открывающая и закрывающая кавычки совпадали.\n\nprint("Хекслет - школа программирования")\n\nПо принятому в Python стандарту оформления кода (PEP 8) рекомендуется использовать одинарные кавычки для строк, если внутри них нет апострофа. Это делает код более единообразным.\nЗначение символов\n\nПрограммирование — это не просто текст на английском. Код состоит из команд, и каждая из них должна быть написана в определённой форме. Для этого используются не только буквы, но и специальные символы: кавычки ' и ", скобки (), запятая ,, восклицательный знак !. Они не случайные — каждый символ имеет своё значение. Если пропустить знак или перепутать его, программа не запустится.\n\nДаже небольшое отличие, например одна лишняя буква или другой знак, может привести к тому, что программа не будет работать. Это относится и к такому понятию, как регистр — различию между большими и маленькими буквами. Если в обычном тексте Привет и привет выглядят одинаково, то для Python (как и других языков) это разные слова. Поэтому print, Print и PRINT — это разные команды, и сработает только первый вариант.\nГде практиковаться\n\nОбучение программированию происходит эффективнее, когда помимо чтении теории и выполнении заданий, вы будете практиковаться вызывая код в специальной среде (интерактивная оболочка или REPL), где можно выполнять код на Python построчно. Регулярно повторяйте все что вы видите в уроке тут\nЗадание\n\nНаберите в редакторе код из задания символ в символ и запустите его на выполнение (кнопка внизу редактора)\n\nprint('Hello, World!')	\N	1
3	4	theory	Новый блок контента	\N	1
4	4	theory	Новый блок контента	\N	2
5	4	theory	Новый блок контента	\N	3
6	5	theory	Новый блок контента	\N	1
7	6	theory	Новый блок контента	\N	1
\.


--
-- TOC entry 5095 (class 0 OID 57690)
-- Dependencies: 233
-- Data for Name: course_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_access (course_id, user_id) FROM stdin;
\.


--
-- TOC entry 5121 (class 0 OID 57976)
-- Dependencies: 259
-- Data for Name: course_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_categories (id, name) FROM stdin;
\.


--
-- TOC entry 5122 (class 0 OID 57986)
-- Dependencies: 260
-- Data for Name: course_category_pivot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_category_pivot (course_id, category_id) FROM stdin;
\.


--
-- TOC entry 5080 (class 0 OID 32967)
-- Dependencies: 218
-- Data for Name: course_tag_pivot; Type: TABLE DATA; Schema: public; Owner: dirtysas
--

COPY public.course_tag_pivot (course_id, tag_id) FROM stdin;
\.


--
-- TOC entry 5125 (class 0 OID 58043)
-- Dependencies: 263
-- Data for Name: course_tags; Type: TABLE DATA; Schema: public; Owner: dirtysas
--

COPY public.course_tags (course_id, tag_id) FROM stdin;
\.


--
-- TOC entry 5094 (class 0 OID 57674)
-- Dependencies: 232
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, title, description, is_public, author_id, created_at, updated_at) FROM stdin;
3	C#		t	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 15:11:03.804124+04	2025-11-03 16:23:08.778795+04
2	Курс Python		f	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-24 23:37:49.685397+04	2025-11-03 16:23:47.619752+04
1	Жеский реакт	реактим реакт	t	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-21 22:31:51.204433+04	2025-11-03 16:24:09.77051+04
4	React course	Simple programming course for junior developer where they can learn how to make some fuctions and how to use new library react-bits	t	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-13 11:11:28.623037+04	2026-01-13 11:11:28.623037+04
5	Python курс для начинающих	знакомит с основными типами данных, конструкциями и принципами структурного программирования языка Python.\n\nЦелевая аудитория – школьники, студенты и взрослые люди, заинтересованные в изучении программирования; педагоги школ, вузов и кружков, преподающие программирование на языке Python.	f	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-18 17:55:06.779497+04	2026-01-18 17:55:06.779497+04
\.


--
-- TOC entry 5110 (class 0 OID 57855)
-- Dependencies: 248
-- Data for Name: event_attendees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_attendees (event_id, user_id, attendance_status) FROM stdin;
\.


--
-- TOC entry 5107 (class 0 OID 57825)
-- Dependencies: 245
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.favorites (user_id, course_id) FROM stdin;
\.


--
-- TOC entry 5112 (class 0 OID 57874)
-- Dependencies: 250
-- Data for Name: glossary_maps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.glossary_maps (id, course_id, generated_by_user_id, generation_timestamp, ai_model_version) FROM stdin;
\.


--
-- TOC entry 5114 (class 0 OID 57894)
-- Dependencies: 252
-- Data for Name: glossary_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.glossary_terms (id, map_id, term_name, definition, source_lesson_id) FROM stdin;
\.


--
-- TOC entry 5089 (class 0 OID 57633)
-- Dependencies: 227
-- Data for Name: instructor_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.instructor_metrics (user_id, courses_created_count, total_students_count, total_subscribers) FROM stdin;
\.


--
-- TOC entry 5084 (class 0 OID 41920)
-- Dependencies: 222
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lessons (id, section_id, title, type, duration_minutes, "order") FROM stdin;
\.


--
-- TOC entry 5086 (class 0 OID 57594)
-- Dependencies: 224
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, first_name, last_name, patronymic, avatar_url, role, bio, date_of_birth, phone_number, address, occupation, created_at) FROM stdin;
cde4f873-1872-4fcd-8c9d-85a71be22a1b	dirtysass	dirtysass	dirtysass	\N	student	\N	2004-07-31	+79379742818	\N	\N	2025-10-21 22:09:52.857674+04
27e63713-011f-468c-8807-5565a391af3f	dirtysass123	dirtysass123	dirtysass123	\N	student	\N	2004-12-13	+79379742818	\N	\N	2025-10-26 21:40:35.632863+04
188145b3-1750-4402-a2e2-274ebcd2ae67	Test	User	\N	\N	student	\N	\N	\N	\N	\N	2025-10-27 22:31:59.329622+04
e242f96d-13c1-4e06-bfc2-ef0640640a1b	Test2	Test2	Test2	\N	student	\N	2004-03-31		\N	\N	2026-01-10 21:28:30.278154+04
\.


--
-- TOC entry 5082 (class 0 OID 41904)
-- Dependencies: 220
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sections (id, course_id, title, "order") FROM stdin;
\.


--
-- TOC entry 5087 (class 0 OID 57608)
-- Dependencies: 225
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (session_id, user_id, expires_at, created_at) FROM stdin;
b778cce6-4b1a-460b-86de-8c1872988322	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-22 22:09:52.864+04	2025-10-21 22:09:52.865926+04
4632ac07-68e1-43fc-b840-1b0b4cf13b74	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-22 23:01:58.807+04	2025-10-21 23:01:58.808738+04
5e654649-7c9f-485d-a5f9-2042a0f71a24	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-25 23:36:42.403+04	2025-10-24 23:36:42.404348+04
22cb43e3-0b69-4220-8f42-0a3935940fcf	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 21:36:36.7+04	2025-10-26 21:36:36.702023+04
07872fc6-e6f5-4925-8229-6a05bcea99b0	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 21:39:54.21+04	2025-10-26 21:39:54.211047+04
0f3b123a-fd9a-4673-a5d1-e58c07512c62	27e63713-011f-468c-8807-5565a391af3f	2025-10-27 21:40:35.637+04	2025-10-26 21:40:35.63821+04
4e7569ea-903f-4247-8779-d362cafbaeed	27e63713-011f-468c-8807-5565a391af3f	2025-10-27 21:40:42.419+04	2025-10-26 21:40:42.420413+04
8bd7386b-f98d-45d3-b903-b7321165788e	27e63713-011f-468c-8807-5565a391af3f	2025-10-27 21:43:15.607+04	2025-10-26 21:43:15.60792+04
f2b7de42-4d5b-454f-ac1d-69c8e246aaed	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 21:48:07.201+04	2025-10-26 21:48:07.203102+04
2f94c7c1-fada-4778-b492-e6d71a70df95	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 22:35:15.013+04	2025-10-26 22:35:15.014117+04
7d5d4564-9a19-44c4-be9a-903a831ea1ed	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 22:38:15.922+04	2025-10-26 22:38:15.923607+04
72c6a2ea-1fa3-42da-b89d-9f5cfeef73b2	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 22:38:56.861+04	2025-10-26 22:38:56.862168+04
64367d75-0a39-4310-8592-d6745985870c	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 22:48:10.18+04	2025-10-26 22:48:10.181089+04
fbc24962-1d2c-4388-b386-6daf23f8b942	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 22:53:05.174+04	2025-10-26 22:53:05.175494+04
5a0bd7ed-c65b-4dd8-afc5-0de580b2283f	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 22:53:16.094+04	2025-10-26 22:53:16.094983+04
674da2c6-bda0-4068-8549-b539081c47ec	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 22:55:37.645+04	2025-10-26 22:55:37.64596+04
61d58a1c-a159-4450-8ccf-b6e7b8faf076	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 22:56:21.484+04	2025-10-26 22:56:21.485003+04
d6b4bb0a-85fc-4c09-aa35-fdb2e66ff159	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 23:37:30.422+04	2025-10-26 23:37:30.42375+04
b6adb502-2b15-4fce-9325-67b95874585f	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-27 23:38:44.594+04	2025-10-26 23:38:44.596058+04
e6287772-b953-4c27-b9d1-fb9c9334cd48	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-28 10:34:39.001+04	2025-10-27 10:34:39.002614+04
94448a43-615a-4934-bb12-d8681708b43a	188145b3-1750-4402-a2e2-274ebcd2ae67	2025-10-28 22:31:59.333+04	2025-10-27 22:31:59.333812+04
59ebb1b3-c651-433f-8469-a263f3602171	188145b3-1750-4402-a2e2-274ebcd2ae67	2025-10-28 22:31:59.403+04	2025-10-27 22:31:59.404093+04
e5c03d07-3ba0-421e-b691-4f4e72b49aea	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-29 09:40:37.852+04	2025-10-28 09:40:37.853993+04
e6e78cbc-5c81-4b6b-9d2b-c1941f6eb8a0	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-10-31 23:37:27.894+04	2025-10-30 23:37:27.895379+04
90593ec7-fc72-4209-b8be-9e6d63887859	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-11-02 23:10:33.341+04	2025-11-01 23:10:33.342711+04
dc9cd6d6-0326-421b-b0ee-7a2d0f50a526	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-11-02 23:13:18.297+04	2025-11-01 23:13:18.298613+04
a742680a-67bc-4643-b332-6361da7c5c6d	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-11-04 16:21:16.244+04	2025-11-03 16:21:16.245208+04
bc8d8c91-c063-4304-8cab-9d1bf174156e	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-11-11 22:42:52.52+04	2025-11-10 22:42:52.521639+04
a4c6bf67-33bf-4ef7-b099-5a5c2a8cba1c	cde4f873-1872-4fcd-8c9d-85a71be22a1b	2025-11-14 17:47:08.034+04	2025-11-13 17:47:08.035155+04
937d15cd-12d5-42a5-9326-3b7bdda6386b	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-11 21:28:30.303+04	2026-01-10 21:28:30.304336+04
8b9f7a67-f37e-4a91-bc58-1b35fc440480	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-11 21:28:31.949+04	2026-01-10 21:28:31.949582+04
3d76caf1-aef6-43a5-805c-198e2da04445	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-11 22:08:14.569+04	2026-01-10 22:08:14.570757+04
81fe1931-c73f-4480-97ce-97a37916d4d3	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-14 10:56:56.038+04	2026-01-13 10:56:56.039335+04
7865495e-7b66-4670-89c8-161c4858e796	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-14 11:08:12.761+04	2026-01-13 11:08:12.762972+04
aa5cb423-6907-4b8b-93ee-be123342b5b3	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-14 12:36:04.181+04	2026-01-13 12:36:04.182249+04
3682da66-7eb2-4321-ad02-2bca5aba293b	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-18 23:54:33.132+04	2026-01-17 23:54:33.133895+04
fe6bb790-5279-4702-9a8c-06ffab1dc235	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-19 16:38:39.483+04	2026-01-18 16:38:39.483809+04
37f64301-dec7-4ad8-9612-083a58bcf853	e242f96d-13c1-4e06-bfc2-ef0640640a1b	2026-01-23 09:00:10.823+04	2026-01-22 09:00:10.823669+04
\.


--
-- TOC entry 5088 (class 0 OID 57620)
-- Dependencies: 226
-- Data for Name: student_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_metrics (user_id, courses_in_progress_count, achievements_count, total_study_time) FROM stdin;
\.


--
-- TOC entry 5099 (class 0 OID 57722)
-- Dependencies: 237
-- Data for Name: subchapters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subchapters (id, chapter_id, title, "order") FROM stdin;
1	1	123	1
2	1	qweqweqweqweqwe	2
3	10	Основы	1
4	11	Новая подглава 1	1
5	12	Объекты	1
6	22	Новая подглава 1	1
\.


--
-- TOC entry 5124 (class 0 OID 58033)
-- Dependencies: 262
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: dirtysas
--

COPY public.tags (id, name) FROM stdin;
\.


--
-- TOC entry 5116 (class 0 OID 57915)
-- Dependencies: 254
-- Data for Name: term_relationships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.term_relationships (id, map_id, source_term_id, target_term_id, relationship_type) FROM stdin;
\.


--
-- TOC entry 5092 (class 0 OID 57657)
-- Dependencies: 230
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_achievements (user_id, achievement_id, unlocked_at) FROM stdin;
e242f96d-13c1-4e06-bfc2-ef0640640a1b	1	2026-01-18 18:19:58.952936+04
e242f96d-13c1-4e06-bfc2-ef0640640a1b	2	2026-01-18 18:19:58.952936+04
\.


--
-- TOC entry 5102 (class 0 OID 57752)
-- Dependencies: 240
-- Data for Name: user_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_enrollments (user_id, course_id, enrolled_at, completion_status) FROM stdin;
\.


--
-- TOC entry 5117 (class 0 OID 57938)
-- Dependencies: 255
-- Data for Name: user_glossary_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_glossary_status (user_id, term_id, is_unlocked, unlocked_at) FROM stdin;
\.


--
-- TOC entry 5127 (class 0 OID 58059)
-- Dependencies: 265
-- Data for Name: user_history; Type: TABLE DATA; Schema: public; Owner: dirtysas
--

COPY public.user_history (id, user_id, course_id, viewed_at) FROM stdin;
1	cde4f873-1872-4fcd-8c9d-85a71be22a1b	3	2025-11-13 17:47:29.937572+04
2	cde4f873-1872-4fcd-8c9d-85a71be22a1b	3	2025-11-13 17:47:29.948564+04
3	cde4f873-1872-4fcd-8c9d-85a71be22a1b	3	2025-11-13 17:55:10.924329+04
4	cde4f873-1872-4fcd-8c9d-85a71be22a1b	3	2025-11-13 17:55:10.925975+04
\.


--
-- TOC entry 5103 (class 0 OID 57771)
-- Dependencies: 241
-- Data for Name: user_lesson_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_lesson_progress (user_id, lesson_id, is_completed, completed_at, time_spent_seconds) FROM stdin;
\.


--
-- TOC entry 5119 (class 0 OID 57961)
-- Dependencies: 257
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_settings (user_id, theme, notifications_enabled, preferences) FROM stdin;
\.


--
-- TOC entry 5104 (class 0 OID 57788)
-- Dependencies: 242
-- Data for Name: user_task_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_task_submissions (user_id, task_id, submitted_code, passed_tests, submitted_at, is_final_submission) FROM stdin;
\.


--
-- TOC entry 5085 (class 0 OID 57583)
-- Dependencies: 223
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, created_at) FROM stdin;
cde4f873-1872-4fcd-8c9d-85a71be22a1b	dirtysass@mail.ru	$2b$10$wE.n9.QiXk9HO5PGWWxKHugfvFbO9v1iiSsAY4wkzBcT6bJfML6x2	2025-10-21 22:09:52.834855+04
27e63713-011f-468c-8807-5565a391af3f	dirtysass123@mail.ru	$2b$10$ylntOU73l2mOlOfD3ZzBJeWCsSKDgbb/9F6sccSZJ.GTMHuiGPlr2	2025-10-26 21:40:35.623758+04
188145b3-1750-4402-a2e2-274ebcd2ae67	test1761589919137@example.com	$2b$10$qkCN5VJ3MYRBDJ2Q0bGXMuvYVRP5yDV0fjR3ET0H/Q/RvYpfX0dB.	2025-10-27 22:31:59.313619+04
e242f96d-13c1-4e06-bfc2-ef0640640a1b	dirtysas@yandex.ru	$2b$10$S6R0rXZ5aQ.THsC.4ePhBe.iEDuI5p95zmfu0GWcqzU9MeVhgxvEe	2026-01-10 21:28:30.238755+04
\.


--
-- TOC entry 5148 (class 0 OID 0)
-- Dependencies: 228
-- Name: achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.achievements_id_seq', 5, true);


--
-- TOC entry 5149 (class 0 OID 0)
-- Dependencies: 243
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 1, false);


--
-- TOC entry 5150 (class 0 OID 0)
-- Dependencies: 246
-- Name: calendar_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.calendar_events_id_seq', 1, true);


--
-- TOC entry 5151 (class 0 OID 0)
-- Dependencies: 234
-- Name: chapters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chapters_id_seq', 25, true);


--
-- TOC entry 5152 (class 0 OID 0)
-- Dependencies: 238
-- Name: content_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.content_blocks_id_seq', 7, true);


--
-- TOC entry 5153 (class 0 OID 0)
-- Dependencies: 258
-- Name: course_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.course_categories_id_seq', 1, false);


--
-- TOC entry 5154 (class 0 OID 0)
-- Dependencies: 231
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.courses_id_seq', 5, true);


--
-- TOC entry 5155 (class 0 OID 0)
-- Dependencies: 249
-- Name: glossary_maps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.glossary_maps_id_seq', 1, false);


--
-- TOC entry 5156 (class 0 OID 0)
-- Dependencies: 251
-- Name: glossary_terms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.glossary_terms_id_seq', 1, false);


--
-- TOC entry 5157 (class 0 OID 0)
-- Dependencies: 221
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lessons_id_seq', 1, false);


--
-- TOC entry 5158 (class 0 OID 0)
-- Dependencies: 219
-- Name: sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sections_id_seq', 1, false);


--
-- TOC entry 5159 (class 0 OID 0)
-- Dependencies: 236
-- Name: subchapters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subchapters_id_seq', 6, true);


--
-- TOC entry 5160 (class 0 OID 0)
-- Dependencies: 261
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dirtysas
--

SELECT pg_catalog.setval('public.tags_id_seq', 1, false);


--
-- TOC entry 5161 (class 0 OID 0)
-- Dependencies: 253
-- Name: term_relationships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.term_relationships_id_seq', 1, false);


--
-- TOC entry 5162 (class 0 OID 0)
-- Dependencies: 264
-- Name: user_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dirtysas
--

SELECT pg_catalog.setval('public.user_history_id_seq', 4, true);


--
-- TOC entry 4830 (class 2606 OID 57656)
-- Name: achievements achievements_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_name_key UNIQUE (name);


--
-- TOC entry 4832 (class 2606 OID 57654)
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- TOC entry 4854 (class 2606 OID 57812)
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4856 (class 2606 OID 57814)
-- Name: activity_logs activity_logs_user_id_activity_date_course_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_activity_date_course_id_key UNIQUE (user_id, activity_date, course_id);


--
-- TOC entry 4874 (class 2606 OID 57960)
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (setting_key);


--
-- TOC entry 4860 (class 2606 OID 57849)
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- TOC entry 4840 (class 2606 OID 57715)
-- Name: chapters chapters_course_id_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_course_id_order_key UNIQUE (course_id, "order");


--
-- TOC entry 4842 (class 2606 OID 57713)
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- TOC entry 4848 (class 2606 OID 57746)
-- Name: content_blocks content_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_blocks
    ADD CONSTRAINT content_blocks_pkey PRIMARY KEY (id);


--
-- TOC entry 4838 (class 2606 OID 57694)
-- Name: course_access course_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_access
    ADD CONSTRAINT course_access_pkey PRIMARY KEY (course_id, user_id);


--
-- TOC entry 4878 (class 2606 OID 57985)
-- Name: course_categories course_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_categories
    ADD CONSTRAINT course_categories_name_key UNIQUE (name);


--
-- TOC entry 4880 (class 2606 OID 57983)
-- Name: course_categories course_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_categories
    ADD CONSTRAINT course_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4882 (class 2606 OID 57990)
-- Name: course_category_pivot course_category_pivot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_category_pivot
    ADD CONSTRAINT course_category_pivot_pkey PRIMARY KEY (course_id, category_id);


--
-- TOC entry 4808 (class 2606 OID 32971)
-- Name: course_tag_pivot course_tag_pivot_pkey; Type: CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.course_tag_pivot
    ADD CONSTRAINT course_tag_pivot_pkey PRIMARY KEY (course_id, tag_id);


--
-- TOC entry 4888 (class 2606 OID 58047)
-- Name: course_tags course_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.course_tags
    ADD CONSTRAINT course_tags_pkey PRIMARY KEY (course_id, tag_id);


--
-- TOC entry 4836 (class 2606 OID 57684)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- TOC entry 4862 (class 2606 OID 57862)
-- Name: event_attendees event_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_pkey PRIMARY KEY (event_id, user_id);


--
-- TOC entry 4858 (class 2606 OID 57829)
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, course_id);


--
-- TOC entry 4864 (class 2606 OID 57882)
-- Name: glossary_maps glossary_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_maps
    ADD CONSTRAINT glossary_maps_pkey PRIMARY KEY (id);


--
-- TOC entry 4866 (class 2606 OID 57903)
-- Name: glossary_terms glossary_terms_map_id_term_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_terms
    ADD CONSTRAINT glossary_terms_map_id_term_name_key UNIQUE (map_id, term_name);


--
-- TOC entry 4868 (class 2606 OID 57901)
-- Name: glossary_terms glossary_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_terms
    ADD CONSTRAINT glossary_terms_pkey PRIMARY KEY (id);


--
-- TOC entry 4828 (class 2606 OID 57640)
-- Name: instructor_metrics instructor_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_metrics
    ADD CONSTRAINT instructor_metrics_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4814 (class 2606 OID 41927)
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- TOC entry 4816 (class 2606 OID 41929)
-- Name: lessons lessons_section_id_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_section_id_order_key UNIQUE (section_id, "order");


--
-- TOC entry 4822 (class 2606 OID 57602)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4810 (class 2606 OID 41913)
-- Name: sections sections_course_id_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_course_id_order_key UNIQUE (course_id, "order");


--
-- TOC entry 4812 (class 2606 OID 41911)
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- TOC entry 4824 (class 2606 OID 57614)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_id);


--
-- TOC entry 4826 (class 2606 OID 57627)
-- Name: student_metrics student_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_metrics
    ADD CONSTRAINT student_metrics_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4844 (class 2606 OID 57731)
-- Name: subchapters subchapters_chapter_id_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subchapters
    ADD CONSTRAINT subchapters_chapter_id_order_key UNIQUE (chapter_id, "order");


--
-- TOC entry 4846 (class 2606 OID 57729)
-- Name: subchapters subchapters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subchapters
    ADD CONSTRAINT subchapters_pkey PRIMARY KEY (id);


--
-- TOC entry 4884 (class 2606 OID 58042)
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- TOC entry 4886 (class 2606 OID 58040)
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- TOC entry 4870 (class 2606 OID 57922)
-- Name: term_relationships term_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_relationships
    ADD CONSTRAINT term_relationships_pkey PRIMARY KEY (id);


--
-- TOC entry 4834 (class 2606 OID 57662)
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id);


--
-- TOC entry 4850 (class 2606 OID 57760)
-- Name: user_enrollments user_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_enrollments
    ADD CONSTRAINT user_enrollments_pkey PRIMARY KEY (user_id, course_id);


--
-- TOC entry 4872 (class 2606 OID 57943)
-- Name: user_glossary_status user_glossary_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_glossary_status
    ADD CONSTRAINT user_glossary_status_pkey PRIMARY KEY (user_id, term_id);


--
-- TOC entry 4892 (class 2606 OID 58065)
-- Name: user_history user_history_pkey; Type: CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.user_history
    ADD CONSTRAINT user_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4852 (class 2606 OID 57777)
-- Name: user_lesson_progress user_lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_pkey PRIMARY KEY (user_id, lesson_id);


--
-- TOC entry 4876 (class 2606 OID 57969)
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4818 (class 2606 OID 57593)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4820 (class 2606 OID 57591)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4889 (class 1259 OID 58077)
-- Name: idx_course_tags_tag_id; Type: INDEX; Schema: public; Owner: dirtysas
--

CREATE INDEX idx_course_tags_tag_id ON public.course_tags USING btree (tag_id);


--
-- TOC entry 4890 (class 1259 OID 58076)
-- Name: idx_user_history_user_id; Type: INDEX; Schema: public; Owner: dirtysas
--

CREATE INDEX idx_user_history_user_id ON public.user_history USING btree (user_id);


--
-- TOC entry 4912 (class 2606 OID 57820)
-- Name: activity_logs activity_logs_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- TOC entry 4913 (class 2606 OID 57815)
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4916 (class 2606 OID 57850)
-- Name: calendar_events calendar_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4903 (class 2606 OID 57716)
-- Name: chapters chapters_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4905 (class 2606 OID 57747)
-- Name: content_blocks content_blocks_subchapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_blocks
    ADD CONSTRAINT content_blocks_subchapter_id_fkey FOREIGN KEY (subchapter_id) REFERENCES public.subchapters(id) ON DELETE CASCADE;


--
-- TOC entry 4901 (class 2606 OID 57695)
-- Name: course_access course_access_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_access
    ADD CONSTRAINT course_access_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4902 (class 2606 OID 57700)
-- Name: course_access course_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_access
    ADD CONSTRAINT course_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4929 (class 2606 OID 57996)
-- Name: course_category_pivot course_category_pivot_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_category_pivot
    ADD CONSTRAINT course_category_pivot_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.course_categories(id) ON DELETE CASCADE;


--
-- TOC entry 4930 (class 2606 OID 57991)
-- Name: course_category_pivot course_category_pivot_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_category_pivot
    ADD CONSTRAINT course_category_pivot_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4931 (class 2606 OID 58048)
-- Name: course_tags course_tags_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.course_tags
    ADD CONSTRAINT course_tags_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4932 (class 2606 OID 58053)
-- Name: course_tags course_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.course_tags
    ADD CONSTRAINT course_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- TOC entry 4900 (class 2606 OID 57685)
-- Name: courses courses_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4917 (class 2606 OID 57863)
-- Name: event_attendees event_attendees_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE;


--
-- TOC entry 4918 (class 2606 OID 57868)
-- Name: event_attendees event_attendees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4914 (class 2606 OID 57835)
-- Name: favorites favorites_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4915 (class 2606 OID 57830)
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4919 (class 2606 OID 57883)
-- Name: glossary_maps glossary_maps_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_maps
    ADD CONSTRAINT glossary_maps_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4920 (class 2606 OID 57888)
-- Name: glossary_maps glossary_maps_generated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_maps
    ADD CONSTRAINT glossary_maps_generated_by_user_id_fkey FOREIGN KEY (generated_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4921 (class 2606 OID 57904)
-- Name: glossary_terms glossary_terms_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_terms
    ADD CONSTRAINT glossary_terms_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.glossary_maps(id) ON DELETE CASCADE;


--
-- TOC entry 4922 (class 2606 OID 57909)
-- Name: glossary_terms glossary_terms_source_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glossary_terms
    ADD CONSTRAINT glossary_terms_source_lesson_id_fkey FOREIGN KEY (source_lesson_id) REFERENCES public.subchapters(id) ON DELETE SET NULL;


--
-- TOC entry 4897 (class 2606 OID 57641)
-- Name: instructor_metrics instructor_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructor_metrics
    ADD CONSTRAINT instructor_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4893 (class 2606 OID 41930)
-- Name: lessons lessons_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;


--
-- TOC entry 4894 (class 2606 OID 57603)
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4895 (class 2606 OID 57615)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4896 (class 2606 OID 57628)
-- Name: student_metrics student_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_metrics
    ADD CONSTRAINT student_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4904 (class 2606 OID 57732)
-- Name: subchapters subchapters_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subchapters
    ADD CONSTRAINT subchapters_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- TOC entry 4923 (class 2606 OID 57923)
-- Name: term_relationships term_relationships_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_relationships
    ADD CONSTRAINT term_relationships_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.glossary_maps(id) ON DELETE CASCADE;


--
-- TOC entry 4924 (class 2606 OID 57928)
-- Name: term_relationships term_relationships_source_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_relationships
    ADD CONSTRAINT term_relationships_source_term_id_fkey FOREIGN KEY (source_term_id) REFERENCES public.glossary_terms(id) ON DELETE CASCADE;


--
-- TOC entry 4925 (class 2606 OID 57933)
-- Name: term_relationships term_relationships_target_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.term_relationships
    ADD CONSTRAINT term_relationships_target_term_id_fkey FOREIGN KEY (target_term_id) REFERENCES public.glossary_terms(id) ON DELETE CASCADE;


--
-- TOC entry 4898 (class 2606 OID 57668)
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- TOC entry 4899 (class 2606 OID 57663)
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4906 (class 2606 OID 57766)
-- Name: user_enrollments user_enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_enrollments
    ADD CONSTRAINT user_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4907 (class 2606 OID 57761)
-- Name: user_enrollments user_enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_enrollments
    ADD CONSTRAINT user_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4926 (class 2606 OID 57949)
-- Name: user_glossary_status user_glossary_status_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_glossary_status
    ADD CONSTRAINT user_glossary_status_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.glossary_terms(id) ON DELETE CASCADE;


--
-- TOC entry 4927 (class 2606 OID 57944)
-- Name: user_glossary_status user_glossary_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_glossary_status
    ADD CONSTRAINT user_glossary_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4933 (class 2606 OID 58071)
-- Name: user_history user_history_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.user_history
    ADD CONSTRAINT user_history_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4934 (class 2606 OID 58066)
-- Name: user_history user_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dirtysas
--

ALTER TABLE ONLY public.user_history
    ADD CONSTRAINT user_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4908 (class 2606 OID 57783)
-- Name: user_lesson_progress user_lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.subchapters(id) ON DELETE CASCADE;


--
-- TOC entry 4909 (class 2606 OID 57778)
-- Name: user_lesson_progress user_lesson_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4928 (class 2606 OID 57970)
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4910 (class 2606 OID 57800)
-- Name: user_task_submissions user_task_submissions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_submissions
    ADD CONSTRAINT user_task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.content_blocks(id) ON DELETE CASCADE;


--
-- TOC entry 4911 (class 2606 OID 57795)
-- Name: user_task_submissions user_task_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_task_submissions
    ADD CONSTRAINT user_task_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- Completed on 2026-01-22 09:05:38

--
-- PostgreSQL database dump complete
--

\unrestrict LEMKuUFPDiS7GowdmAPgdHJkMtsw8zK029uwV1cvYbXri26tv8uj5vuNU1Ugycu

