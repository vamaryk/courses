import express from 'express';
import pool from '../db.js';
import { authenticateSession, authorizeRole, optionalAuthenticateSession } from '../middleware/auth.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const router = express.Router();

/** UUID: 8-4-4-4-12 hex — используется для валидации :id в профилях */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getProfilePrivacyRow(profileId) {
  const r = await pool.query(
    'SELECT profile_details_public, learning_progress_public FROM profiles WHERE id = $1',
    [profileId]
  );
  return r.rows[0] || null;
}

async function assertProfileDetailsVisible(req, res, profileId) {
  const viewerId = req.user?.profile?.id;
  if (viewerId === profileId) return true;
  const row = await getProfilePrivacyRow(profileId);
  if (!row) {
    res.status(404).json({ error: 'Profile not found' });
    return false;
  }
  if (row.profile_details_public === false) {
    res.status(403).json({ error: 'Profile is private' });
    return false;
  }
  return true;
}

async function assertLearningProgressVisible(req, res, profileId) {
  const viewerId = req.user?.profile?.id;
  if (viewerId === profileId) return true;
  const row = await getProfilePrivacyRow(profileId);
  if (!row) {
    res.status(404).json({ error: 'Profile not found' });
    return false;
  }
  if (row.profile_details_public === false) {
    res.status(403).json({ error: 'Profile is private' });
    return false;
  }
  if (row.learning_progress_public === false) {
    res.status(403).json({ error: 'Learning progress is hidden' });
    return false;
  }
  return true;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilesMediaRoot = path.join(__dirname, '..', 'data', 'profiles');

async function ensureProfileMediaDir(userId) {
  const dir = path.join(profilesMediaRoot, String(userId), 'media');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const userId = req.user?.profile?.id;
        const dir = await ensureProfileMediaDir(userId);
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const field = file.fieldname === 'banner' ? 'banner' : 'avatar';
      cb(null, `${field}${ext}`);
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

// Get current user's profile (requires authentication)
router.get('/profile', authenticateSession, (req, res) => {
  // req.user.profile is already populated by authenticateSession middleware
  res.status(200).json(req.user.profile);
});

async function findProfileMedia(userId) {
  const userMediaDir = path.join(profilesMediaRoot, String(userId), 'media');
  let avatarUrl = null;
  let bannerUrl = null;

  try {
    const entries = await fs.readdir(userMediaDir, { withFileTypes: true });

    // Helper to locate a file either directly in media dir or inside subfolder
    const findFileForType = async (type) => {
    const directFile = entries.find(
      (entry) =>
        entry.isFile() && entry.name.toLowerCase().startsWith(`${type}.`)
    );

    if (directFile) {
      // Файл лежит прямо в media: возвращаем только имя файла
      return directFile.name;
    }

      const dirEntry = entries.find(
        (entry) => entry.isDirectory() && entry.name.toLowerCase() === type
      );

      if (dirEntry) {
        const typeDir = path.join(userMediaDir, dirEntry.name);
        const typeFiles = await fs.readdir(typeDir, { withFileTypes: true });
        const firstFile = typeFiles.find((entry) => entry.isFile());
        if (firstFile) {
          // Для URL используем всегда прямые слэши, без path.join,
          // чтобы не было обратных слэшей на Windows
          return `${dirEntry.name}/${firstFile.name}`;
        }
      }

      return null;
    };

    let avatarPath = await findFileForType('avatar');
    let bannerPath = await findFileForType('banner');

    // Защита от дублирования имени файла вида banner.jpgbanner.jpg
    if (bannerPath && /^(banner\.[^/]+)\1$/i.test(bannerPath)) {
      bannerPath = bannerPath.replace(/^(banner\.[^/]+)\1$/i, '$1');
    }

    if (avatarPath) {
      avatarUrl = `/profile-media/${userId}/media/${avatarPath}`;
    }
    if (bannerPath) {
      bannerUrl = `/profile-media/${userId}/media/${bannerPath}`;
    }
  } catch (dirError) {
    console.warn(
      `Profile media directory not found or unreadable for user ${userId}:`,
      dirError.message
    );
  }

  return { avatarUrl, bannerUrl };
}

// Get current user's profile media (avatar and banner)
router.get('/profile/media', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.profile.id;
    const media = await findProfileMedia(userId);
    res.status(200).json(media);
  } catch (error) {
    console.error('Error fetching profile media:', error);
    res.status(500).json({ error: 'Failed to fetch profile media' });
  }
});

