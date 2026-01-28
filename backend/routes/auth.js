import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import bcrypt from 'bcrypt';
import { authenticateSession } from '../middleware/auth.js'; // Import authenticateSession
import logAuthAttempt from '../middleware/logging.js'; // Import the new logging middleware

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';

// Simple logger function
const logger = (level, message, data = {}) => {
  // To disable logging, you can check for an environment variable.
  // For example, only log if NODE_ENV is 'development'.
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
  }
};

// User Registration (Signup)
router.post('/signup', async (req, res) => {
  logger('info', 'Signup attempt received.');
  const {
    email,
    password,
    first_name,
    last_name,
    patronymic,
    date_of_birth,
    phone_number,
    avatar_url,
    role = 'student'
  } = req.body;
  logger('info', 'Request body for signup:', { email, first_name, last_name, role });

  // Basic validation
  if (!email || !password || !first_name || !last_name) {
    logger('warn', 'Signup validation failed: Email, password, first name, and last name are required.');
    return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger('warn', 'Signup validation failed: Invalid email format.', { email });
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Password length validation
  if (password.length < 8) {
    logger('warn', 'Signup validation failed: Password must be at least 8 characters long.');
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  // Name length validation
  if (first_name.length < 2 || first_name.length > 50) {
    logger('warn', 'Signup validation failed: First name must be between 2 and 50 characters.', { first_name });
    return res.status(400).json({ error: 'First name must be between 2 and 50 characters' });
  }
  if (last_name.length < 2 || last_name.length > 50) {
    logger('warn', 'Signup validation failed: Last name must be between 2 and 50 characters.', { last_name });
    return res.status(400).json({ error: 'Last name must be between 2 and 50 characters' });
  }

  try {
    // Hash password
    logger('info', 'Hashing password for signup...');
    const hashedPassword = await bcrypt.hash(password, 10);
    logger('info', 'Password hashed for signup.');

    // 1. Create user in the 'users' table
    logger('info', 'Inserting user into users table for signup...', { email });
    const userResult = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    const userId = userResult.rows[0].id;
    logger('info', 'User inserted for signup, userId:', { userId });

    // 2. Create profile entry in the 'profiles' table
    logger('info', 'Inserting profile into profiles table for signup...', { userId, first_name, last_name });
    await pool.query(
      `INSERT INTO profiles (id, first_name, last_name, patronymic, date_of_birth, phone_number, avatar_url, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [userId, first_name, last_name, patronymic, date_of_birth, phone_number, avatar_url, role]
    );
    logger('info', 'Profile inserted for signup.');

    // 3. Create student_metrics entry for the new user
    logger('info', 'Creating student_metrics entry for signup...', { userId });
    // Check if additional columns exist before using them
    const studentMetricsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'student_metrics' AND table_schema = 'public'
    `);
    const hasCompletedCourses = studentMetricsColumns.rows.some(r => r.column_name === 'completed_courses_count');
    const hasSubscriptions = studentMetricsColumns.rows.some(r => r.column_name === 'subscriptions_count');
    
    if (hasCompletedCourses && hasSubscriptions) {
      await pool.query(
        `INSERT INTO student_metrics (user_id, courses_in_progress_count, achievements_count, total_study_time, completed_courses_count, subscriptions_count)
         VALUES ($1, 0, 0, '0 seconds'::interval, 0, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
    } else {
      // Fallback to basic fields if additional columns don't exist
      await pool.query(
        `INSERT INTO student_metrics (user_id, courses_in_progress_count, achievements_count, total_study_time)
         VALUES ($1, 0, 0, '0 seconds'::interval)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      // If columns exist separately, update them
      if (hasCompletedCourses) {
        await pool.query(
          `UPDATE student_metrics SET completed_courses_count = 0 WHERE user_id = $1`,
          [userId]
        );
      }
      if (hasSubscriptions) {
        await pool.query(
          `UPDATE student_metrics SET subscriptions_count = 0 WHERE user_id = $1`,
          [userId]
        );
      }
    }
    logger('info', 'Student metrics created for signup.');

    // 4. Create instructor_metrics entry for the new user
    logger('info', 'Creating instructor_metrics entry for signup...', { userId });
    await pool.query(
      `INSERT INTO instructor_metrics (user_id, courses_created_count, total_students_count, total_subscribers)
       VALUES ($1, 0, 0, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    logger('info', 'Instructor metrics created for signup.');

    // Create a session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const sessionResult = await pool.query(
      'INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING session_id',
      [userId, expiresAt]
    );
    const sessionId = sessionResult.rows[0].session_id;

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      expires: expiresAt,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Allow cross-site in production, lax in development
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: userId, email, first_name, last_name, role },
    });
    logger('info', 'Signup successful.', { userId, email });

  } catch (error) {
    logger('error', 'Signup Error:', { message: error.message, stack: error.stack });
    res.status(500).json({ error: 'An unexpected error occurred during signup' });
  }
});

// User Login (Signin)
router.post('/signin', logAuthAttempt, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.locals.authFailure = true;
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 1. Find user by email
    logger('info', 'Attempting to find user by email for signin...', { email });
    const userResult = await pool.query('SELECT id, email, password FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      res.locals.authFailure = true;
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Compare provided password with hashed password
    logger('info', 'Comparing passwords for signin...', { userId: user.id });
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      res.locals.authFailure = true;
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userId = user.id;

    // 3. Fetch user's role from profiles table
    logger('info', 'Fetching user role for signin...', { userId });
    const profileResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [userId]);
    const profile = profileResult.rows[0];

    if (!profile) {
      logger('error', 'Profile fetch after signin failed: User profile not found.', { userId });
      return res.status(500).json({ error: 'Could not fetch user role' });
    }

    const userRole = profile.role || 'student'; // Default to student if role is missing
    logger('info', 'User role fetched for signin.', { userId, role: userRole });

    // Create a session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const sessionResult = await pool.query(
      'INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING session_id',
      [userId, expiresAt]
    );
    const sessionId = sessionResult.rows[0].session_id;
    logger('info', 'Session created for signin.', { userId, sessionId });

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      expires: expiresAt,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Allow cross-site in production, lax in development
    });

    // Set flags for the logging middleware
    res.locals.authSuccess = true;
    res.locals.username = email; // or user.username if you have it

    // Return success response instead of redirect
    res.status(200).json({
      message: 'Login successful',
      user: { id: userId, email, first_name: profile.first_name, last_name: profile.last_name, role: userRole }
    });

  } catch (error) {
    res.locals.authFailure = true;
    logger('error', 'Signin Error:', { message: error.message, stack: error.stack });
    res.status(500).json({ error: 'An unexpected error occurred during signin' });
  }
});

// GET /api/auth/test - Test endpoint without authentication
router.get('/test', (req, res) => {
  console.log('🧪 [AUTH TEST] Request received');
  console.log('🍪 [AUTH TEST] Cookies:', req.cookies);
  console.log('🔗 [AUTH TEST] Headers:', req.headers);
  res.status(200).json({
    message: 'Test endpoint working',
    cookies: req.cookies,
    timestamp: new Date().toISOString()
  });
});
router.get('/me', authenticateSession, async (req, res) => {
  try {
    console.log('🔍 [AUTH ME] Request received');
    console.log('🍪 [AUTH ME] Cookies:', req.cookies);
    console.log('👤 [AUTH ME] User object:', req.user);

    // req.user is populated by authenticateSession middleware
    if (req.user) {
      // Return user profile data in the format expected by frontend
      const userProfile = {
        id: req.user.profile.id,
        email: req.user.email || req.user.profile.email,
        first_name: req.user.profile.first_name,
        last_name: req.user.profile.last_name,
        patronymic: req.user.profile.patronymic,
        phone_number: req.user.profile.phone_number,
        date_of_birth: req.user.profile.date_of_birth,
        avatar_url: req.user.profile.avatar_url,
        role: req.user.profile.role,
      };
      console.log('✅ [AUTH ME] User profile requested successfully.', { userId: req.user.profile.id });
      res.status(200).json(userProfile);
    } else {
      console.log('❌ [AUTH ME] User is not authenticated.');
      res.status(401).json({ error: 'Authentication required' });
    }
  } catch (error) {
    console.error('💥 [AUTH ME] Error fetching user profile:', { message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// POST /api/auth/signout - Logout user (alias for logout)
router.post('/signout', (req, res) => {
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Must match the settings used to set the cookie
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Must match the settings used to set the cookie
  });
  logger('info', 'User logged out successfully via signout.');
  res.status(200).json({ message: 'Logged out successfully' });
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Must match the settings used to set the cookie
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Must match the settings used to set the cookie
  });
  logger('info', 'User logged out successfully.');
  res.status(200).json({ message: 'Logged out successfully' });
});

// Validation helper function
const validateProfileData = (data, isPartial = false) => {
  const errors = [];

  // Email validation
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  } else if (!isPartial) {
    errors.push('Email is required');
  }

  // First name validation
  if (data.first_name !== undefined) {
    if (typeof data.first_name !== 'string' || data.first_name.trim().length < 2 || data.first_name.trim().length > 50) {
      errors.push('First name must be between 2 and 50 characters');
    }
  } else if (!isPartial) {
    errors.push('First name is required');
  }

  // Last name validation
  if (data.last_name !== undefined) {
    if (typeof data.last_name !== 'string' || data.last_name.trim().length < 2 || data.last_name.trim().length > 50) {
      errors.push('Last name must be between 2 and 50 characters');
    }
  } else if (!isPartial) {
    errors.push('Last name is required');
  }

  // Patronymic validation (optional)
  if (data.patronymic !== undefined && data.patronymic !== null && data.patronymic !== '') {
    if (typeof data.patronymic !== 'string' || data.patronymic.trim().length > 50) {
      errors.push('Patronymic must be no more than 50 characters');
    }
  }

  // Phone number validation (optional)
  if (data.phone_number !== undefined && data.phone_number !== null && data.phone_number !== '') {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(data.phone_number) || data.phone_number.length > 20) {
      errors.push('Invalid phone number format');
    }
  }

  // Date of birth validation (optional)
  if (data.date_of_birth !== undefined && data.date_of_birth !== null && data.date_of_birth !== '') {
    const date = new Date(data.date_of_birth);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date of birth format');
    } else {
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      if (age < 13 || age > 120) {
        errors.push('Date of birth must represent an age between 13 and 120 years');
      }
    }
  }

  // Avatar URL validation (optional)
  if (data.avatar_url !== undefined && data.avatar_url !== null && data.avatar_url !== '') {
    try {
      new URL(data.avatar_url);
    } catch {
      // If it's not a valid URL, check if it's a relative path
      if (!data.avatar_url.startsWith('/') && !data.avatar_url.startsWith('./')) {
        errors.push('Invalid avatar URL format');
      }
    }
  }

  return errors;
};

// Create user profile (POST) - обычно вызывается при регистрации, но может быть отдельным эндпоинтом
router.post('/profile', authenticateSession, async (req, res) => {
  if (!req.user || !req.user.profile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user.profile.id;
  const { first_name, last_name, patronymic, email, phone_number, date_of_birth, avatar_url } = req.body;

  // Validate all required fields
  const validationErrors = validateProfileData(req.body, false);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join('; ') });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if profile already exists
    const existingProfile = await client.query('SELECT id FROM profiles WHERE id = $1', [userId]);
    if (existingProfile.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(409).json({ error: 'Profile already exists. Use PATCH or PUT to update it.' });
    }

    // Check if email is already taken by another user
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, userId]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'Email is already in use' });
    }

    // Update email in users table if provided
    if (email) {
      await client.query(
        'UPDATE users SET email = $1 WHERE id = $2',
        [email, userId]
      );
    }

    // Create profile in profiles table
    const profileResult = await client.query(
      `INSERT INTO profiles (id, first_name, last_name, patronymic, phone_number, date_of_birth, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, first_name, last_name, patronymic, phone_number, date_of_birth, avatar_url, role, created_at, updated_at`,
      [userId, first_name, last_name, patronymic || null, phone_number || null, date_of_birth || null, avatar_url || null]
    );

    await client.query('COMMIT');

    const newProfile = {
      ...profileResult.rows[0],
      email: email || req.user.email
    };

    res.status(201).json({ user: newProfile });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update user profile (PUT - full update)
router.put('/profile', authenticateSession, async (req, res) => {
  if (!req.user || !req.user.profile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user.profile.id;
  const { first_name, last_name, patronymic, email, phone_number, date_of_birth, avatar_url } = req.body;

  // Validate all required fields for full update
  const validationErrors = validateProfileData(req.body, false);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join('; ') });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ error: 'Email is already in use' });
      }

      // Update email in users table
      await client.query(
        'UPDATE users SET email = $1 WHERE id = $2',
        [email, userId]
      );
    }

    // Update profile data in profiles table
    const profileResult = await client.query(
      `UPDATE profiles
       SET first_name = $1,
           last_name = $2,
           patronymic = $3,
           phone_number = $4,
           date_of_birth = $5,
           avatar_url = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, first_name, last_name, patronymic, phone_number, date_of_birth, avatar_url, role, created_at, updated_at`,
      [first_name, last_name, patronymic || null, phone_number || null, date_of_birth || null, avatar_url || null, userId]
    );

    await client.query('COMMIT');

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const updatedUser = {
      ...profileResult.rows[0],
      email: email || req.user.email
    };

    res.json({ user: updatedUser });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Partial update user profile (PATCH)
router.patch('/profile', authenticateSession, async (req, res) => {
  if (!req.user || !req.user.profile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user.profile.id;
  const updateData = req.body;

  // Validate only provided fields (partial update)
  const validationErrors = validateProfileData(updateData, true);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join('; ') });
  }

  // Check if any fields are provided
  const allowedFields = ['first_name', 'last_name', 'patronymic', 'email', 'phone_number', 'date_of_birth', 'avatar_url'];
  const providedFields = Object.keys(updateData).filter(key => allowedFields.includes(key));
  
  if (providedFields.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Handle email update separately (it's in users table)
    if (updateData.email) {
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [updateData.email, userId]
      );

      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ error: 'Email is already in use' });
      }

      await client.query(
        'UPDATE users SET email = $1 WHERE id = $2',
        [updateData.email, userId]
      );
    }

    // Build dynamic update query for profile fields
    const profileFields = ['first_name', 'last_name', 'patronymic', 'phone_number', 'date_of_birth', 'avatar_url'];
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    profileFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        updateValues.push(updateData[field] || null);
      }
    });

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(userId);

      const profileResult = await client.query(
        `UPDATE profiles
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, first_name, last_name, patronymic, phone_number, date_of_birth, avatar_url, role, created_at, updated_at`,
        updateValues
      );

      await client.query('COMMIT');

      if (profileResult.rows.length === 0) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      const updatedUser = {
        ...profileResult.rows[0],
        email: updateData.email || req.user.email
      };

      res.json({ user: updatedUser });
    } else {
      // Only email was updated
      await client.query('COMMIT');
      const profileResult = await client.query(
        'SELECT id, first_name, last_name, patronymic, phone_number, date_of_birth, avatar_url, role, created_at, updated_at FROM profiles WHERE id = $1',
        [userId]
      );

      const updatedUser = {
        ...profileResult.rows[0],
        email: updateData.email
      };

      res.json({ user: updatedUser });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Change password
router.post('/change-password', authenticateSession, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    // Get user's current password hash
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: currentPasswordHash } = userResult.rows[0];
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
