import express from 'express';
import pool from '../db.js';
import { authenticateSession, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get current user's profile (requires authentication)
router.get('/profile', authenticateSession, (req, res) => {
  // req.user.profile is already populated by authenticateSession middleware
  res.status(200).json(req.user.profile);
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
    occupation
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

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields provided for update' });
  }

  updateValues.push(userId); // Add userId as the last parameter

  try {
    const query = `UPDATE profiles SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
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

// Get a single profile by ID (can be public or protected)
// Let's make it public for now, but only return basic info
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, patronymic, avatar_url, role, bio, date_of_birth, phone_number, address, occupation FROM profiles WHERE id = $1',
      [id]
    );
    const profile = result.rows[0];

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.status(200).json(profile);
  } catch (error) {
    console.error(`Error fetching profile ${id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
