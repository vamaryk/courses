import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticateSession } from '../middleware/auth.js';
import { getMongoCollections } from '../mongo.js';

const router = express.Router();

// ─── Create a group chat ─────────────────────────────────────────────────────
router.post('/', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { name, memberIds = [] } = req.body;

  if (!name || name.trim().length < 1) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inviteToken = crypto.randomBytes(12).toString('hex');

    const groupResult = await client.query(
      `INSERT INTO group_chats (name, creator_id, invite_token) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), userId, inviteToken]
    );
    const group = groupResult.rows[0];

    await client.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [group.id, userId]
    );

    const uniqueMembers = [...new Set(memberIds.filter((id) => id !== userId))];
    for (const memberId of uniqueMembers) {
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
        [group.id, memberId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...group,
      member_count: uniqueMembers.length + 1,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[GROUPS] Create error:', error.message);
    res.status(500).json({ error: 'Failed to create group' });
  } finally {
    client.release();
  }
});

// ─── Get user's groups ───────────────────────────────────────────────────────
router.get('/', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;

  try {
    const result = await pool.query(
      `SELECT gc.id, gc.name, gc.avatar_url, gc.invite_token, gc.created_at,
              gc.creator_id,
              COUNT(gm2.user_id)::int AS member_count
       FROM group_members gm
       JOIN group_chats gc ON gc.id = gm.group_id
       LEFT JOIN group_members gm2 ON gm2.group_id = gc.id
       WHERE gm.user_id = $1
       GROUP BY gc.id
       ORDER BY gc.created_at DESC`,
      [userId]
    );

    const { groupchats } = await getMongoCollections();
    const withLastMessage = await Promise.all(result.rows.map(async (group) => {
      const chatId = `group-${group.id}`;
      const lastDoc = await groupchats.find({ chat_id: chatId }).sort({ sended_time: -1 }).limit(1).next();
      return {
        ...group,
        last_message: lastDoc ? (lastDoc.message || (lastDoc.media_id ? 'Медиа' : '')) : null,
        last_message_at: lastDoc ? new Date(lastDoc.sended_time || Date.now()).toISOString() : null,
      };
    }));

    withLastMessage.sort((a, b) => {
      if (!a.last_message_at && !b.last_message_at) return 0;
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    res.json(withLastMessage);
  } catch (error) {
    console.error('[GROUPS] List error:', error.message);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// ─── Get group details + members ─────────────────────────────────────────────
router.get('/:groupId', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { groupId } = req.params;

  try {
    const memberCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const groupResult = await pool.query(
      `SELECT gc.*, COUNT(gm.user_id)::int AS member_count
       FROM group_chats gc
       LEFT JOIN group_members gm ON gm.group_id = gc.id
       WHERE gc.id = $1
       GROUP BY gc.id`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const membersResult = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, p.avatar_url, gm.role, gm.joined_at
       FROM group_members gm
       JOIN profiles p ON p.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.role = 'admin' DESC, p.first_name`,
      [groupId]
    );

    res.json({ ...groupResult.rows[0], members: membersResult.rows });
  } catch (error) {
    console.error('[GROUPS] Details error:', error.message);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// ─── Get group messages ──────────────────────────────────────────────────────
router.get('/:groupId/messages', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { groupId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const memberCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const { groupchats } = await getMongoCollections();
    const chatId = `group-${groupId}`;
    const docs = await groupchats.find({ chat_id: chatId })
      .sort({ sended_time: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const senderIds = [...new Set(docs.map((doc) => doc.id_user))];
    const profileRows = senderIds.length > 0
      ? await pool.query(
        `SELECT id, first_name, last_name, avatar_url FROM profiles WHERE id = ANY($1::uuid[])`,
        [senderIds],
      )
      : { rows: [] };
    const profileMap = new Map(profileRows.rows.map((row) => [row.id, row]));

    const messages = docs.map((doc) => {
      const sender = profileMap.get(doc.id_user) || {};
      return {
        id: String(doc._id),
        group_id: Number(groupId),
        sender_id: doc.id_user,
        text: doc.message || '',
        created_at: new Date(doc.sended_time || Date.now()).toISOString(),
        media_url: doc.media_id || null,
        media_type: doc.media_type || null,
        sender_first_name: sender.first_name || '',
        sender_last_name: sender.last_name || '',
        sender_avatar: sender.avatar_url || null,
      };
    });

    res.json(messages);
  } catch (error) {
    console.error('[GROUPS] Messages error:', error.message);
    res.status(500).json({ error: 'Failed to fetch group messages' });
  }
});

// ─── Join group via invite token ─────────────────────────────────────────────
router.post('/join/:token', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { token } = req.params;

  try {
    const groupResult = await pool.query(
      `SELECT id, name FROM group_chats WHERE invite_token = $1`,
      [token]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }

    const group = groupResult.rows[0];

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [group.id, userId]
    );

    res.json({ message: 'Joined group', groupId: group.id, groupName: group.name });
  } catch (error) {
    console.error('[GROUPS] Join error:', error.message);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// ─── Add members to group (admin or creator only) ────────────────────────────
router.post('/:groupId/members', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { groupId } = req.params;
  const { memberIds = [] } = req.body;

  try {
    const adminCheck = await pool.query(
      `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    for (const memberId of memberIds) {
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
        [groupId, memberId]
      );
    }

    res.json({ message: 'Members added' });
  } catch (error) {
    console.error('[GROUPS] Add members error:', error.message);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// ─── Leave group ─────────────────────────────────────────────────────────────
router.delete('/:groupId/leave', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { groupId } = req.params;

  try {
    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    res.json({ message: 'Left group' });
  } catch (error) {
    console.error('[GROUPS] Leave error:', error.message);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

export default router;
