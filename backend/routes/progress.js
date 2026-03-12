import express from 'express';
import pool from '../db.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

// POST /api/progress/track
// Создаёт/обновляет запись user_lesson_progress для подглавы и возвращает текущий прогресс по курсу
router.post('/track', authenticateSession, async (req, res) => {
  const { course_id, chapter_id, subchapter_id } = req.body;
  const userId = req.user.userId || req.user.profile?.id;

  if (!course_id || !subchapter_id) {
    return res.status(400).json({ error: 'course_id и subchapter_id обязательны' });
  }

  try {
    // Убедимся, что пользователь записан на курс
    await pool.query(
      `INSERT INTO user_enrollments (user_id, course_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [userId, course_id],
    );

    // Обновляем/создаём прогресс по подглаве
    const upsertResult = await pool.query(
      `INSERT INTO user_lesson_progress (user_id, lesson_id, is_completed, time_spent_seconds, completed_at)
       VALUES ($1, $2, false, 0, NULL)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET is_completed = user_lesson_progress.is_completed
       RETURNING user_id, lesson_id, is_completed, time_spent_seconds, completed_at`,
      [userId, subchapter_id],
    );

    const progressRow = upsertResult.rows[0];

    // Считаем общий прогресс по курсу как долю завершённых подглав
    const totalLessonsResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM subchapters s
       JOIN chapters c ON s.chapter_id = c.id
       WHERE c.course_id = $1`,
      [course_id],
    );

    const completedLessonsResult = await pool.query(
      `SELECT COUNT(*) AS completed
       FROM user_lesson_progress lp
       JOIN subchapters s ON lp.lesson_id = s.id
       JOIN chapters c ON s.chapter_id = c.id
       WHERE lp.user_id = $1 AND c.course_id = $2 AND lp.is_completed = true`,
      [userId, course_id],
    );

    const total = Number(totalLessonsResult.rows[0]?.total || 0);
    const completed = Number(completedLessonsResult.rows[0]?.completed || 0);
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.status(200).json({
      id: progressRow.lesson_id, // используем lesson_id как идентификатор прогресса
      user_id: userId,
      course_id,
      chapter_id: chapter_id || null,
      subchapter_id,
      content_block_id: null,
      is_completed: progressRow.is_completed,
      time_spent: progressRow.time_spent_seconds,
      last_accessed: progressRow.completed_at || null,
      created_at: null,
      updated_at: null,
      progress_percentage: progressPercentage,
    });
  } catch (error) {
    console.error('[PROGRESS] track error:', error);
    return res.status(500).json({ error: 'Failed to track progress' });
  }
});

// PUT /api/progress/:id/time
// Увеличивает time_spent_seconds для user_lesson_progress
router.put('/:id/time', authenticateSession, async (req, res) => {
  const lessonId = Number(req.params.id);
  const { additional_time } = req.body;
  const userId = req.user.userId || req.user.profile?.id;

  if (!lessonId || !Number.isFinite(lessonId)) {
    return res.status(400).json({ error: 'Invalid progress id (expected lesson_id)' });
  }
  if (!additional_time || additional_time <= 0) {
    return res.status(400).json({ error: 'additional_time must be positive' });
  }

  try {
    const updateResult = await pool.query(
      `UPDATE user_lesson_progress
       SET time_spent_seconds = time_spent_seconds + $1
       WHERE user_id = $2 AND lesson_id = $3
       RETURNING user_id, lesson_id, is_completed, time_spent_seconds, completed_at`,
      [additional_time, userId, lessonId],
    );

    const row = updateResult.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Progress record not found' });
    }

    return res.status(200).json({
      id: row.lesson_id,
      user_id: userId,
      course_id: null,
      chapter_id: null,
      subchapter_id: row.lesson_id,
      content_block_id: null,
      is_completed: row.is_completed,
      time_spent: row.time_spent_seconds,
      last_accessed: row.completed_at || null,
      created_at: null,
      updated_at: null,
    });
  } catch (error) {
    console.error('[PROGRESS] update time error:', error);
    return res.status(500).json({ error: 'Failed to update time spent' });
  }
});

