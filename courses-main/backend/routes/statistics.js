import express from 'express';
import pool from '../db.js';
import { authenticateSession } from '../middleware/auth.js';

const router = express.Router();

// Helper function to check if the user is the author of the course or admin
const hasAccessToCourse = async (courseId, userId, userRole) => {
  if (userRole === 'admin') return true;
  
  const result = await pool.query(
    'SELECT author_id FROM courses WHERE id = $1', 
    [courseId]
  );
  
  return result.rows.length > 0 && result.rows[0].author_id === userId;
};

// GET /api/statistics/courses/:courseId - Get course statistics
router.get('/courses/:courseId', authenticateSession, async (req, res) => {
  const { courseId } = req.params;
  const { userId, role } = req.user;

  try {
    // Check if user has access to this course's statistics
    const hasAccess = await hasAccessToCourse(courseId, userId, role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Get course basic info
    const courseResult = await pool.query(
      'SELECT id, title, description, created_at FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    const course = courseResult.rows[0];

    // Get total students enrolled in the course
    const studentsResult = await pool.query(
      'SELECT COUNT(*) FROM course_enrollments WHERE course_id = $1',
      [courseId]
    );
    const totalStudents = parseInt(studentsResult.rows[0].count) || 0;

    // Get completion statistics
    const completionResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT ce.user_id) as total_enrolled,
        COUNT(DISTINCT CASE WHEN cp.completed_at IS NOT NULL THEN ce.user_id END) as completed
      FROM course_enrollments ce
      LEFT JOIN course_progress cp ON ce.user_id = cp.user_id AND ce.course_id = cp.course_id
      WHERE ce.course_id = $1`,
      [courseId]
    );

    // Get progress by chapter
    const chaptersResult = await pool.query(
      `SELECT 
        c.id, 
        c.title,
        COUNT(DISTINCT ce.user_id) as total_students,
        COUNT(DISTINCT cp.user_id) as completed_by
      FROM chapters c
      LEFT JOIN course_enrollments ce ON ce.course_id = c.course_id
      LEFT JOIN chapter_progress cp ON cp.chapter_id = c.id AND cp.completed = true AND cp.user_id = ce.user_id
      WHERE c.course_id = $1
      GROUP BY c.id, c.title
      ORDER BY c.order`,
      [courseId]
    );

    // Get average progress
    const avgProgressResult = await pool.query(
      `SELECT 
        AVG(
          (SELECT COUNT(*) FROM chapter_progress cp2 
           WHERE cp2.user_id = ce.user_id 
           AND cp2.course_id = $1 
           AND cp2.completed = true)::float / 
          NULLIF((SELECT COUNT(*) FROM chapters c2 WHERE c2.course_id = $1), 0) * 100
        ) as avg_progress
      FROM course_enrollments ce
      WHERE ce.course_id = $1`,
      [courseId]
    );

    const avgProgress = parseFloat(avgProgressResult.rows[0]?.avg_progress) || 0;

    // Prepare response
    const statistics = {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        createdAt: course.created_at,
        totalStudents,
      },
      completion: {
        totalEnrolled: parseInt(completionResult.rows[0]?.total_enrolled) || 0,
        completed: parseInt(completionResult.rows[0]?.completed) || 0,
        completionRate: totalStudents > 0 
          ? Math.round((parseInt(completionResult.rows[0]?.completed) / totalStudents) * 100) 
          : 0,
        averageProgress: Math.round(avgProgress)
      },
      chapters: chaptersResult.rows.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        totalStudents: parseInt(chapter.total_students) || 0,
        completedBy: parseInt(chapter.completed_by) || 0,
        completionRate: chapter.total_students > 0 
          ? Math.round((parseInt(chapter.completed_by) / parseInt(chapter.total_students)) * 100) 
          : 0
      }))
    };

    res.status(200).json(statistics);
  } catch (error) {
    console.error('Error fetching course statistics:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики курса' });
  }
});

// GET /api/statistics/courses/:courseId/students - Get student progress for a course
router.get('/courses/:courseId/students', authenticateSession, async (req, res) => {
  const { courseId } = req.params;
  const { userId, role } = req.user;

  try {
    // Check if user has access to this course's statistics
    const hasAccess = await hasAccessToCourse(courseId, userId, role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Get student progress
    const progressResult = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        ce.enrolled_at,
        (SELECT COUNT(*) FROM chapter_progress cp 
         WHERE cp.user_id = u.id AND cp.course_id = $1 AND cp.completed = true) as completed_chapters,
        (SELECT COUNT(*) FROM chapters c WHERE c.course_id = $1) as total_chapters,
        (SELECT MAX(completed_at) FROM chapter_progress 
         WHERE user_id = u.id AND course_id = $1) as last_activity
      FROM users u
      JOIN course_enrollments ce ON ce.user_id = u.id
      WHERE ce.course_id = $1
      ORDER BY u.last_name, u.first_name`,
      [courseId]
    );

    const students = progressResult.rows.map(student => ({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      email: student.email,
      enrolledAt: student.enrolled_at,
      completedChapters: parseInt(student.completed_chapters) || 0,
      totalChapters: parseInt(student.total_chapters) || 0,
      progress: student.total_chapters > 0 
        ? Math.round((parseInt(student.completed_chapters) / parseInt(student.total_chapters)) * 100)
        : 0,
      lastActivity: student.last_activity
    }));

    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ error: 'Ошибка при получении прогресса студентов' });
  }
});