// Get media (avatar and banner) for any profile by ID
router.get('/:id/media', async (req, res) => {
  try {
    const { id } = req.params;
    const media = await findProfileMedia(id);
    res.status(200).json(media);
  } catch (error) {
    console.error('Error fetching profile media by id:', error);
    res.status(500).json({ error: 'Failed to fetch profile media' });
  }
});

async function buildUserStats(userId) {
  const metricsResult = await pool.query(
    'SELECT * FROM student_metrics WHERE user_id = $1',
    [userId]
  );

  let metrics = metricsResult.rows[0];

  if (!metrics) {
    await pool.query(
      `INSERT INTO student_metrics (user_id, courses_in_progress_count, achievements_count, total_study_time, completed_courses_count, subscriptions_count)
       VALUES ($1, 0, 0, '0 seconds'::interval, 0, 0)`,
      [userId]
    );
    metrics = {
      courses_in_progress_count: 0,
      achievements_count: 0,
      total_study_time: '0 seconds',
      completed_courses_count: 0,
      subscriptions_count: 0
    };
  }

  const totalStudyTimeInterval = metrics.total_study_time || '0 seconds';
  const totalHours = Math.floor(
    (typeof totalStudyTimeInterval === 'string'
      ? parseFloat(totalStudyTimeInterval.split(':')[0]) || 0
      : totalStudyTimeInterval.total_seconds / 3600) || 0
  );

  const [coursesCount, achievementsCount, subscriptionsCount, studyTimeResult, friendsCountResult] = await Promise.all([
    pool.query(
      `SELECT 
          COUNT(DISTINCT CASE WHEN ue.completion_status = 'completed' THEN ue.course_id END) as completed,
          COUNT(DISTINCT CASE WHEN ue.completion_status = 'in_progress' THEN ue.course_id END) as in_progress
        FROM user_enrollments ue
        INNER JOIN courses c ON c.id = ue.course_id
        WHERE ue.user_id = $1::uuid AND c.author_id IS DISTINCT FROM $1::uuid`,
      [userId]
    ),
    pool.query(
      'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1',
      [userId]
    ),
    pool.query(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = $1',
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(time_spent_minutes), 0) as total_minutes 
         FROM activity_logs WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*) as count FROM friendships 
       WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'`,
      [userId]
    )
  ]);

  const completedCourses = parseInt(coursesCount.rows[0]?.completed) || 0;
  const inProgressCourses = parseInt(coursesCount.rows[0]?.in_progress) || 0;
  const achievements = parseInt(achievementsCount.rows[0]?.count) || 0;
  const subscriptions = parseInt(subscriptionsCount.rows[0]?.count) || 0;
  const totalMinutes = parseInt(studyTimeResult.rows[0]?.total_minutes) || 0;
  const totalHoursCalculated = Math.floor(totalMinutes / 60);
  const friendsCount = parseInt(friendsCountResult.rows[0]?.count) || 0;

  return {
    hoursOnPlatform: totalHoursCalculated,
    coursesCompleted: completedCourses,
    achievementsCount: achievements,
    subscriptionsCount: subscriptions,
    coursesInProgress: inProgressCourses,
    friendsCount
  };
}