// PUT /api/progress/:id/complete
// Помечает подглаву как завершённую и возвращает обновлённый прогресс по курсу
router.put('/:id/complete', authenticateSession, async (req, res) => {
  const lessonId = Number(req.params.id);
  const userId = req.user.userId || req.user.profile?.id;

  if (!lessonId || !Number.isFinite(lessonId)) {
    return res.status(400).json({ error: 'Invalid progress id (expected lesson_id)' });
  }

  try {
    // Обновляем запись user_lesson_progress
    const updateResult = await pool.query(
      `UPDATE user_lesson_progress
       SET is_completed = true,
           completed_at = COALESCE(completed_at, NOW())
       WHERE user_id = $1 AND lesson_id = $2
       RETURNING user_id, lesson_id, is_completed, time_spent_seconds, completed_at`,
      [userId, lessonId],
    );

    const row = updateResult.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Progress record not found' });
    }

    // Определяем курс по lesson_id (subchapter)
    const courseResult = await pool.query(
      `SELECT c.course_id
       FROM subchapters s
       JOIN chapters c ON s.chapter_id = c.id
       WHERE s.id = $1`,
      [lessonId],
    );
    const courseId = courseResult.rows[0]?.course_id || null;

    let progressPercentage = 0;
    if (courseId) {
      const totalLessonsResult = await pool.query(
        `SELECT COUNT(*) AS total
         FROM subchapters s
         JOIN chapters c ON s.chapter_id = c.id
         WHERE c.course_id = $1`,
        [courseId],
      );

      const completedLessonsResult = await pool.query(
        `SELECT COUNT(*) AS completed
         FROM user_lesson_progress lp
         JOIN subchapters s ON lp.lesson_id = s.id
         JOIN chapters c ON s.chapter_id = c.id
         WHERE lp.user_id = $1 AND c.course_id = $2 AND lp.is_completed = true`,
        [userId, courseId],
      );

      const total = Number(totalLessonsResult.rows[0]?.total || 0);
      const completed = Number(completedLessonsResult.rows[0]?.completed || 0);
      progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Обновляем статус завершения курса, если 100%
      if (progressPercentage === 100) {
        await pool.query(
          `UPDATE user_enrollments
           SET completion_status = 'completed'
           WHERE user_id = $1 AND course_id = $2`,
          [userId, courseId],
        );
      }
    }

    return res.status(200).json({
      id: row.lesson_id,
      user_id: userId,
      course_id: courseId,
      chapter_id: null,
      subchapter_id: row.lesson_id,
      content_block_id: null,
      is_completed: row.is_completed,
      time_spent: row.time_spent_seconds,
      last_accessed: row.completed_at,
      created_at: null,
      updated_at: null,
      progress_percentage: progressPercentage,
    });
  } catch (error) {
    console.error('[PROGRESS] complete error:', error);
    return res.status(500).json({ error: 'Failed to mark as completed' });
  }
});

// GET /api/courses/:courseId/progress
// Возвращает прогресс пользователя по курсу: список подглав и агрегированный % завершения
router.get('/courses/:courseId/progress', authenticateSession, async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.userId || req.user.profile?.id;

  try {
    const lessonsResult = await pool.query(
      `SELECT 
         s.id AS subchapter_id,
         s.title,
         lp.is_completed,
         lp.time_spent_seconds,
         lp.completed_at
       FROM subchapters s
       JOIN chapters c ON s.chapter_id = c.id
       LEFT JOIN user_lesson_progress lp 
         ON lp.lesson_id = s.id AND lp.user_id = $2
       WHERE c.course_id = $1
       ORDER BY c."order", s."order"`,
      [courseId, userId],
    );

    const total = lessonsResult.rows.length;
    const completed = lessonsResult.rows.filter((row) => row.is_completed).length;
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.status(200).json({
      progress: lessonsResult.rows.map((row) => ({
        id: row.subchapter_id,
        user_id: userId,
        course_id: Number(courseId),
        chapter_id: null,
        subchapter_id: row.subchapter_id,
        content_block_id: null,
        is_completed: row.is_completed || false,
        time_spent: row.time_spent_seconds || 0,
        last_accessed: row.completed_at,
        created_at: null,
        updated_at: null,
      })),
      completion: {
        id: 0,
        user_id: userId,
        course_id: Number(courseId),
        completed_at: null,
        progress_percentage: progressPercentage,
      },
    });
  } catch (error) {
    console.error('[PROGRESS] getCourseProgress error:', error);
    return res.status(500).json({ error: 'Failed to get course progress' });
  }
});

export default router;