// GET /api/statistics/courses/:courseId/chapters/:chapterId - Get detailed chapter statistics
router.get('/courses/:courseId/chapters/:chapterId', authenticateSession, async (req, res) => {
  const { courseId, chapterId } = req.params;
  const { userId, role } = req.user;

  try {
    // Check if user has access to this course's statistics
    const hasAccess = await hasAccessToCourse(courseId, userId, role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Get chapter details
    const chapterResult = await pool.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM subchapters sc WHERE sc.chapter_id = c.id) as total_subchapters
       FROM chapters c 
       WHERE c.id = $1 AND c.course_id = $2`,
      [chapterId, courseId]
    );

    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Раздел не найден' });
    }

    const chapter = chapterResult.rows[0];

    // Get student progress for this chapter
    const progressResult = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        cp.completed_at,
        (SELECT COUNT(*) FROM subchapter_progress sp 
         WHERE sp.user_id = u.id AND sp.chapter_id = $1 AND sp.completed = true) as completed_subchapters,
        $2 as total_subchapters
      FROM users u
      JOIN course_enrollments ce ON ce.user_id = u.id
      LEFT JOIN chapter_progress cp ON cp.user_id = u.id AND cp.chapter_id = $1
      WHERE ce.course_id = $3
      ORDER BY u.last_name, u.first_name`,
      [chapterId, chapter.total_subchapters, courseId]
    );

    const studentProgress = progressResult.rows.map(student => ({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      email: student.email,
      completedAt: student.completed_at,
      completedSubchapters: parseInt(student.completed_subchapters) || 0,
      totalSubchapters: parseInt(student.total_subchapters) || 0,
      progress: student.total_subchapters > 0 
        ? Math.round((parseInt(student.completed_subchapters) / parseInt(student.total_subchapters)) * 100)
        : 0
    }));

    // Get subchapter completion rates
    const subchaptersResult = await pool.query(
      `SELECT 
        s.id,
        s.title,
        s.order,
        COUNT(DISTINCT ce.user_id) as total_students,
        COUNT(DISTINCT sp.user_id) as completed_by
      FROM subchapters s
      LEFT JOIN course_enrollments ce ON ce.course_id = $1
      LEFT JOIN subchapter_progress sp ON sp.subchapter_id = s.id AND sp.completed = true AND sp.user_id = ce.user_id
      WHERE s.chapter_id = $2
      GROUP BY s.id, s.title, s.order
      ORDER BY s.order`,
      [courseId, chapterId]
    );

    const subchapters = subchaptersResult.rows.map(subchapter => ({
      id: subchapter.id,
      title: subchapter.title,
      order: subchapter.order,
      totalStudents: parseInt(subchapter.total_students) || 0,
      completedBy: parseInt(subchapter.completed_by) || 0,
      completionRate: subchapter.total_students > 0 
        ? Math.round((parseInt(subchapter.completed_by) / parseInt(subchapter.total_students)) * 100)
        : 0
    }));

    res.status(200).json({
      chapter: {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        order: chapter.order,
        totalSubchapters: parseInt(chapter.total_subchapters) || 0
      },
      studentProgress,
      subchapters
    });
  } catch (error) {
    console.error('Error fetching chapter statistics:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики раздела' });
  }
});

export default router;