// Get current user's profile statistics for dashboard (requires authentication)
router.get('/profile/stats', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.profile.id;
    const stats = await buildUserStats(userId);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching user profile stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Get list of current user's subscriptions (favorite courses and their authors)
router.get('/profile/subscriptions', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.profile.id;

    const result = await pool.query(
      `SELECT 
        f.id,
        p.id as user_id,
        p.first_name,
        p.last_name,
        p.avatar_url
      FROM favorites f
      JOIN courses c ON c.id = f.course_id
      JOIN profiles p ON p.id = c.author_id
      WHERE f.user_id = $1`,
      [userId]
    );

    const subscriptions = result.rows.map((row) => ({
      id: row.id,
      user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        avatar: row.avatar_url,
      },
    }));

    res.status(200).json(subscriptions);
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Update current user's profile (requires authentication)
router.put('/profile', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const {
    first_name,
    last_name,
    patronymic,
    avatar_url,
    bio,
    date_of_birth,
    phone_number,
    address,
    occupation,
    profile_details_public,
    learning_progress_public,
  } = req.body; // Role cannot be changed here

  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  // Validation for first_name and last_name
  if (first_name !== undefined) {
    if (first_name.length < 2 || first_name.length > 50) {
      return res.status(400).json({ error: 'First name must be between 2 and 50 characters.' });
    }
    updateFields.push(`first_name = $${paramIndex++}`);
    updateValues.push(first_name);
  }
  if (last_name !== undefined) {
    if (last_name.length < 2 || last_name.length > 50) {
      return res.status(400).json({ error: 'Last name must be between 2 and 50 characters.' });
    }
    updateFields.push(`last_name = $${paramIndex++}`);
    updateValues.push(last_name);
  }
  if (patronymic !== undefined) {
    updateFields.push(`patronymic = $${paramIndex++}`);
    updateValues.push(patronymic);
  }
  if (avatar_url !== undefined) {
    updateFields.push(`avatar_url = $${paramIndex++}`);
    updateValues.push(avatar_url);
  }
  if (bio !== undefined) {
    updateFields.push(`bio = $${paramIndex++}`);
    updateValues.push(bio);
  }
  if (date_of_birth !== undefined) {
    updateFields.push(`date_of_birth = $${paramIndex++}`);
    updateValues.push(date_of_birth);
  }
  if (phone_number !== undefined) {
    updateFields.push(`phone_number = $${paramIndex++}`);
    updateValues.push(phone_number);
  }
  if (address !== undefined) {
    updateFields.push(`address = $${paramIndex++}`);
    updateValues.push(address);
  }
  if (occupation !== undefined) {
    updateFields.push(`occupation = $${paramIndex++}`);
    updateValues.push(occupation);
  }
  if (profile_details_public !== undefined) {
    updateFields.push(`profile_details_public = $${paramIndex++}`);
    updateValues.push(!!profile_details_public);
  }
  if (learning_progress_public !== undefined) {
    updateFields.push(`learning_progress_public = $${paramIndex++}`);
    updateValues.push(!!learning_progress_public);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields provided for update' });
  }

  updateValues.push(userId); // Add userId as the last parameter

  try {
    const query = `UPDATE profiles SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating profile for user ${userId}:`, error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload avatar and/or banner for current user
router.post(
  '/profile/media',
  authenticateSession,
  profileUpload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user.profile.id;
      const files = req.files || {};

      let avatarUrl = null;
      let bannerUrl = null;

      if (files.avatar && files.avatar[0]) {
        const avatarFile = files.avatar[0];
        avatarUrl = `/profile-media/${userId}/media/${avatarFile.filename}`;
        await pool.query('UPDATE profiles SET avatar_url = $1 WHERE id = $2', [
          avatarUrl,
          userId,
        ]);
      }

      if (files.banner && files.banner[0]) {
        const bannerFile = files.banner[0];
        bannerUrl = `/profile-media/${userId}/media/${bannerFile.filename}`;
      }

      res.status(200).json({
        avatarUrl,
        bannerUrl,
      });
    } catch (error) {
      console.error('Error uploading profile media:', error);
      res.status(500).json({ error: 'Failed to upload profile media' });
    }
  }
);

// Get all profiles (This might be sensitive, consider protecting it)
// For now, let's protect it
router.get('/', authenticateSession, authorizeRole('teacher'), async (req, res) => { // Only teachers can see all profiles
  try {
    const result = await pool.query('SELECT id, first_name, last_name, patronymic, avatar_url, role, bio, created_at FROM profiles');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching all profiles:', error.message);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Get current user's achievements (requires authentication)
router.get('/achievements', authenticateSession, async (req, res) => {
  console.log('🎯 [ACHIEVEMENTS] Маршрут /achievements вызван');
  console.log('🎯 [ACHIEVEMENTS] req.user:', req.user ? 'существует' : 'отсутствует');
  
  // Проверяем, что пользователь аутентифицирован
  if (!req.user || !req.user.profile || !req.user.profile.id) {
    console.error('❌ [ACHIEVEMENTS] req.user или req.user.profile отсутствует');
    console.error('❌ [ACHIEVEMENTS] req.user:', req.user);
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user.profile.id;
  console.log('📊 [ACHIEVEMENTS] Запрос достижений для пользователя:', userId);
  console.log('📊 [ACHIEVEMENTS] Тип userId:', typeof userId);
  
  try {
    // Проверяем, что userId является валидным UUID
    if (typeof userId !== 'string' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error(`❌ [ACHIEVEMENTS] Невалидный UUID: ${userId}`);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const result = await pool.query(
      `SELECT 
        a.id,
        a.name,
        a.description,
        a.icon_url,
        ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    console.log(`✅ [ACHIEVEMENTS] Найдено достижений: ${result.rows.length} для пользователя ${userId}`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`❌ [ACHIEVEMENTS] Ошибка при получении достижений для пользователя ${userId}:`, error.message);
    console.error(`❌ [ACHIEVEMENTS] Stack:`, error.stack);
    console.error(`❌ [ACHIEVEMENTS] Полная ошибка:`, error);
    
    // Возвращаем детальную информацию об ошибке в development режиме
    const errorResponse = {
      error: 'Failed to fetch achievements',
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    };
    
    res.status(500).json(errorResponse);
  }
});

// Get achievements for any profile by ID (public view)
router.get('/:id/achievements', optionalAuthenticateSession, async (req, res) => {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  const allowed = await assertProfileDetailsVisible(req, res, id);
  if (!allowed) return;

  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        a.name,
        a.description,
        a.icon_url,
        ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC`,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error fetching achievements for profile ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get current user's courses (requires authentication)
router.get('/profile/courses', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.profile.id;

    const result = await pool.query(
      `SELECT 
        c.id,
        c.title,
        c.description,
        c.cover_image as image,
        ue.completion_status,
        ue.enrolled_at,
        p.id AS author_profile_id,
        COALESCE(p.first_name || ' ' || p.last_name, 'Преподаватель') AS author_name,
        p.avatar_url AS author_avatar_url,
        CASE 
          WHEN ue.completion_status = 'completed' THEN 100
          ELSE COALESCE(
            COUNT(DISTINCT ulp.lesson_id)::float / NULLIF(COUNT(DISTINCT sc.id), 0) * 100, 
            0
          )
        END as progress
      FROM user_enrollments ue
      JOIN courses c ON c.id = ue.course_id
      LEFT JOIN profiles p ON p.id = c.author_id
      LEFT JOIN chapters ch ON ch.course_id = c.id
      LEFT JOIN subchapters sc ON sc.chapter_id = ch.id
      LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = sc.id AND ulp.user_id = $1::uuid AND ulp.is_completed = true
      WHERE ue.user_id = $1::uuid AND c.author_id IS DISTINCT FROM $1::uuid
      GROUP BY c.id, c.title, c.description, c.cover_image, ue.completion_status, ue.enrolled_at,
        p.id, p.first_name, p.last_name, p.avatar_url
      ORDER BY ue.enrolled_at DESC
      LIMIT 10`,
      [userId]
    );

    const courses = result.rows.map(course => ({
      id: course.id,
      title: course.title,
      image: course.image || null,
      progress: Math.round(parseFloat(course.progress) || 0),
      isCompleted: course.completion_status === 'completed',
      authorName: course.author_name || null,
      authorAvatarUrl: course.author_avatar_url || null,
      courseAuthorId: course.author_profile_id != null ? String(course.author_profile_id) : null,
    }));

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching user courses:', error);
    res.status(500).json({ error: 'Failed to fetch user courses' });
  }
});

// Public: get courses in progress/completed for any user by profile id
router.get('/:id/courses', optionalAuthenticateSession, async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  const allowed = await assertLearningProgressVisible(req, res, id);
  if (!allowed) return;

  try {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.title,
        c.description,
        c.cover_image as image,
        ue.completion_status,
        ue.enrolled_at,
        p.id AS author_profile_id,
        COALESCE(p.first_name || ' ' || p.last_name, 'Преподаватель') AS author_name,
        p.avatar_url AS author_avatar_url,
        CASE 
          WHEN ue.completion_status = 'completed' THEN 100
          ELSE COALESCE(
            COUNT(DISTINCT ulp.lesson_id)::float / NULLIF(COUNT(DISTINCT sc.id), 0) * 100, 
            0
          )
        END as progress
      FROM user_enrollments ue
      JOIN courses c ON c.id = ue.course_id
      LEFT JOIN profiles p ON p.id = c.author_id
      LEFT JOIN chapters ch ON ch.course_id = c.id
      LEFT JOIN subchapters sc ON sc.chapter_id = ch.id
      LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = sc.id AND ulp.user_id = $1::uuid AND ulp.is_completed = true
      WHERE ue.user_id = $1::uuid AND c.author_id IS DISTINCT FROM $1::uuid
      GROUP BY c.id, c.title, c.description, c.cover_image, ue.completion_status, ue.enrolled_at,
        p.id, p.first_name, p.last_name, p.avatar_url
      ORDER BY ue.enrolled_at DESC
      LIMIT 10`,
      [id]
    );

    const courses = result.rows.map(course => ({
      id: course.id,
      title: course.title,
      image: course.image || null,
      progress: Math.round(parseFloat(course.progress) || 0),
      isCompleted: course.completion_status === 'completed',
      authorName: course.author_name || null,
      authorAvatarUrl: course.author_avatar_url || null,
      courseAuthorId: course.author_profile_id != null ? String(course.author_profile_id) : null,
    }));

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching user courses by id:', error);
    res.status(500).json({ error: 'Failed to fetch user courses' });
  }
});

// Get current user's course progress for ProgressRings (requires authentication)
router.get('/profile/courses/progress', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.profile.id;

    const result = await pool.query(
      `SELECT 
        c.id,
        c.title,
        CASE 
          WHEN ue.completion_status = 'completed' THEN 100
          ELSE COALESCE(
            COUNT(DISTINCT ulp.lesson_id)::float / NULLIF(COUNT(DISTINCT sc.id), 0) * 100, 
            0
          )
        END as progress
      FROM user_enrollments ue
      JOIN courses c ON c.id = ue.course_id
      LEFT JOIN chapters ch ON ch.course_id = c.id
      LEFT JOIN subchapters sc ON sc.chapter_id = ch.id
      LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = sc.id AND ulp.user_id = $1::uuid AND ulp.is_completed = true
      WHERE ue.user_id = $1::uuid AND ue.completion_status != 'completed' AND c.author_id IS DISTINCT FROM $1::uuid
      GROUP BY c.id, c.title, ue.completion_status
      ORDER BY progress DESC
      LIMIT 3`,
      [userId]
    );

    const colors = [
      'hsl(262, 52%, 65%)',
      'hsl(231, 48%, 48%)',
      'hsl(180, 60%, 50%)'
    ];

    const progressData = result.rows.map((course, index) => ({
      title: course.title,
      progress: Math.round(parseFloat(course.progress) || 0),
      color: colors[index % colors.length]
    }));

    res.status(200).json(progressData);
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

// Public stats for any profile by ID
router.get('/:id/stats', optionalAuthenticateSession, async (req, res) => {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  const allowed = await assertLearningProgressVisible(req, res, id);
  if (!allowed) return;

  try {
    const stats = await buildUserStats(id);
    res.status(200).json(stats);
  } catch (error) {
    console.error(`Error fetching stats for profile ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Public list of friends for a profile (id, first_name, last_name, avatar_url)
router.get('/:id/friends', optionalAuthenticateSession, async (req, res) => {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  const allowed = await assertProfileDetailsVisible(req, res, id);
  if (!allowed) return;

  try {
    const result = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, p.avatar_url
       FROM friendships f
       JOIN profiles p ON (
         CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END = p.id
       )
       WHERE (f.user_id = $1 OR f.friend_id = $1)
         AND f.status = 'accepted'
       ORDER BY p.first_name, p.last_name`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(`Error fetching friends for profile ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Get statistics chart data (requires authentication)
router.get('/profile/statistics/chart', authenticateSession, async (req, res) => {
  try {
    const userId = req.user.profile.id;

    const result = await pool.query(
      `SELECT 
        c.id,
        c.title,
        CASE 
          WHEN ue.completion_status = 'completed' THEN 100
          ELSE COALESCE(
            COUNT(DISTINCT ulp.lesson_id)::float / NULLIF(COUNT(DISTINCT sc.id), 0) * 100, 
            0
          )
        END as progress
      FROM user_enrollments ue
      JOIN courses c ON c.id = ue.course_id
      LEFT JOIN chapters ch ON ch.course_id = c.id
      LEFT JOIN subchapters sc ON sc.chapter_id = ch.id
      LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = sc.id AND ulp.user_id = $1::uuid AND ulp.is_completed = true
      WHERE ue.user_id = $1::uuid AND c.author_id IS DISTINCT FROM $1::uuid
      GROUP BY c.id, c.title, ue.completion_status
      ORDER BY progress DESC
      LIMIT 5`,
      [userId]
    );

    const colors = [
      'hsl(262, 52%, 65%)',
      'hsl(231, 48%, 48%)',
      'hsl(180, 60%, 50%)',
      'hsl(45, 90%, 55%)',
      'hsl(340, 75%, 55%)'
    ];

    const totalProgress = result.rows.length > 0
      ? Math.round(result.rows.reduce((sum, course) => sum + parseFloat(course.progress || 0), 0) / result.rows.length)
      : 0;

    const chartData = result.rows.map((course, index) => ({
      name: `${index + 1}. ${course.title.length > 20 ? course.title.substring(0, 20) + '...' : course.title}`,
      value: Math.round(parseFloat(course.progress) || 0),
      color: colors[index % colors.length]
    }));

    res.status(200).json({
      data: chartData,
      totalProgress
    });
  } catch (error) {
    console.error('Error fetching statistics chart:', error);
    res.status(500).json({ error: 'Failed to fetch statistics chart' });
  }
});

// Get top courses (public endpoint, but can be filtered by user)
router.get('/top-courses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.title,
        COUNT(DISTINCT ue.user_id) as students_count
      FROM courses c
      LEFT JOIN user_enrollments ue ON ue.course_id = c.id
      WHERE c.is_public = true
      GROUP BY c.id, c.title
      ORDER BY students_count DESC
      LIMIT 5`
    );

    if (result.rows.length === 0) {
      return res.status(200).json([]);
    }

    const maxStudents = Math.max(...result.rows.map(r => parseInt(r.students_count) || 0));
    
    const topCourses = result.rows.map(course => ({
      name: course.title,
      students: parseInt(course.students_count) || 0,
      percentage: maxStudents > 0 ? Math.round((parseInt(course.students_count) / maxStudents) * 100) : 0
    }));

    res.status(200).json(topCourses);
  } catch (error) {
    console.error('Error fetching top courses:', error);
    res.status(500).json({ error: 'Failed to fetch top courses' });
  }
});

// Aggregate stats for all courses authored by a profile (public)
router.get('/:id/courses/authored-stats', optionalAuthenticateSession, async (req, res) => {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  const allowed = await assertProfileDetailsVisible(req, res, id);
  if (!allowed) return;

  try {
    const result = await pool.query(
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
      [id]
    );

    const row = result.rows[0];
    res.status(200).json({
      total_students: Number(row?.total_students ?? 0),
      average_rating:
        row?.average_rating != null ? parseFloat(row.average_rating) : null,
    });
  } catch (error) {
    console.error(`Error fetching authored stats for profile ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch authored stats' });
  }
});

// Public list of authored courses for a profile (топ-5 по числу студентов)
router.get('/:id/courses/authored', optionalAuthenticateSession, async (req, res) => {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  const allowed = await assertProfileDetailsVisible(req, res, id);
  if (!allowed) return;

  try {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.title,
        c.description,
        c.cover_image,
        c.is_public,
        c.created_at,
        COUNT(DISTINCT ue.user_id) as students_count,
        COALESCE(
          (SELECT ROUND(AVG(rating)::numeric, 2) FROM course_ratings WHERE course_id = c.id),
          0
        ) AS rating
      FROM courses c
      LEFT JOIN user_enrollments ue ON ue.course_id = c.id
      WHERE c.author_id = $1
      GROUP BY c.id, c.title, c.description, c.cover_image, c.is_public, c.created_at
      ORDER BY COUNT(DISTINCT ue.user_id) DESC, c.created_at DESC
      LIMIT 5`,
      [id]
    );

    const courses = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      cover_image: row.cover_image,
      is_public: row.is_public,
      students_count: parseInt(row.students_count) || 0,
      created_at: row.created_at,
      rating: parseFloat(row.rating) || 0,
    }));

    res.status(200).json(courses);
  } catch (error) {
    console.error(`Error fetching authored courses for profile ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch authored courses' });
  }
});

// Get a single profile by ID — respects profile_details_public for non-owners
router.get('/:id', optionalAuthenticateSession, async (req, res) => {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  const viewerId = req.user?.profile?.id || null;
  const isOwner = viewerId === id;

  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, patronymic, avatar_url, role, bio, date_of_birth, phone_number, address, occupation,
              profile_details_public, learning_progress_public
       FROM profiles WHERE id = $1`,
      [id]
    );
    const profile = result.rows[0];

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (isOwner) {
      const emailRow = await pool.query('SELECT email, email_changed_at FROM users WHERE id = $1', [id]);
      return res.status(200).json({
        ...profile,
        email: emailRow.rows[0]?.email,
        email_changed_at: emailRow.rows[0]?.email_changed_at,
      });
    }

    if (profile.profile_details_public === false) {
      return res.status(200).json({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
        profile_details_public: false,
        learning_progress_public: profile.learning_progress_public,
      });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error(`Error fetching profile ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
