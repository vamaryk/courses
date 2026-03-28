import express from 'express';
import pool from '../db.js';
import { authenticateSession, optionalAuthenticateSession } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coursesMediaRoot = path.join(__dirname, '..', 'data', 'courses');

/** Строка chapters из PostgreSQL → поля для API (camelCase для новых колонок). */
function chapterRowToApi(row) {
  if (!row) return row;
  const { short_description, study_minutes, ...rest } = row;
  return {
    ...rest,
    shortDescription: short_description ?? null,
    studyMinutes: study_minutes ?? null,
  };
}

// ---------------------------------------------------------------------------
// Gollossary / lecture-processor integration
// ---------------------------------------------------------------------------

const LECTURE_PROCESSOR_URL =
  process.env.GOLLOSSARY_LECTURE_PROCESSOR_URL ||
  'http://127.0.0.1:8001/api/v1/lectures/process';

const LECTURE_PROCESSOR_ASYNC_URL =
  process.env.GOLLOSSARY_LECTURE_PROCESSOR_ASYNC_URL ||
  LECTURE_PROCESSOR_URL.replace('/process', '/process-async');

async function getFetch() {
  if (typeof fetch !== 'undefined') {
    return fetch;
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
}

async function sendSubchapterToGollossary(subchapterId) {
  try {
    // Получаем метаданные лекции (подраздела) и связанного курса
    const subchapterResult = await pool.query(
      `SELECT 
         s.id AS subchapter_id,
         s.title AS subchapter_title,
         c.id AS chapter_id,
         c.title AS chapter_title,
         c.course_id
       FROM subchapters s
       JOIN chapters c ON s.chapter_id = c.id
       WHERE s.id = $1`,
      [subchapterId],
    );

    const meta = subchapterResult.rows[0];
    if (!meta) {
      console.warn(`[GOLLOSSARY] Subchapter ${subchapterId} not found, skipping lecture processing`);
      return false;
    }

    // Собираем содержимое лекции из content_blocks
    const blocksResult = await pool.query(
      `SELECT type, content
       FROM content_blocks
       WHERE subchapter_id = $1
       ORDER BY "order" ASC`,
      [subchapterId],
    );

    if (blocksResult.rows.length === 0) {
      console.warn(`[GOLLOSSARY] No content blocks for subchapter ${subchapterId}, nothing to process`);
      return false;
    }

    const title =
      meta.subchapter_title ||
      meta.chapter_title ||
      `Лекция ${String(subchapterId)}`;

    const parts = [title];
    for (const block of blocksResult.rows) {
      if (block && block.content) {
        parts.push(String(block.content));
      }
    }

    const content = parts.join('\n\n').trim();
    if (!content || content.length < 10) {
      console.warn(
        `[GOLLOSSARY] Aggregated content for subchapter ${subchapterId} is too short, skipping`,
      );
      return false;
    }

    const payload = {
      content,
      lecture_number: title,
      source_id: String(subchapterId),
      language: 'ru',
    };

    const f = await getFetch();
    // LLM generation can take a long time; use async endpoint to avoid Node-side timeouts.
    const response = await f(LECTURE_PROCESSOR_ASYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(
        `[GOLLOSSARY] Lecture processing failed for subchapter ${subchapterId}: ${response.status} ${response.statusText} ${text.slice(0, 300)}`,
      );
      return false;
    }

    const data = await response.json().catch(() => null);
    const isAsyncQueued =
      response.status === 202 || data?.accepted === true;

    if (isAsyncQueued) {
      // /process-async не возвращает mindmap_id — mindmap появится в Mongo после LLM (минуты).
      console.log(
        `[GOLLOSSARY] Async OK: подглава ${subchapterId} поставлена в очередь lecture-processor (${LECTURE_PROCESSOR_ASYNC_URL}), ~${payload.content.length} симв. ` +
          `Mindmap ещё не создан — смотрите логи Python (uvicorn :8001): «Async mindmap: в очереди…», чанки LLM, «Async MindMap сохранён».`,
      );
      return true;
    }

    console.log(
      `[GOLLOSSARY] Mindmap сохранён (sync) subchapter ${subchapterId}:`,
      data?.mindmap_id || JSON.stringify(data),
    );
    return true;
  } catch (err) {
    console.error(
      `[GOLLOSSARY] Error while sending subchapter ${subchapterId} to lecture-processor:`,
      err.message,
    );
    return false;
  }
}

async function ensureCourseDir(courseId) {
  const dir = path.join(coursesMediaRoot, String(courseId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const courseId = req.params.id || req.params.courseId;
        const dir = await ensureCourseDir(courseId);
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      // Для обложки всегда генерируем новое имя с таймстемпом,
      // чтобы путь к файлу менялся и браузер не брал старый кэш.
      const prefix =
        req.query.type === 'cover'
          ? `cover-${Date.now().toString()}`
          : Date.now().toString();
      cb(null, `${prefix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    cb(null, extOk || mimeOk);
  },
});

const router = express.Router();

const ensureBaseUrl = (expectedBaseUrl) => (req, res, next) => {
  if (req.baseUrl !== expectedBaseUrl) {
    return next('route');
  }
  return next();
};

// Helper function to check if the user is the author of the course
const isCourseAuthor = async (courseId, userId) => {
  console.log(`🔍 [AUTH] Checking if user ${userId} is author of course ${courseId}`);
  const result = await pool.query('SELECT author_id FROM courses WHERE id = $1', [courseId]);
  console.log(`📋 [AUTH] Course check result:`, result.rows);
  const isAuthor = result.rows.length > 0 && result.rows[0].author_id === userId;
  console.log(`✅ [AUTH] Authorization result:`, isAuthor);
  return isAuthor;
};

const getCourseAccessStatus = async (courseId, userId) => {
  const courseResult = await pool.query(
    'SELECT id, is_public, author_id FROM courses WHERE id = $1',
    [courseId]
  );

  if (courseResult.rows.length === 0) {
    return null;
  }

  const course = courseResult.rows[0];
  const isAuthor = Boolean(userId && course.author_id === userId);

  if (!userId) {
    return {
      courseId: course.id,
      isPublic: course.is_public,
      isAuthor: false,
      isEnrolled: false,
      hasAccess: false,
      canViewContent: course.is_public,
    };
  }

  const [enrollmentResult, accessResult] = await Promise.all([
    pool.query(
      'SELECT 1 FROM user_enrollments WHERE course_id = $1 AND user_id = $2 LIMIT 1',
      [courseId, userId]
    ),
    pool.query(
      'SELECT 1 FROM course_access WHERE course_id = $1 AND user_id = $2 LIMIT 1',
      [courseId, userId]
    ),
  ]);

  const isEnrolled = enrollmentResult.rows.length > 0;
  const hasAccess = accessResult.rows.length > 0;
  const canViewContent = Boolean(course.is_public || isAuthor || isEnrolled || hasAccess);

  return {
    courseId: course.id,
    isPublic: course.is_public,
    isAuthor,
    isEnrolled,
    hasAccess,
    canViewContent,
  };
};

// POST /api/courses - Create a new course
router.post('/', authenticateSession, async (req, res) => {
  const { 
    title, 
    description, 
    isPublic, 
    coverImage, 
    tags, 
    specialty, 
    targetAudience, 
    aboutCourse,
    courseSkills,
    courseTools,
    certificateText,
    jobTitle,
    hoursPractice,
    hoursTheory,
  } = req.body;
  const authorId = req.user.userId;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const price = req.body.price != null ? Number(req.body.price) : 0;
    const hoursPracticeNum =
      hoursPractice != null ? Math.max(0, Number(hoursPractice)) : 0;
    const hoursTheoryNum =
      hoursTheory != null ? Math.max(0, Number(hoursTheory)) : 0;
    const result = await pool.query(
      `INSERT INTO courses (
        title, 
        description, 
        is_public, 
        author_id, 
        cover_image, 
        price,
        tags, 
        specialty, 
        target_audience, 
        about_course,
        course_skills,
        course_tools,
        certificate_text,
        job_title,
        hours_practice,
        hours_theory
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        title, 
        description || null, 
        isPublic || false, 
        authorId, 
        coverImage || null, 
        Math.max(0, price),
        tags || [], 
        specialty || null, 
        targetAudience || null, 
        aboutCourse || null,
        courseSkills || [],
        courseTools || [],
        certificateText || null,
        jobTitle || null,
        hoursPracticeNum,
        hoursTheoryNum,
      ]
    );

    await ensureCourseDir(result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating course:', error.message);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// POST /api/courses/:id/upload - Upload media file for a course
router.post('/:id/upload', authenticateSession, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const authorId = req.user.userId;

  try {
    if (!(await isCourseAuthor(id, authorId))) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(403).json({ error: 'You are not authorized to upload files to this course' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/course-media/${id}/${req.file.filename}`;

    if (req.query.type === 'cover') {
      await pool.query(
        'UPDATE courses SET cover_image = $1, updated_at = NOW() WHERE id = $2',
        [fileUrl, id]
      );
    }

    res.status(200).json({ url: fileUrl, filename: req.file.filename });
  } catch (error) {
    console.error(`Error uploading file for course ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET /api/courses - Get all public courses (or all courses if authenticated)
// This endpoint can be accessed without authentication to see public courses
router.get('/', optionalAuthenticateSession, async (req, res) => {
  let query;
  let params = [];
  
  try {
    // If user is authenticated, show all courses (public + their own private courses)
    // If not authenticated, show only public courses
    
    console.log('📚 [COURSES] Fetching courses. User authenticated:', !!req.user);
    if (req.user && req.user.userId) {
      // Authenticated: show all public courses OR courses created by user OR courses user has access to
      const userId = req.user.userId;
      query = `
        SELECT DISTINCT 
          c.id,
          c.title,
          c.description,
          c.is_public,
          c.author_id,
          c.created_at,
          c.updated_at,
          COALESCE(c.cover_image, NULL) as cover_image,
          CASE 
            WHEN c.tags IS NULL THEN ARRAY[]::TEXT[]
            WHEN pg_typeof(c.tags)::text = 'text[]' THEN c.tags::TEXT[]
            ELSE ARRAY[]::TEXT[]
          END as tags,
          COALESCE(c.specialty, NULL) as specialty,
          COALESCE(c.target_audience, NULL) as target_audience,
          COALESCE(c.about_course, NULL) as about_course,
          COALESCE(c.course_skills, ARRAY[]::TEXT[]) as course_skills,
          COALESCE(c.course_tools, ARRAY[]::TEXT[]) as course_tools,
          COALESCE(c.certificate_text, NULL) as certificate_text,
          COALESCE(c.job_title, NULL) as job_title,
          NULL as level,
          NULL as language,
          COALESCE(c.price, 0) as price,
          COALESCE(c.hours_practice, 0) as "hoursPractice",
          COALESCE(c.hours_theory, 0) as "hoursTheory",
          0 as "durationHours",
          COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM course_ratings WHERE course_id = c.id), 0) as rating,
          COALESCE((SELECT COUNT(*) FROM user_enrollments WHERE course_id = c.id), 0) as "studentsCount",
          COALESCE(p.first_name || ' ' || p.last_name, 'Преподаватель') as instructor_name,
          COALESCE(p.avatar_url, NULL) as instructor_avatar,
          jsonb_build_object(
            'id', p.id,
            'name', COALESCE(p.first_name || ' ' || p.last_name, 'Преподаватель'),
            'email', u.email
          ) as author
        FROM courses c
        LEFT JOIN LATERAL (
          SELECT 
            COALESCE(
              (SELECT (c.author_id::text)::jsonb->>'id' 
               WHERE (c.author_id::text) ~ '^[\s]*\{' 
               AND jsonb_typeof((c.author_id::text)::jsonb) = 'object'
               AND (c.author_id::text)::jsonb ? 'id'),
              c.author_id::text,
              NULL::text
            ) as author_id_text
        ) author_extract ON true
        LEFT JOIN profiles p ON author_extract.author_id_text = p.id::text
        LEFT JOIN users u ON p.id = u.id
        WHERE c.is_public = true 
           OR author_extract.author_id_text = $1::text
           OR EXISTS (
             SELECT 1 FROM course_access ca 
             WHERE ca.course_id = c.id AND ca.user_id = $1::uuid
           )
        ORDER BY c.created_at DESC
      `;
      params = [userId];
      console.log('📚 [COURSES] Using authenticated query for user:', userId);
      console.log('📚 [COURSES] SQL Query:', query.replace(/\s+/g, ' ').trim());
    } else {
      // Not authenticated: show only public courses
      console.log('📚 [COURSES] Using public courses query (not authenticated)');
      query = `
        SELECT 
          c.id,
          c.title,
          c.description,
          c.is_public,
          c.author_id,
          c.created_at,
          c.updated_at,
          COALESCE(c.cover_image, NULL) as cover_image,
          CASE 
            WHEN c.tags IS NULL THEN ARRAY[]::TEXT[]
            WHEN pg_typeof(c.tags)::text = 'text[]' THEN c.tags::TEXT[]
            ELSE ARRAY[]::TEXT[]
          END as tags,
          COALESCE(c.specialty, NULL) as specialty,
          COALESCE(c.target_audience, NULL) as target_audience,
          COALESCE(c.about_course, NULL) as about_course,
          COALESCE(c.course_skills, ARRAY[]::TEXT[]) as course_skills,
          COALESCE(c.course_tools, ARRAY[]::TEXT[]) as course_tools,
          COALESCE(c.certificate_text, NULL) as certificate_text,
          COALESCE(c.job_title, NULL) as job_title,
          NULL as level,
          NULL as language,
          COALESCE(c.price, 0) as price,
          COALESCE(c.hours_practice, 0) as "hoursPractice",
          COALESCE(c.hours_theory, 0) as "hoursTheory",
          0 as "durationHours",
          COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM course_ratings WHERE course_id = c.id), 0) as rating,
          COALESCE((SELECT COUNT(*) FROM user_enrollments WHERE course_id = c.id), 0) as "studentsCount",
          COALESCE(p.first_name || ' ' || p.last_name, 'Преподаватель') as instructor_name,
          COALESCE(p.avatar_url, NULL) as instructor_avatar,
          jsonb_build_object(
            'id', p.id,
            'name', COALESCE(p.first_name || ' ' || p.last_name, 'Преподаватель'),
            'email', u.email
          ) as author
        FROM courses c
        LEFT JOIN LATERAL (
          SELECT 
            COALESCE(
              (SELECT (c.author_id::text)::jsonb->>'id' 
               WHERE (c.author_id::text) ~ '^[\s]*\{' 
               AND jsonb_typeof((c.author_id::text)::jsonb) = 'object'
               AND (c.author_id::text)::jsonb ? 'id'),
              c.author_id::text,
              NULL::text
            ) as author_id_text
        ) author_extract ON true
        LEFT JOIN profiles p ON author_extract.author_id_text = p.id::text
        LEFT JOIN users u ON p.id = u.id
        WHERE c.is_public = true 
        ORDER BY c.created_at DESC
      `;
    }
    
    const result = await pool.query(query, params);
    console.log('📚 [COURSES] Successfully fetched', result.rows.length, 'courses');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ [COURSES] Error fetching courses:', error.message);
    console.error('❌ [COURSES] Error stack:', error.stack);
    console.error('❌ [COURSES] Query params:', params.length > 0 ? params : 'none');
    res.status(500).json({ error: 'Failed to fetch courses', details: error.message });
  }
});

// GET /api/courses/my/dashboard — топ-5 авторских курсов по популярности + сводная статистика
router.get('/my/dashboard', authenticateSession, async (req, res) => {
  const authorId = req.user.userId;
  try {
    const [aggRow, topResult] = await Promise.all([
      pool.query(
        `SELECT
          COALESCE(
            (SELECT SUM(cnt)::bigint FROM (
              SELECT COUNT(DISTINCT ue.user_id)::int AS cnt
              FROM courses c
              LEFT JOIN user_enrollments ue ON ue.course_id = c.id
              WHERE c.author_id = $1
              GROUP BY c.id
            ) t),
            0
          ) AS total_students,
          (SELECT ROUND(AVG(cr.rating)::numeric, 2)
           FROM course_ratings cr
           INNER JOIN courses c2 ON c2.id = cr.course_id
           WHERE c2.author_id = $1) AS average_rating`,
        [authorId]
      ),
      pool.query(
        `SELECT
          c.*,
          COALESCE(enr.students_count, 0)::int AS students_count,
          COALESCE(rat.avg_rating, 0)::numeric AS rating,
          COALESCE(fav.favorites_count, 0)::int AS favorites_count
        FROM courses c
        LEFT JOIN (
          SELECT course_id, COUNT(DISTINCT user_id)::int AS students_count
          FROM user_enrollments
          GROUP BY course_id
        ) enr ON enr.course_id = c.id
        LEFT JOIN (
          SELECT course_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating
          FROM course_ratings
          GROUP BY course_id
        ) rat ON rat.course_id = c.id
        LEFT JOIN (
          SELECT course_id, COUNT(*)::int AS favorites_count
          FROM favorites
          GROUP BY course_id
        ) fav ON fav.course_id = c.id
        WHERE c.author_id = $1
        ORDER BY COALESCE(enr.students_count, 0) DESC, c.created_at DESC
        LIMIT 5`,
        [authorId]
      ),
    ]);

    const totalStudents = Number(aggRow.rows[0]?.total_students ?? 0);
    const averageRating =
      aggRow.rows[0]?.average_rating != null
        ? parseFloat(aggRow.rows[0].average_rating)
        : null;

    const courses = topResult.rows;
    const maxStudents =
      courses.length === 0
        ? 0
        : Math.max(...courses.map((r) => parseInt(r.students_count, 10) || 0));

    const chart_bars = courses.map((course) => ({
      name: course.title,
      students: parseInt(course.students_count, 10) || 0,
      percentage:
        maxStudents > 0
          ? Math.round(((parseInt(course.students_count, 10) || 0) / maxStudents) * 100)
          : 0,
    }));

    res.status(200).json({
      total_students: totalStudents,
      average_rating: averageRating,
      courses,
      chart_bars,
    });
  } catch (error) {
    console.error('Error fetching author dashboard:', error.message);
    res.status(500).json({ error: 'Failed to fetch author dashboard' });
  }
});

// GET /api/courses/my - Get all courses created by the logged-in user
router.get('/my', authenticateSession, async (req, res) => {
  const authorId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT
        c.*,
        COALESCE((SELECT COUNT(DISTINCT ue.user_id)::int FROM user_enrollments ue WHERE ue.course_id = c.id), 0) AS students_count,
        COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM course_ratings WHERE course_id = c.id), 0) AS rating,
        COALESCE((SELECT COUNT(*)::int FROM favorites WHERE course_id = c.id), 0) AS favorites_count
      FROM courses c
      WHERE c.author_id = $1
      ORDER BY c.created_at DESC`,
      [authorId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching user courses:', error.message);
    res.status(500).json({ error: 'Failed to fetch user courses' });
  }
});

// GET /api/courses/:id/access-status - Get current user's access status for a course
router.get('/:id/access-status', optionalAuthenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const userId = req.user?.userId || null;

  try {
    const status = await getCourseAccessStatus(courseId, userId);

    if (!status) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.status(200).json(status);
  } catch (error) {
    console.error(`Error fetching access status for course ${courseId}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch course access status' });
  }
});

// POST /api/courses/:id/enroll - Enroll current user to the course
router.post('/:id/enroll', authenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await getCourseAccessStatus(courseId, userId);

    if (!status) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!status.isPublic && !status.isAuthor && !status.hasAccess) {
      return res.status(403).json({ error: 'You are not authorized to enroll in this private course' });
    }

    await pool.query(
      `INSERT INTO user_enrollments (user_id, course_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [userId, courseId]
    );

    return res.status(200).json({ message: 'Enrolled successfully' });
  } catch (error) {
    console.error(`Error enrolling user ${userId} to course ${courseId}:`, error.message);
    return res.status(500).json({ error: 'Failed to enroll to course' });
  }
});

// GET /api/courses/:id - Get a single course by ID with nested structure (Optimized)
// Restrict :id to numeric values so static routes like /favorites are not shadowed.
router.get('/:id(\\d+)', optionalAuthenticateSession, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId || null;

  const query = `
    SELECT
      c.id,
      c.title,
      c.description,
      c.is_public,
      c.author_id,
      c.created_at,
      c.updated_at,
      COALESCE(c.cover_image, NULL) as cover_image,
      COALESCE(c.tags, ARRAY[]::TEXT[]) as tags,
      COALESCE(c.specialty, NULL) as specialty,
      COALESCE(c.target_audience, NULL) as target_audience,
      COALESCE(c.about_course, NULL) as about_course,
      COALESCE(c.course_skills, ARRAY[]::TEXT[]) as course_skills,
      COALESCE(c.course_tools, ARRAY[]::TEXT[]) as course_tools,
      COALESCE(c.certificate_text, NULL) as certificate_text,
      COALESCE(c.job_title, NULL) as job_title,
      COALESCE(c.price, 0) as price,
      COALESCE(c.hours_practice, 0) as "hoursPractice",
      COALESCE(c.hours_theory, 0) as "hoursTheory",
      COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM course_ratings WHERE course_id = c.id), 0) as rating,
      (SELECT rating FROM course_ratings WHERE course_id = c.id AND user_id = $2::uuid LIMIT 1) as my_rating,
      COALESCE((SELECT COUNT(*) FROM user_enrollments ue WHERE ue.course_id = c.id), 0) as "studentsCount",
      EXISTS (
        SELECT 1
        FROM user_enrollments ue
        WHERE ue.course_id = c.id AND ue.user_id = $2::uuid
      ) as is_enrolled,
      EXISTS (
        SELECT 1
        FROM course_access ca
        WHERE ca.course_id = c.id AND ca.user_id = $2::uuid
      ) as has_access,
      COALESCE(p.first_name || ' ' || p.last_name, 'Преподаватель') as instructor_name,
      COALESCE(p.avatar_url, NULL) as instructor_avatar,
      COALESCE(
        (
          SELECT JSON_AGG(ch_agg.*)
          FROM (
            SELECT
              ch.id,
              ch.title,
              ch.order,
              COALESCE(ch.short_description, NULL) as "shortDescription",
              ch.study_minutes as "studyMinutes",
              COALESCE(ch.canvas_data, NULL) as canvas_data,
              COALESCE(
                (
                  SELECT JSON_AGG(sub_agg.*)
                  FROM (
                    SELECT
                      sub.id,
                      sub.title,
                      sub.order,
                      COALESCE(
                        (
                          SELECT JSON_AGG(cb_agg.*)
                          FROM (
                            SELECT
                              cb.id,
                              cb.type,
                              cb.content,
                              cb.answer,
                              cb.order
                            FROM content_blocks cb
                            WHERE cb.subchapter_id = sub.id
                            ORDER BY cb.order
                          ) AS cb_agg
                        ),
                        '[]'::json
                      ) AS content_blocks
                    FROM subchapters sub
                    WHERE sub.chapter_id = ch.id
                    ORDER BY sub.order
                  ) AS sub_agg
                ),
                '[]'::json
              ) AS subchapters
            FROM chapters ch
            WHERE ch.course_id = c.id
            ORDER BY ch.order
          ) AS ch_agg
        ),
        '[]'::json
      ) AS chapters
    FROM courses c
    LEFT JOIN profiles p ON c.author_id = p.id
    WHERE c.id = $1;
  `;

  try {
    const result = await pool.query(query, [id, userId]);
    const course = result.rows[0];

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check permissions for private courses
    const isAuthor = Boolean(userId && course.author_id === userId);
    const isEnrolled = Boolean(course.is_enrolled);
    const hasAccess = Boolean(course.has_access);

    if (!course.is_public && !isAuthor && !isEnrolled && !hasAccess) {
      return res.status(403).json({ error: 'You are not authorized to view this course' });
    }

    // If user can view course but is not enrolled/author/hasAccess:
    // omit subchapter/content details to avoid leaking curriculum contents.
    if (course.is_public && !isAuthor && !isEnrolled && !hasAccess) {
      const chapters = Array.isArray(course.chapters) ? course.chapters : [];
      course.chapters = chapters.map((ch) => ({
        ...ch,
        subchapters: [],
      }));
    }

    res.status(200).json(course);
  } catch (error) {
    console.error(`Error fetching course ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// POST /api/courses/:id/rate - Rate course (only enrolled users, not author). Body: { rating: 1-5 }
router.post('/:id(\\d+)/rate', authenticateSession, async (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  const userId = req.user.userId;
  const rating = req.body?.rating != null ? Math.round(Number(req.body.rating)) : null;

  if (!Number.isInteger(courseId) || rating == null || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a number from 1 to 5' });
  }

  try {
    const courseRow = await pool.query(
      'SELECT author_id FROM courses WHERE id = $1',
      [courseId]
    );
    if (courseRow.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (courseRow.rows[0].author_id === userId) {
      return res.status(403).json({ error: 'Course author cannot rate their own course' });
    }

    const enrolled = await pool.query(
      'SELECT 1 FROM user_enrollments WHERE course_id = $1 AND user_id = $2 LIMIT 1',
      [courseId, userId]
    );
    if (enrolled.rows.length === 0) {
      return res.status(403).json({ error: 'Only enrolled students can rate this course' });
    }

    await pool.query(
      `INSERT INTO course_ratings (user_id, course_id, rating, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET rating = $3, updated_at = now()`,
      [userId, courseId, rating]
    );

    const avgResult = await pool.query(
      'SELECT ROUND(AVG(rating)::numeric, 2) as rating FROM course_ratings WHERE course_id = $1',
      [courseId]
    );
    const newRating = parseFloat(avgResult.rows[0]?.rating) || 0;
    return res.status(200).json({ rating: newRating, my_rating: rating });
  } catch (error) {
    console.error(`Error rating course ${courseId}:`, error.message);
    return res.status(500).json({ error: 'Failed to save rating' });
  }
});

// PUT /api/courses/:id - Update a course
router.put('/:id', ensureBaseUrl('/api/courses'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    description, 
    isPublic, 
    coverImage, 
    price,
    tags, 
    specialty, 
    targetAudience, 
    aboutCourse,
    courseSkills,
    courseTools,
    certificateText,
    jobTitle,
    hoursPractice,
    hoursTheory,
  } = req.body;
  const authorId = req.user.userId;
  const priceNum = price != null ? Math.max(0, Number(price)) : undefined;
  const hoursPracticeNum =
    hoursPractice != null ? Math.max(0, Number(hoursPractice)) : undefined;
  const hoursTheoryNum =
    hoursTheory != null ? Math.max(0, Number(hoursTheory)) : undefined;

  try {
    if (!(await isCourseAuthor(id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to update this course' });
    }

    const result = await pool.query(
      `UPDATE courses SET 
        title = $1, 
        description = $2, 
        is_public = $3, 
        cover_image = $4, 
        price = COALESCE($5, price),
        tags = $6, 
        specialty = $7, 
        target_audience = $8, 
        about_course = $9, 
        course_skills = $10,
        course_tools = $11,
        certificate_text = $12,
        job_title = $13,
        hours_practice = COALESCE($14, hours_practice),
        hours_theory = COALESCE($15, hours_theory),
        updated_at = NOW() 
      WHERE id = $16 RETURNING *`,
      [
        title, 
        description, 
        isPublic, 
        coverImage, 
        priceNum,
        tags, 
        specialty, 
        targetAudience, 
        aboutCourse, 
        courseSkills || [],
        courseTools || [],
        certificateText || null,
        jobTitle || null,
        hoursPracticeNum,
        hoursTheoryNum,
        id
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating course ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /api/courses/:id - Delete a course
router.delete('/:id', ensureBaseUrl('/api/courses'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const authorId = req.user.userId;

  try {
    if (!(await isCourseAuthor(id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to delete this course' });
    }

    await pool.query('DELETE FROM courses WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting course ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// --- Course Access Management ---
// POST /api/courses/:id/access - Grant access to a private course
router.post('/:id/access', authenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const { userId: userToGrantAccessId } = req.body;
  const authorId = req.user.userId;

  try {
    if (!(await isCourseAuthor(courseId, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to manage access for this course' });
    }

    const courseResult = await pool.query('SELECT is_public FROM courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (courseResult.rows[0].is_public) {
      return res.status(400).json({ error: 'Cannot grant access to a public course' });
    }

    const existingAccess = await pool.query(
      'SELECT * FROM course_access WHERE course_id = $1 AND user_id = $2',
      [courseId, userToGrantAccessId]
    );
    if (existingAccess.rows.length > 0) {
      return res.status(409).json({ message: 'User already has access to this course' });
    }

    await pool.query(
      'INSERT INTO course_access (course_id, user_id) VALUES ($1, $2)',
      [courseId, userToGrantAccessId]
    );
    res.status(201).json({ message: 'Access granted successfully' });
  } catch (error) {
    console.error(`Error granting access to course ${courseId}:`, error.message);
    res.status(500).json({ error: 'Failed to grant access' });
  }
});

// DELETE /api/courses/:id/access - Revoke access from a private course
router.delete('/:id/access', authenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const { userId: userToRevokeAccessId } = req.body;
  const authorId = req.user.userId;

  try {
    if (!(await isCourseAuthor(courseId, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to manage access for this course' });
    }

    const courseResult = await pool.query('SELECT is_public FROM courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (courseResult.rows[0].is_public) {
      return res.status(400).json({ error: 'Cannot revoke access from a public course' });
    }

    await pool.query(
      'DELETE FROM course_access WHERE course_id = $1 AND user_id = $2',
      [courseId, userToRevokeAccessId]
    );
    res.status(204).send();
  } catch (error) {
    console.error(`Error revoking access from course ${courseId}:`, error.message);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});


// --- Chapters ---
// POST /api/courses/:courseId/chapters - Create a new chapter
router.post('/:courseId/chapters', authenticateSession, async (req, res) => {
  const { courseId } = req.params;
  const { title, order, shortDescription, studyMinutes } = req.body;
  const authorId = req.user.userId;

  if (!title || order === undefined) {
    return res.status(400).json({ error: 'Title and order are required' });
  }

  let sm = null;
  if (studyMinutes !== '' && studyMinutes !== null && studyMinutes !== undefined) {
    const n = Number(studyMinutes);
    if (Number.isFinite(n) && n >= 0) {
      sm = Math.round(n);
    }
  }
  const sd =
    shortDescription === '' || shortDescription === null || shortDescription === undefined
      ? null
      : String(shortDescription);

  try {
    if (!(await isCourseAuthor(courseId, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to add chapters to this course' });
    }

    const result = await pool.query(
      `INSERT INTO chapters (course_id, title, "order", short_description, study_minutes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [courseId, title, order, sd, sm]
    );
    res.status(201).json(chapterRowToApi(result.rows[0]));
  } catch (error) {
    console.error('Error creating chapter:', error.message);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// PUT /api/chapters/:id - Update a chapter
// Note: This route is mounted at /api/chapters in server.js
router.put('/:id', ensureBaseUrl('/api/chapters'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const { title, order, canvasData, shortDescription, studyMinutes } = req.body;
  const authorId = req.user.userId;

  if (title === undefined || order === undefined) {
    return res.status(400).json({ error: 'Title and order are required' });
  }

  try {
    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [id]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to update this chapter' });
    }

    const sets = ['title = $1', '"order" = $2'];
    const params = [title, order];
    let p = 3;

    if (shortDescription !== undefined) {
      sets.push(`short_description = $${p}`);
      params.push(shortDescription === '' || shortDescription === null ? null : String(shortDescription));
      p += 1;
    }
    if (studyMinutes !== undefined) {
      let sm = null;
      if (studyMinutes !== '' && studyMinutes !== null && studyMinutes !== undefined) {
        const n = Number(studyMinutes);
        if (Number.isFinite(n) && n >= 0) {
          sm = Math.round(n);
        }
      }
      sets.push(`study_minutes = $${p}`);
      params.push(sm);
      p += 1;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'canvasData')) {
      sets.push(`canvas_data = $${p}::jsonb`);
      params.push(canvasData == null ? null : JSON.stringify(canvasData));
      p += 1;
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE chapters SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`,
      params
    );
    res.status(200).json(chapterRowToApi(result.rows[0]));
  } catch (error) {
    console.error(`Error updating chapter ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// GET /api/chapters/:id/canvas - Get canvas data for a chapter
router.get('/:id/canvas', authenticateSession, async (req, res) => {
  const { id } = req.params;
  const authorId = req.user.userId;

  try {
    const chapterCheck = await pool.query('SELECT course_id, COALESCE(canvas_data, NULL) as canvas_data FROM chapters WHERE id = $1', [id]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to view this chapter' });
    }

    res.status(200).json({ canvasData: chapterData.canvas_data || null });
  } catch (error) {
    console.error(`Error fetching canvas data for chapter ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch canvas data' });
  }
});

// PUT /api/chapters/:id/canvas - Update canvas data for a chapter
router.put('/:id/canvas', authenticateSession, async (req, res) => {
  const { id } = req.params;
  const { canvasData } = req.body;
  const authorId = req.user.userId;

  try {
    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [id]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to update this chapter' });
    }

    const result = await pool.query(
      'UPDATE chapters SET canvas_data = $1 WHERE id = $2 RETURNING id, canvas_data',
      [canvasData ? JSON.stringify(canvasData) : null, id]
    );
    res.status(200).json({ canvasData: result.rows[0].canvas_data });
  } catch (error) {
    console.error(`Error updating canvas data for chapter ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to update canvas data' });
  }
});

// DELETE /api/chapters/:id - Delete a chapter
router.delete('/:id', ensureBaseUrl('/api/chapters'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const authorId = req.user.userId;

  try {
    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [id]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to delete this chapter' });
    }

    await pool.query('DELETE FROM chapters WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting chapter ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});


// --- Subchapters ---
// GET /api/chapters/:chapterId/subchapters - Get all subchapters for a chapter
router.get('/:chapterId/subchapters', authenticateSession, async (req, res) => {
  const { chapterId } = req.params;
  const authorId = req.user.userId;

  try {
    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [chapterId]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to view subchapters of this chapter' });
    }

    const result = await pool.query(
      `SELECT
        s.*,
        COALESCE(
          (
            SELECT JSON_AGG(cb_agg.*)
            FROM (
              SELECT
                cb.id,
                cb.subchapter_id,
                cb.type,
                cb.content,
                cb.answer,
                cb."order"
              FROM content_blocks cb
              WHERE cb.subchapter_id = s.id
              ORDER BY cb."order"
            ) AS cb_agg
          ),
          '[]'::json
        ) AS content_blocks
      FROM subchapters s
      WHERE s.chapter_id = $1
      ORDER BY s."order" ASC`,
      [chapterId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching subchapters:', error.message);
    res.status(500).json({ error: 'Failed to fetch subchapters' });
  }
});

// POST /api/chapters/:chapterId/subchapters - Create a new subchapter
router.post('/:chapterId/subchapters', authenticateSession, async (req, res) => {
  const { chapterId } = req.params;
  const { title, order } = req.body;
  const authorId = req.user.userId;

  if (!title || order === undefined) {
    return res.status(400).json({ error: 'Title and order are required' });
  }

  try {
    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [chapterId]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to add subchapters to this chapter' });
    }

    const result = await pool.query(
      'INSERT INTO subchapters (chapter_id, title, "order") VALUES ($1, $2, $3) RETURNING *',
      [chapterId, title, order]
    );
    const created = result.rows[0];

    // На этапе создания подраздела контента ещё нет, поэтому
    // генерация mindmap запускается позже — при работе с content_blocks.
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating subchapter:', error.message);
    res.status(500).json({ error: 'Failed to create subchapter' });
  }
});

// ---------------------------------------------------------------------------
// Gollossary: generate mindmaps for course (only course author)
// ---------------------------------------------------------------------------
router.post('/:id(\\d+)/glossary/mindmaps/generate', authenticateSession, async (req, res) => {
  const courseId = Number(req.params.id);
  const userId = req.user?.userId;

  if (!Number.isFinite(courseId)) {
    return res.status(400).json({ error: 'Invalid courseId' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const isAuthor = await isCourseAuthor(courseId, userId);
    if (!isAuthor) {
      return res.status(403).json({ error: 'Only course owner can generate glossary mindmaps' });
    }

    const subchaptersResult = await pool.query(
      `
        SELECT s.id AS subchapter_id
        FROM subchapters s
        JOIN chapters c ON s.chapter_id = c.id
        WHERE c.course_id = $1
          AND EXISTS (
            SELECT 1
            FROM content_blocks cb
            WHERE cb.subchapter_id = s.id
              AND cb.content IS NOT NULL
              AND cb.content <> ''
          )
        ORDER BY s."order" ASC
      `,
      [courseId],
    );

    const subchapterIds = (subchaptersResult.rows || []).map((r) => Number(r.subchapter_id)).filter(Number.isFinite);

    if (!subchapterIds.length) {
      return res.status(200).json({ started: false, totalSubchapters: 0, processed: 0, failed: 0 });
    }

    console.log(
      `[GOLLOSSARY] Старт фоновой отправки ${subchapterIds.length} подглав в Gollossary (async). ` +
        `URL=${LECTURE_PROCESSOR_ASYNC_URL} | логи генерации — в терминале lecture-processor (порт 8001), не только в Node.`,
    );

    // Запускаем обработку в фоне, чтобы не держать запрос пока выполняются LLM-вызовы.
    void (async () => {
      let processed = 0;
      let failed = 0;
      for (const sid of subchapterIds) {
        const ok = await sendSubchapterToGollossary(sid);
        if (ok) processed += 1;
        else failed += 1;
      }
      console.log(`[GOLLOSSARY] Generate mindmaps finished: course=${courseId} processed=${processed} failed=${failed}`);
    })();

    return res.status(202).json({ started: true, totalSubchapters: subchapterIds.length });
  } catch (e) {
    console.error(`[GOLLOSSARY] generate mindmaps error course=${courseId}:`, e);
    return res.status(500).json({ error: 'Failed to generate glossary mindmaps' });
  }
});

// Fallback route (without regex constraint) to avoid path-regexp mismatches.
router.post('/:id/glossary/mindmaps/generate', authenticateSession, async (req, res) => {
  const courseId = Number(req.params.id);
  const userId = req.user?.userId;

  if (!Number.isFinite(courseId)) {
    return res.status(400).json({ error: 'Invalid courseId' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const isAuthor = await isCourseAuthor(courseId, userId);
    if (!isAuthor) {
      return res
        .status(403)
        .json({ error: 'Only course owner can generate glossary mindmaps' });
    }

    const subchaptersResult = await pool.query(
      `
        SELECT s.id AS subchapter_id
        FROM subchapters s
        JOIN chapters c ON s.chapter_id = c.id
        WHERE c.course_id = $1
          AND EXISTS (
            SELECT 1
            FROM content_blocks cb
            WHERE cb.subchapter_id = s.id
              AND cb.content IS NOT NULL
              AND cb.content <> ''
          )
        ORDER BY s."order" ASC
      `,
      [courseId],
    );

    const subchapterIds = (subchaptersResult.rows || [])
      .map((r) => Number(r.subchapter_id))
      .filter(Number.isFinite);

    if (!subchapterIds.length) {
      return res
        .status(200)
        .json({ started: false, totalSubchapters: 0, processed: 0, failed: 0 });
    }

    console.log(
      `[GOLLOSSARY] Старт фоновой отправки ${subchapterIds.length} подглав в Gollossary (async). ` +
        `URL=${LECTURE_PROCESSOR_ASYNC_URL} | логи генерации — в терминале lecture-processor (порт 8001), не только в Node.`,
    );

    void (async () => {
      let processed = 0;
      let failed = 0;
      for (const sid of subchapterIds) {
        const ok = await sendSubchapterToGollossary(sid);
        if (ok) processed += 1;
        else failed += 1;
      }
      console.log(
        `[GOLLOSSARY] Generate mindmaps finished: course=${courseId} processed=${processed} failed=${failed}`,
      );
    })();

    return res.status(202).json({ started: true, totalSubchapters: subchapterIds.length });
  } catch (e) {
    console.error(`[GOLLOSSARY] generate mindmaps error course=${courseId}:`, e);
    return res.status(500).json({ error: 'Failed to generate glossary mindmaps' });
  }
});

// PUT /api/subchapters/:id - Update a subchapter
router.put('/:id', ensureBaseUrl('/api/subchapters'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const { title, order } = req.body;
  const authorId = req.user.userId;

  try {
    const subchapterCheck = await pool.query('SELECT chapter_id FROM subchapters WHERE id = $1', [id]);
    const subchapterData = subchapterCheck.rows[0];

    if (!subchapterData) {
      return res.status(404).json({ message: 'Subchapter not found' });
    }

    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [subchapterData.chapter_id]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to update this subchapter' });
    }

    const result = await pool.query(
      'UPDATE subchapters SET title = $1, "order" = $2 WHERE id = $3 RETURNING *',
      [title, order, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating subchapter ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to update subchapter' });
  }
});

// DELETE /api/subchapters/:id - Delete a subchapter
router.delete('/:id', ensureBaseUrl('/api/subchapters'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const authorId = req.user.userId;

  try {
    const subchapterCheck = await pool.query('SELECT chapter_id FROM subchapters WHERE id = $1', [id]);
    const subchapterData = subchapterCheck.rows[0];

    if (!subchapterData) {
      return res.status(404).json({ message: 'Subchapter not found' });
    }

    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [subchapterData.chapter_id]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to delete this subchapter' });
    }

    await pool.query('DELETE FROM subchapters WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting subchapter ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to delete subchapter' });
  }
});


// --- Content Blocks ---
// POST /api/subchapters/:subchapterId/contentblocks - Create a new content block
router.post('/:subchapterId/contentblocks', authenticateSession, async (req, res) => {
  const { subchapterId } = req.params;
  const { type, content, answer, order } = req.body;
  const authorId = req.user.userId;

  if (!type || content === undefined || order === undefined) {
    return res.status(400).json({ error: 'Type, content, and order are required' });
  }
  if (type === 'task' && (answer === undefined || answer === null)) {
    return res.status(400).json({ error: 'Answer is required for task type content blocks' });
  }
  if (type === 'test' && (answer === undefined || answer === null)) {
    return res.status(400).json({ error: 'Answer options are required for test type content blocks' });
  }

  try {
    const subchapterCheck = await pool.query('SELECT chapter_id FROM subchapters WHERE id = $1', [subchapterId]);
    const subchapterData = subchapterCheck.rows[0];

    if (!subchapterData) {
      return res.status(404).json({ message: 'Subchapter not found' });
    }

    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [subchapterData.chapter_id]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to add content blocks to this subchapter' });
    }

    const result = await pool.query(
      'INSERT INTO content_blocks (subchapter_id, type, content, answer, "order") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [subchapterId, type, content, answer, order]
    );
    const createdBlock = result.rows[0];

    res.status(201).json(createdBlock);
  } catch (error) {
    console.error('Error creating content block:', error.message);
    res.status(500).json({ error: 'Failed to create content block' });
  }
});

// PUT /api/contentblocks/:id - Update a content block
router.put('/:id', ensureBaseUrl('/api/contentblocks'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const { type, content, answer, order } = req.body;
  const authorId = req.user.userId;

  console.log(`🔄 [API] Updating content block ${id}`, { type, content: content?.substring(0, 50), answer: answer?.substring(0, 50), order });

  if (!type || content === undefined || order === undefined) {
    console.log(`❌ [API] Invalid request data for content block ${id}`);
    return res.status(400).json({ error: 'Type, content, and order are required' });
  }
  if (type === 'task' && (answer === undefined || answer === null)) {
    console.log(`❌ [API] Answer required for task type content block ${id}`);
    return res.status(400).json({ error: 'Answer is required for task type content blocks' });
  }
  if (type === 'test' && (answer === undefined || answer === null)) {
    console.log(`❌ [API] Answer options required for test type content block ${id}`);
    return res.status(400).json({ error: 'Answer options are required for test type content blocks' });
  }

  try {
    const contentBlockCheck = await pool.query('SELECT subchapter_id FROM content_blocks WHERE id = $1', [id]);
    const contentBlockData = contentBlockCheck.rows[0];

    console.log(`📋 [API] Content block check for ${id}:`, contentBlockData);

    if (!contentBlockData) {
      console.log(`❌ [API] Content block ${id} not found`);
      return res.status(404).json({ message: 'Content block not found' });
    }

    const subchapterCheck = await pool.query('SELECT chapter_id FROM subchapters WHERE id = $1', [contentBlockData.subchapter_id]);
    const subchapterData = subchapterCheck.rows[0];

    console.log(`📋 [API] Subchapter check for ${contentBlockData.subchapter_id}:`, subchapterData);

    if (!subchapterData) {
      console.log(`❌ [API] Subchapter ${contentBlockData.subchapter_id} not found`);
      return res.status(404).json({ message: 'Subchapter not found' });
    }

    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [subchapterData.chapter_id]);
    const chapterData = chapterCheck.rows[0];

    console.log(`📋 [API] Chapter check for ${subchapterData.chapter_id}:`, chapterData);

    if (!chapterData) {
      console.log(`❌ [API] Chapter ${subchapterData.chapter_id} not found`);
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const isAuthor = await isCourseAuthor(chapterData.course_id, authorId);
    console.log(`🔐 [API] Authorization check for course ${chapterData.course_id}, user ${authorId}:`, isAuthor);

    if (!isAuthor) {
      console.log(`❌ [API] User ${authorId} is not authorized to update content block ${id}`);
      return res.status(403).json({ error: 'You are not authorized to update this content block' });
    }

    const result = await pool.query(
      'UPDATE content_blocks SET type = $1, content = $2, answer = $3, "order" = $4 WHERE id = $5 RETURNING *',
      [type, content, answer, order, id]
    );

    console.log(`✅ [API] Content block ${id} updated successfully`);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`💥 [API] Error updating content block ${id}:`, error.message);
    console.error(`💥 [API] Error stack:`, error.stack);
    res.status(500).json({ error: 'Failed to update content block' });
  }
});

// DELETE /api/contentblocks/:id - Delete a content block
router.delete('/:id', ensureBaseUrl('/api/contentblocks'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const authorId = req.user.userId;

  try {
    const contentBlockCheck = await pool.query('SELECT subchapter_id FROM content_blocks WHERE id = $1', [id]);
    const contentBlockData = contentBlockCheck.rows[0];

    if (!contentBlockData) {
      return res.status(404).json({ message: 'Content block not found' });
    }

    const subchapterCheck = await pool.query('SELECT chapter_id FROM subchapters WHERE id = $1', [contentBlockData.subchapter_id]);
    const subchapterData = subchapterCheck.rows[0];

    if (!subchapterData) {
      return res.status(404).json({ message: 'Subchapter not found' });
    }

    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [subchapterData.chapter_id]);
    const chapterData = chapterCheck.rows[0];

    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (!(await isCourseAuthor(chapterData.course_id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to delete this content block' });
    }

    await pool.query('DELETE FROM content_blocks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting content block ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to delete content block' });
  }
});

// GET /api/subchapters/:subchapterId/answers - Get current user's saved answers for subchapter
router.get('/:subchapterId/answers', ensureBaseUrl('/api/subchapters'), authenticateSession, async (req, res) => {
  const { subchapterId } = req.params;
  const userId = req.user.userId;

  try {
    const subchapterCheck = await pool.query('SELECT chapter_id FROM subchapters WHERE id = $1', [subchapterId]);
    const subchapterData = subchapterCheck.rows[0];
    if (!subchapterData) {
      return res.status(404).json({ message: 'Subchapter not found' });
    }

    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [subchapterData.chapter_id]);
    const chapterData = chapterCheck.rows[0];
    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const accessStatus = await getCourseAccessStatus(chapterData.course_id, userId);
    if (!accessStatus?.canViewContent) {
      return res.status(403).json({ error: 'You are not authorized to access this subchapter' });
    }

    const result = await pool.query(
      `SELECT
        content_block_id,
        user_answer,
        is_correct,
        answered_at,
        updated_at
      FROM user_content_block_answers
      WHERE user_id = $1 AND subchapter_id = $2`,
      [userId, subchapterId]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error fetching answers for subchapter ${subchapterId}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch user answers' });
  }
});

// PUT /api/contentblocks/:id/answer - Save current user's answer for a content block
router.put('/:id/answer', ensureBaseUrl('/api/contentblocks'), authenticateSession, async (req, res) => {
  const { id: contentBlockId } = req.params;
  const { userAnswer, isCorrect } = req.body;
  const userId = req.user.userId;

  if (typeof userAnswer !== 'string') {
    return res.status(400).json({ error: 'userAnswer must be a string' });
  }
  if (typeof isCorrect !== 'boolean') {
    return res.status(400).json({ error: 'isCorrect must be a boolean' });
  }

  try {
    const blockCheck = await pool.query('SELECT subchapter_id FROM content_blocks WHERE id = $1', [contentBlockId]);
    const blockData = blockCheck.rows[0];
    if (!blockData) {
      return res.status(404).json({ message: 'Content block not found' });
    }

    const subchapterCheck = await pool.query('SELECT chapter_id FROM subchapters WHERE id = $1', [blockData.subchapter_id]);
    const subchapterData = subchapterCheck.rows[0];
    if (!subchapterData) {
      return res.status(404).json({ message: 'Subchapter not found' });
    }

    const chapterCheck = await pool.query('SELECT course_id FROM chapters WHERE id = $1', [subchapterData.chapter_id]);
    const chapterData = chapterCheck.rows[0];
    if (!chapterData) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const accessStatus = await getCourseAccessStatus(chapterData.course_id, userId);
    if (!accessStatus?.canViewContent) {
      return res.status(403).json({ error: 'You are not authorized to answer this content block' });
    }

    const saveResult = await pool.query(
      `INSERT INTO user_content_block_answers (
        user_id, content_block_id, subchapter_id, user_answer, is_correct, answered_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (user_id, content_block_id)
      DO UPDATE SET
        user_answer = EXCLUDED.user_answer,
        is_correct = EXCLUDED.is_correct,
        updated_at = NOW()
      RETURNING *`,
      [userId, contentBlockId, blockData.subchapter_id, userAnswer, isCorrect]
    );

    return res.status(200).json(saveResult.rows[0]);
  } catch (error) {
    console.error(`Error saving answer for content block ${contentBlockId}:`, error.message);
    return res.status(500).json({ error: 'Failed to save user answer' });
  }
});

// --- Favorites ---
// GET /api/courses/favorites - Get user's favorite courses
router.get('/favorites', authenticateSession, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(
      `SELECT c.* 
       FROM courses c
       INNER JOIN favorites f ON c.id = f.course_id
       WHERE f.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching favorite courses:', error.message);
    res.status(500).json({ error: 'Failed to fetch favorite courses' });
  }
});

// POST /api/courses/:id/favorite - Add course to favorites
router.post('/:id/favorite', authenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const userId = req.user.userId;
  
  try {
    // Check if course exists
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Idempotent add: keep successful response even if already in favorites
    await pool.query(
      `INSERT INTO favorites (user_id, course_id) 
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [userId, courseId]
    );
    
    res.status(200).json({ message: 'Course is in favorites' });
  } catch (error) {
    console.error(`Error adding course ${courseId} to favorites:`, error.message);
    res.status(500).json({ error: 'Failed to add course to favorites' });
  }
});

// DELETE /api/courses/:id/favorite - Remove course from favorites
router.delete('/:id/favorite', authenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error(`Error removing course ${courseId} from favorites:`, error.message);
    res.status(500).json({ error: 'Failed to remove course from favorites' });
  }
});

// GET /api/courses/:id/favorite/status - Check if course is in favorites
router.get('/:id/favorite/status', authenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const userId = req.user.userId;
  
  try {
    const result = await pool.query(
      'SELECT * FROM favorites WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    
    res.status(200).json({ isFavorite: result.rows.length > 0 });
  } catch (error) {
    console.error(`Error checking favorite status for course ${courseId}:`, error.message);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

// GET /api/courses/:id/activity - Get activity statistics for a course (time spent by day)
router.get('/:id/activity', authenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const userId = req.user.userId;
  
  try {
    // Get activity logs for the last 7 days for this course
    const result = await pool.query(
      `SELECT 
        activity_date,
        COALESCE(SUM(time_spent_minutes), 0) as time_spent_minutes
      FROM activity_logs
      WHERE user_id = $1 AND course_id = $2 
        AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY activity_date
      ORDER BY activity_date ASC`,
      [userId, courseId]
    );
    
    // Get today's activity
    const todayResult = await pool.query(
      `SELECT COALESCE(SUM(time_spent_minutes), 0) as time_spent_minutes
       FROM activity_logs
       WHERE user_id = $1 AND course_id = $2 
         AND activity_date = CURRENT_DATE`,
      [userId, courseId]
    );
    
    // Get this week's activity
    const weekResult = await pool.query(
      `SELECT COALESCE(SUM(time_spent_minutes), 0) as time_spent_minutes
       FROM activity_logs
       WHERE user_id = $1 AND course_id = $2 
         AND activity_date >= DATE_TRUNC('week', CURRENT_DATE)`,
      [userId, courseId]
    );
    
    // Get total activity
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(time_spent_minutes), 0) as time_spent_minutes
       FROM activity_logs
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );
    
    // Format data for chart (last 7 days)
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const chartData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1];
      
      const dayData = result.rows.find(
        row => new Date(row.activity_date).toDateString() === date.toDateString()
      );
      
      chartData.push({
        day: dayName,
        value: dayData ? dayData.time_spent_minutes : 0
      });
    }
    
    const todayMinutes = parseInt(todayResult.rows[0]?.time_spent_minutes) || 0;
    const weekMinutes = parseInt(weekResult.rows[0]?.time_spent_minutes) || 0;
    const totalMinutes = parseInt(totalResult.rows[0]?.time_spent_minutes) || 0;
    
    res.status(200).json({
      stats: {
        today: formatTime(todayMinutes),
        week: formatTime(weekMinutes),
        total: formatTime(totalMinutes)
      },
      chartData
    });
  } catch (error) {
    console.error(`Error fetching activity for course ${courseId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch activity statistics' });
  }
});

// Helper function to format minutes to readable time
function formatTime(minutes) {
  const mins = parseInt(minutes) || 0;
  if (mins < 60) {
    return `${mins} мин`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) {
    if (hours === 1) {
      return '1 час';
    } else if (hours < 5) {
      return `${hours} часа`;
    } else {
      return `${hours} часов`;
    }
  }
  return `${hours} ч ${remainingMins} мин`;
}

// POST /api/courses/:id/activity/track - Track time spent on course
router.post('/:id/activity/track', authenticateSession, async (req, res) => {
  const { id: courseId } = req.params;
  const { timeSpentMinutes } = req.body;
  const userId = req.user.userId;
  
  if (!timeSpentMinutes || timeSpentMinutes <= 0) {
    return res.status(400).json({ error: 'Invalid time spent' });
  }
  
  try {
    // Check if course exists
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Insert or update activity log for today
    await pool.query(
      `INSERT INTO activity_logs (user_id, activity_date, time_spent_minutes, course_id)
       VALUES ($1, CURRENT_DATE, $2, $3)
       ON CONFLICT (user_id, activity_date, course_id)
       DO UPDATE SET time_spent_minutes = activity_logs.time_spent_minutes + $2`,
      [userId, timeSpentMinutes, courseId]
    );
    
    res.status(200).json({ message: 'Activity tracked successfully' });
  } catch (error) {
    console.error(`Error tracking activity for course ${courseId}:`, error.message);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

export default router;
