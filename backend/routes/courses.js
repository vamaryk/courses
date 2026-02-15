import express from 'express';
import pool from '../db.js';
import { authenticateSession, optionalAuthenticateSession } from '../middleware/auth.js';

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
    jobTitle
  } = req.body;
  const authorId = req.user.userId;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO courses (
        title, 
        description, 
        is_public, 
        author_id, 
        cover_image, 
        tags, 
        specialty, 
        target_audience, 
        about_course,
        course_skills,
        course_tools,
        certificate_text,
        job_title
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        title, 
        description || null, 
        isPublic || false, 
        authorId, 
        coverImage || null, 
        tags || [], 
        specialty || null, 
        targetAudience || null, 
        aboutCourse || null,
        courseSkills || [],
        courseTools || [],
        certificateText || null,
        jobTitle || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating course:', error.message);
    res.status(500).json({ error: 'Failed to create course' });
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
          0 as price,
          0 as "durationHours",
          0 as rating,
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
          0 as price,
          0 as "durationHours",
          0 as rating,
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

// GET /api/courses/my - Get all courses created by the logged-in user
router.get('/my', authenticateSession, async (req, res) => {
  const authorId = req.user.userId;
  try {
    const result = await pool.query('SELECT * FROM courses WHERE author_id = $1 ORDER BY created_at DESC', [authorId]);
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

    res.status(200).json(course);
  } catch (error) {
    console.error(`Error fetching course ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch course' });
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
    tags, 
    specialty, 
    targetAudience, 
    aboutCourse,
    courseSkills,
    courseTools,
    certificateText,
    jobTitle
  } = req.body;
  const authorId = req.user.userId;

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
        tags = $5, 
        specialty = $6, 
        target_audience = $7, 
        about_course = $8, 
        course_skills = $9,
        course_tools = $10,
        certificate_text = $11,
        job_title = $12,
        updated_at = NOW() 
      WHERE id = $13 RETURNING *`,
      [
        title, 
        description, 
        isPublic, 
        coverImage, 
        tags, 
        specialty, 
        targetAudience, 
        aboutCourse, 
        courseSkills || [],
        courseTools || [],
        certificateText || null,
        jobTitle || null,
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
  const { title, order } = req.body;
  const authorId = req.user.userId;

  if (!title || order === undefined) {
    return res.status(400).json({ error: 'Title and order are required' });
  }

  try {
    if (!(await isCourseAuthor(courseId, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to add chapters to this course' });
    }

    const result = await pool.query(
      'INSERT INTO chapters (course_id, title, "order") VALUES ($1, $2, $3) RETURNING *',
      [courseId, title, order]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating chapter:', error.message);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// PUT /api/chapters/:id - Update a chapter
// Note: This route is mounted at /api/chapters in server.js
router.put('/:id', ensureBaseUrl('/api/chapters'), authenticateSession, async (req, res) => {
  const { id } = req.params;
  const { title, order, canvasData } = req.body;
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
      'UPDATE chapters SET title = $1, "order" = $2, canvas_data = $3 WHERE id = $4 RETURNING *',
      [title, order, canvasData ? JSON.stringify(canvasData) : null, id]
    );
    res.status(200).json(result.rows[0]);
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
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subchapter:', error.message);
    res.status(500).json({ error: 'Failed to create subchapter' });
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
    res.status(201).json(result.rows[0]);
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
