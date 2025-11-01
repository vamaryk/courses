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
      `INSERT INTO profiles (id, first_name, last_name, patronymic, date_of_birth, phone_number, avatar_url, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, first_name, last_name, patronymic, date_of_birth, phone_number, avatar_url, role]
    );
    logger('info', 'Profile inserted for signup.');

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
      // Return user profile data
      const userProfile = {
        id: req.user.profile.id,
        email: req.user.email || req.user.profile.email,
        first_name: req.user.profile.first_name,
        last_name: req.user.profile.last_name,
        patronymic: req.user.profile.patronymic,
        phone_number: req.user.profile.phone_number,
        date_of_birth: req.user.profile.date_of_birth,
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

// Update user profile
router.put('/profile', authenticateSession, async (req, res) => {
  if (!req.user || !req.user.profile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user.profile.id;
  const { first_name, last_name, patronymic, email, phone_number, date_of_birth, avatar_url } = req.body;

  // Basic validation
  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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

    // Update email in users table
    await client.query(
      'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
      [email, userId]
    );

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
       RETURNING id, first_name, last_name, patronymic, phone_number, date_of_birth, avatar_url, role`,
      [first_name, last_name, patronymic, phone_number, date_of_birth, avatar_url, userId]
    );

    await client.query('COMMIT');

    if (profileResult.rows.length === 0) {
      // This case should ideally not be reached if authenticateSession works correctly
      return res.status(404).json({ error: 'User profile not found' });
    }

    const updatedUser = {
      ...profileResult.rows[0],
      email: email // Add the updated email to the response
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
