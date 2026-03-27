import pool from '../db.js';

export const authenticateSession = async (req, res, next) => {
  const { sessionId } = req.cookies;

  console.log('🔐 [AUTH] Проверка сессии для пути:', req.path);
  console.log('🍪 [AUTH] SessionId из cookies:', sessionId);
  console.log('🍪 [AUTH] Все cookies:', req.cookies);

  if (!sessionId) {
    console.log('❌ [AUTH] SessionId отсутствует');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    console.log('🔍 [AUTH] Ищу сессию в базе данных...');
    const sessionResult = await pool.query(
      'SELECT user_id, expires_at FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    const session = sessionResult.rows[0];
    console.log('📊 [AUTH] Найденная сессия:', session);

    if (!session || new Date() > new Date(session.expires_at)) {
      console.log('❌ [AUTH] Сессия недействительна или истекла');
      // Clear the invalid session cookie
      res.clearCookie('sessionId');
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    console.log('🔍 [AUTH] Ищу пользователя в базе данных...');
    const userResult = await pool.query(
      `SELECT u.email, u.email_changed_at, p.id, p.first_name, p.last_name, p.patronymic, p.avatar_url, p.role, p.bio, p.date_of_birth, p.phone_number, p.address, p.occupation,
              p.profile_details_public, p.learning_progress_public
       FROM profiles p JOIN users u ON p.id = u.id WHERE p.id = $1`,
      [session.user_id]
    );

    const user = userResult.rows[0];
    console.log('👤 [AUTH] Найденный пользователь:', user);

    if (!user) {
      console.log('❌ [AUTH] Пользователь не найден');
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = {
      userId: user.id,
      role: user.role,
      profile: user,
      email: user.email,
    };

    console.log('✅ [AUTH] Аутентификация успешна, req.user:', req.user);
    next();
  } catch (error) {
    console.error('💥 [AUTH] Ошибка аутентификации:', error.message);
    console.error('💥 [AUTH] Stack:', error.stack);
    return res.status(500).json({ error: 'An unexpected error occurred during session validation' });
  }
};

// Optional authentication middleware - sets req.user if session exists, but doesn't require it
export const optionalAuthenticateSession = async (req, res, next) => {
  const { sessionId } = req.cookies;

  if (!sessionId) {
    // No session, continue without authentication
    req.user = null;
    return next();
  }

  try {
    const sessionResult = await pool.query(
      'SELECT user_id, expires_at FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    const session = sessionResult.rows[0];

    if (!session || new Date() > new Date(session.expires_at)) {
      // Invalid or expired session, continue without authentication
      req.user = null;
      return next();
    }

    const userResult = await pool.query(
      `SELECT u.email, u.email_changed_at, p.id, p.first_name, p.last_name, p.patronymic, p.avatar_url, p.role, p.bio, p.date_of_birth, p.phone_number, p.address, p.occupation,
              p.profile_details_public, p.learning_progress_public
       FROM profiles p JOIN users u ON p.id = u.id WHERE p.id = $1`,
      [session.user_id]
    );

    const user = userResult.rows[0];

    if (user) {
      req.user = {
        userId: user.id,
        role: user.role,
        profile: user,
        email: user.email,
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('💥 [AUTH] Ошибка опциональной аутентификации:', error.message);
    // On error, continue without authentication
    req.user = null;
    next();
  }
};

export const authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.profile) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.profile.role === requiredRole || requiredRole === 'any' || (req.user.profile.role === 'teacher' && requiredRole === 'student')) {
      next();
    } else {
      res.status(403).json({ error: `Access denied. Requires ${requiredRole} role.` });
    }
  };
};
