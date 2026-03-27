import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { authenticateSession } from '../middleware/auth.js';
import { getIo, getAuthUsers } from '../socket/socketController.js';
import { getMongoCollections } from '../mongo.js';

const router = express.Router();

function buildDirectChatId(userA, userB) {
  return `dm-${[userA, userB].sort().join('-')}`;
}

// ─── Search users by first_name / last_name ─────────────────────────────────
router.get('/search', authenticateSession, async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.user.profile.id;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  try {
    const result = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, p.avatar_url, p.role,
              f.status AS friendship_status,
              f.id AS friendship_id,
              f.user_id AS friendship_initiator
       FROM profiles p
       LEFT JOIN friendships f
         ON ((f.user_id = $2 AND f.friend_id = p.id) OR (f.friend_id = $2 AND f.user_id = p.id))
       WHERE p.id != $2
         AND (
           LOWER(p.first_name || ' ' || p.last_name) LIKE LOWER($1)
           OR LOWER(p.last_name || ' ' || p.first_name) LIKE LOWER($1)
         )
       ORDER BY p.first_name, p.last_name
       LIMIT 20`,
      [`%${q.trim()}%`, currentUserId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[FRIENDS] Search error:', error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── Get friend list (accepted) ──────────────────────────────────────────────
router.get('/', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;

  try {
    const result = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, p.avatar_url, p.role, f.created_at AS friends_since
       FROM friendships f
       JOIN profiles p ON (
         CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END = p.id
       )
       WHERE (f.user_id = $1 OR f.friend_id = $1)
         AND f.status = 'accepted'
       ORDER BY p.first_name, p.last_name`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[FRIENDS] List error:', error.message);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// ─── Get pending friend requests (incoming) ──────────────────────────────────
router.get('/pending', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;

  try {
    const result = await pool.query(
      `SELECT f.id AS friendship_id, p.id, p.first_name, p.last_name, p.avatar_url, f.created_at
       FROM friendships f
       JOIN profiles p ON f.user_id = p.id
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[FRIENDS] Pending error:', error.message);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// ─── Send friend request ─────────────────────────────────────────────────────
router.post('/request', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { friendId } = req.body;

  if (!friendId) {
    return res.status(400).json({ error: 'friendId is required' });
  }
  if (friendId === userId) {
    return res.status(400).json({ error: 'Cannot add yourself as a friend' });
  }

  try {
    const existing = await pool.query(
      `SELECT id, status FROM friendships
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    if (existing.rows.length > 0) {
      const f = existing.rows[0];
      if (f.status === 'accepted') {
        return res.status(409).json({ error: 'Already friends' });
      }
      if (f.status === 'pending') {
        return res.status(409).json({ error: 'Friend request already pending' });
      }
    }

    const result = await pool.query(
      `INSERT INTO friendships (user_id, friend_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'pending', created_at = NOW()
       RETURNING id`,
      [userId, friendId]
    );

    // Real-time: notify the target user that they have a new friend request
    try {
      const io = getIo();
      const authUsers = getAuthUsers();
      const targetSocketId = authUsers.get(friendId);
      if (io && targetSocketId) {
        // Fetch sender profile to include in the notification
        const senderProfile = await pool.query(
          'SELECT id, first_name, last_name, avatar_url FROM profiles WHERE id = $1',
          [userId]
        );
        const sender = senderProfile.rows[0] || {};
        io.to(targetSocketId).emit('friend:request', {
          friendship_id: result.rows[0].id,
          id: sender.id,
          first_name: sender.first_name,
          last_name: sender.last_name,
          avatar_url: sender.avatar_url,
          created_at: new Date().toISOString(),
        });
        io.to(targetSocketId).emit('notification', {
          type: 'friend_request',
          title: 'Новая заявка в друзья',
          body: `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Новый пользователь',
          created_at: new Date().toISOString(),
        });
      }
    } catch (notifyErr) {
      console.error('[FRIENDS] Socket notify error:', notifyErr.message);
    }

    res.status(201).json({ friendshipId: result.rows[0].id, message: 'Friend request sent' });
  } catch (error) {
    console.error('[FRIENDS] Request error:', error.message);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// ─── Accept friend request ───────────────────────────────────────────────────
router.post('/accept/:friendshipId', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { friendshipId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE friendships SET status = 'accepted'
       WHERE id = $1 AND friend_id = $2 AND status = 'pending'
       RETURNING *`,
      [friendshipId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    const friendship = result.rows[0];
    const initiatorId = friendship.user_id; // the one who sent the original request

    // Real-time: notify both users that the friendship is now accepted
    try {
      const io = getIo();
      const authUsers = getAuthUsers();
      if (io) {
        // Fetch acceptor profile
        const acceptorProfile = await pool.query(
          'SELECT id, first_name, last_name, avatar_url, role FROM profiles WHERE id = $1',
          [userId]
        );
        const acceptor = acceptorProfile.rows[0] || {};

        // Fetch initiator profile
        const initiatorProfile = await pool.query(
          'SELECT id, first_name, last_name, avatar_url, role FROM profiles WHERE id = $1',
          [initiatorId]
        );
        const initiator = initiatorProfile.rows[0] || {};

        // Notify the original sender — their request was accepted
        const initiatorSocketId = authUsers.get(initiatorId);
        if (initiatorSocketId) {
          io.to(initiatorSocketId).emit('friend:accepted', { friend: acceptor });
          io.to(initiatorSocketId).emit('notification', {
            type: 'friend_accepted',
            title: 'Заявка в друзья принята',
            body: `${acceptor.first_name || ''} ${acceptor.last_name || ''}`.trim() || 'Пользователь принял вашу заявку',
            created_at: new Date().toISOString(),
          });
        }

        // Notify the acceptor — their own friends list needs refreshing too
        const acceptorSocketId = authUsers.get(userId);
        if (acceptorSocketId) {
          io.to(acceptorSocketId).emit('friend:accepted', { friend: initiator });
          io.to(acceptorSocketId).emit('notification', {
            type: 'friend_accepted',
            title: 'Новый друг',
            body: `${initiator.first_name || ''} ${initiator.last_name || ''}`.trim() || 'Новый друг добавлен',
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (notifyErr) {
      console.error('[FRIENDS] Socket accepted notify error:', notifyErr.message);
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('[FRIENDS] Accept error:', error.message);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// ─── Reject friend request ──────────────────────────────────────────────────
router.post('/reject/:friendshipId', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { friendshipId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM friendships WHERE id = $1 AND friend_id = $2 AND status = 'pending' RETURNING *`,
      [friendshipId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('[FRIENDS] Reject error:', error.message);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// ─── Generate / get invite link ──────────────────────────────────────────────
router.get('/invite-link', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;

  try {
    const existing = await pool.query(
      `SELECT token FROM friend_invite_links
       WHERE user_id = $1 AND is_used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.json({ token: existing.rows[0].token });
    }

    const token = crypto.randomBytes(16).toString('hex');
    await pool.query(
      `INSERT INTO friend_invite_links (user_id, token) VALUES ($1, $2)`,
      [userId, token]
    );

    res.json({ token });
  } catch (error) {
    console.error('[FRIENDS] Invite link error:', error.message);
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
});

// ─── Accept invite link ──────────────────────────────────────────────────────
router.post('/invite/:token', authenticateSession, async (req, res) => {
  const currentUserId = req.user.profile.id;
  const { token } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const linkResult = await client.query(
      `SELECT user_id FROM friend_invite_links
       WHERE token = $1 AND is_used = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (linkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invalid or expired invite link' });
    }

    const inviterUserId = linkResult.rows[0].user_id;

    if (inviterUserId === currentUserId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot use your own invite link' });
    }

    const existing = await client.query(
      `SELECT id, status FROM friendships
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [inviterUserId, currentUserId]
    );

    if (existing.rows.length > 0 && existing.rows[0].status === 'accepted') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Already friends' });
    }

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE friendships SET status = 'accepted' WHERE id = $1`,
        [existing.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'accepted')`,
        [inviterUserId, currentUserId]
      );
    }

    await client.query(
      `UPDATE friend_invite_links SET is_used = TRUE WHERE token = $1`,
      [token]
    );

    await client.query('COMMIT');
    res.json({ message: 'Friendship confirmed', friendId: inviterUserId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[FRIENDS] Invite accept error:', error.message);
    res.status(500).json({ error: 'Failed to accept invite' });
  } finally {
    client.release();
  }
});

// ─── Get friendship status with a specific user ───────────────────────────────
router.get('/status/:userId', authenticateSession, async (req, res) => {
  const currentUserId = req.user.profile.id;
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (userId === currentUserId) {
    return res.json({
      status: 'self',
      direction: null,
      friendshipId: null,
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, friend_id, status
       FROM friendships
       WHERE (user_id = $1 AND friend_id = $2)
          OR (user_id = $2 AND friend_id = $1)
       LIMIT 1`,
      [currentUserId, userId],
    );

    if (result.rows.length === 0) {
      return res.json({
        status: 'none',
        direction: null,
        friendshipId: null,
      });
    }

    const friendship = result.rows[0];

    if (friendship.status === 'accepted') {
      return res.json({
        status: 'accepted',
        direction: null,
        friendshipId: friendship.id,
      });
    }

    const direction =
      friendship.user_id === currentUserId ? 'outgoing' : 'incoming';

    return res.json({
      status: 'pending',
      direction,
      friendshipId: friendship.id,
    });
  } catch (error) {
    console.error('[FRIENDS] Status error:', error.message);
    res.status(500).json({ error: 'Failed to fetch friendship status' });
  }
});

// ─── Remove friend ───────────────────────────────────────────────────────────
router.delete('/:friendId', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { friendId } = req.params;

  try {
    await pool.query(
      `DELETE FROM friendships
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
         AND status = 'accepted'`,
      [userId, friendId]
    );

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('[FRIENDS] Remove error:', error.message);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// ─── Get message history with a friend ───────────────────────────────────────
router.get('/messages/:friendId', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;
  const { friendId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const { chats } = await getMongoCollections();
    const chatId = buildDirectChatId(userId, friendId);
    const docs = await chats.find({ chat_id: chatId })
      .sort({ sended_time: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const messages = docs.map((doc) => ({
      id: String(doc._id),
      sender_id: doc.id_user,
      receiver_id: doc.receiver_id,
      text: doc.message || '',
      created_at: new Date(doc.sended_time || Date.now()).toISOString(),
      is_read: Boolean(doc.is_read),
      media_url: doc.media_id || null,
      media_type: doc.media_type || null,
      reply_to_id: doc.reply_to_id ?? null,
      reply_to_text: doc.reply_to_text ?? null,
      reply_to_sender: doc.reply_to_sender ?? null,
    }));

    // Mark unread messages as read
    await chats.updateMany(
      { chat_id: chatId, id_user: friendId, receiver_id: userId, is_read: false },
      { $set: { is_read: true } },
    );

    res.json(messages);
  } catch (error) {
    console.error('[FRIENDS] Messages error:', error.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── Get recent chats (friends with latest message) ──────────────────────────
router.get('/recent-chats', authenticateSession, async (req, res) => {
  const userId = req.user.profile.id;

  try {
    const friendsResult = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, p.avatar_url
       FROM friendships f
       JOIN profiles p ON (
         CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END = p.id
       )
       WHERE (f.user_id = $1 OR f.friend_id = $1)
         AND f.status = 'accepted'`,
      [userId],
    );

    const { chats } = await getMongoCollections();
    const rows = await Promise.all(friendsResult.rows.map(async (friend) => {
      const chatId = buildDirectChatId(userId, friend.id);
      const [lastDoc, unreadCount] = await Promise.all([
        chats.find({ chat_id: chatId }).sort({ sended_time: -1 }).limit(1).next(),
        chats.countDocuments({ chat_id: chatId, receiver_id: userId, id_user: friend.id, is_read: false }),
      ]);

      if (!lastDoc) return null;
      return {
        friend_id: friend.id,
        first_name: friend.first_name,
        last_name: friend.last_name,
        avatar_url: friend.avatar_url,
        last_message: lastDoc.message || (lastDoc.media_id ? 'Медиа' : ''),
        last_message_at: new Date(lastDoc.sended_time || Date.now()).toISOString(),
        last_sender_id: lastDoc.id_user,
        unread_count: unreadCount,
      };
    }));

    const existingChats = rows.filter(Boolean);
    const sorted = existingChats.sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    res.json(sorted);
  } catch (error) {
    console.error('[FRIENDS] Recent chats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch recent chats' });
  }
});

export default router;
