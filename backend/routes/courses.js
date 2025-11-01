import express from 'express';
import pool from '../db.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

// Helper function to check if the user is the author of the course
const isCourseAuthor = async (courseId, userId) => {
  console.log(`🔍 [AUTH] Checking if user ${userId} is author of course ${courseId}`);
  const result = await pool.query('SELECT author_id FROM courses WHERE id = $1', [courseId]);
  console.log(`📋 [AUTH] Course check result:`, result.rows);
  const isAuthor = result.rows.length > 0 && result.rows[0].author_id === userId;
  console.log(`✅ [AUTH] Authorization result:`, isAuthor);
  return isAuthor;
};

// POST /api/courses - Create a new course
router.post('/', authenticateSession, async (req, res) => {
  const { title, description, isPublic } = req.body;
  const authorId = req.user.userId;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO courses (title, description, is_public, author_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, isPublic, authorId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating course:', error.message);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// GET /api/courses - Get all courses for the logged-in user
router.get('/', authenticateSession, async (req, res) => {
  const authorId = req.user.userId;
  try {
    const result = await pool.query('SELECT * FROM courses WHERE author_id = $1 ORDER BY created_at DESC', [authorId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching courses:', error.message);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// GET /api/courses/:id - Get a single course by ID with nested structure (Optimized)
router.get('/:id', authenticateSession, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const query = `
    SELECT
      c.id,
      c.title,
      c.description,
      c.is_public,
      c.author_id,
      c.created_at,
      c.updated_at,
      COALESCE(
        (
          SELECT JSON_AGG(ch_agg.*)
          FROM (
            SELECT
              ch.id,
              ch.title,
              ch.order,
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
    WHERE c.id = $1;
  `;

  try {
    const result = await pool.query(query, [id]);
    const course = result.rows[0];

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check permissions for private courses
    if (!course.is_public && course.author_id !== userId) {
      const accessResult = await pool.query(
        'SELECT * FROM course_access WHERE course_id = $1 AND user_id = $2',
        [id, userId]
      );
      if (accessResult.rows.length === 0) {
        return res.status(403).json({ error: 'You are not authorized to view this course' });
      }
    }

    res.status(200).json(course);
  } catch (error) {
    console.error(`Error fetching course ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// PUT /api/courses/:id - Update a course
router.put('/:id', authenticateSession, async (req, res) => {
  const { id } = req.params;
  const { title, description, isPublic } = req.body;
  const authorId = req.user.userId;

  try {
    if (!(await isCourseAuthor(id, authorId))) {
      return res.status(403).json({ error: 'You are not authorized to update this course' });
    }

    const result = await pool.query(
      'UPDATE courses SET title = $1, description = $2, is_public = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [title, description, isPublic, id]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating course ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /api/courses/:id - Delete a course
router.delete('/:id', authenticateSession, async (req, res) => {
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
router.put('/:id', authenticateSession, async (req, res) => {
  const { id } = req.params;
  const { title, order } = req.body;
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
      'UPDATE chapters SET title = $1, "order" = $2 WHERE id = $3 RETURNING *',
      [title, order, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating chapter ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// DELETE /api/chapters/:id - Delete a chapter
router.delete('/:id', authenticateSession, async (req, res) => {
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
router.put('/:id', authenticateSession, async (req, res) => {
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
router.delete('/:id', authenticateSession, async (req, res) => {
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
router.put('/:id', authenticateSession, async (req, res) => {
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
router.delete('/:id', authenticateSession, async (req, res) => {
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

export default router;
