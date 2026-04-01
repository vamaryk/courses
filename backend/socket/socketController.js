/**
 * Socket.IO Controller — Virtual Class
 *
 * Manages:
 *  - User registration (unique short ID per connection)
 *  - Private chat rooms (created from sorted user IDs)
 *  - Text messaging (room-based + direct messages)
 *  - WebRTC signaling (offer / answer / ICE candidates)
 *  - Authenticated direct messaging (persisted to DB)
 */

import cookie from 'cookie';
import pool from '../db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ObjectId } from 'mongodb';
import { getMongoCollections } from '../mongo.js';

/** userId → socketId (for random room-based IDs) */
const users = new Map();

/** socketId → userId */
const socketToUser = new Map();

/** authenticated DB userId (UUID) → socketId */
const authUsers = new Map();

/** socketId → DB userId (UUID) */
const socketToAuthUser = new Map();

/** messageId → metadata for ephemeral room chat edits/deletes */
const roomMessageMeta = new Map();
const mediaUploadSessions = new Map();

/** Shared io instance (set once setupSocketController is called) */
let _io = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatsDataRoot = path.join(__dirname, '..', 'data', 'chats');

/** Returns the Socket.IO server instance — available to HTTP routes */
export function getIo() { return _io; }

/** Returns a snapshot of the DB userId → socketId map — available to HTTP routes */
export function getAuthUsers() { return authUsers; }

/** Generate a short 6-character alphanumeric ID */
function generateUserId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function ensureDirectoryExists(directoryPath) {
  try {
    await fs.access(directoryPath);
  } catch {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

function sanitizeFileName(fileName) {
  return String(fileName || 'media-file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/')) return 'video';
  return null;
}

async function saveChatMediaFile({ chatId, fileName, base64Data, binaryData }) {
  await ensureDirectoryExists(chatsDataRoot);
  const chatDirectoryPath = path.join(chatsDataRoot, String(chatId));
  await ensureDirectoryExists(chatDirectoryPath);

  const safeFileName = sanitizeFileName(fileName);
  const generatedName = `${Date.now()}-${safeFileName}`;
  const absoluteFilePath = path.join(chatDirectoryPath, generatedName);
  let fileBuffer = null;
  if (binaryData instanceof Uint8Array) {
    fileBuffer = Buffer.from(binaryData);
  } else if (binaryData instanceof ArrayBuffer) {
    fileBuffer = Buffer.from(new Uint8Array(binaryData));
  } else if (Buffer.isBuffer(binaryData)) {
    fileBuffer = binaryData;
  } else if (base64Data) {
    fileBuffer = Buffer.from(base64Data, 'base64');
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Empty media payload');
  }

  await fs.writeFile(absoluteFilePath, fileBuffer);
  return `/chat-media/${encodeURIComponent(String(chatId))}/${encodeURIComponent(generatedName)}`;
}

function buildDirectChatId(senderId, receiverId) {
  return `dm-${[senderId, receiverId].sort().join('-')}`;
}

function normalizeMongoMessage(doc) {
  return {
    id: String(doc._id),
    sender_id: doc.id_user,
    receiver_id: doc.receiver_id || null,
    text: doc.message || '',
    created_at: new Date(doc.sended_time || Date.now()).toISOString(),
    is_read: Boolean(doc.is_read),
    media_url: doc.media_id || null,
    media_type: doc.media_type || null,
    forward_from_name: doc.forward_from_name ?? null,
    forward_original_text: doc.forward_original_text ?? null,
    forward_media_url: doc.forward_media_url ?? null,
    forward_media_type: doc.forward_media_type ?? null,
  };
}

function buildRoomMediaMessage({ roomId, fromUserId, text, mediaUrl, mediaType }) {
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fromUserId,
    text: String(text || '').slice(0, 2000),
    timestamp: new Date().toISOString(),
    isRead: false,
    mediaUrl,
    mediaType,
  };
  roomMessageMeta.set(message.id, { roomId, fromUserId });
  return message;
}

async function buildDirectMediaMessage({ chats, senderId, receiverId, text, mediaUrl, mediaType }) {
  const chatId = buildDirectChatId(senderId, receiverId);
  const insertResult = await chats.insertOne({
    chat_id: chatId,
    id_user: senderId,
    receiver_id: receiverId,
    message: String(text || '').slice(0, 2000),
    sended_time: new Date(),
    media_id: mediaUrl,
    media_type: mediaType,
    is_read: false,
    reply_to_id: null,
    reply_to_text: null,
    reply_to_sender: null,
    forward_from_name: null,
    forward_original_text: null,
    forward_media_url: null,
    forward_media_type: null,
  });
  const insertedDoc = await chats.findOne({ _id: insertResult.insertedId });
  if (!insertedDoc) return null;
  return {
    ...normalizeMongoMessage(insertedDoc),
    reply_to_id: insertedDoc.reply_to_id ?? null,
    reply_to_text: insertedDoc.reply_to_text ?? null,
    reply_to_sender: insertedDoc.reply_to_sender ?? null,
  };
}

async function buildGroupMediaMessage({ pool, groupchats, groupId, senderId, text, mediaUrl, mediaType }) {
  const insertResult = await groupchats.insertOne({
    chat_id: `group-${groupId}`,
    group_id: Number(groupId),
    id_user: senderId,
    message: String(text || '').slice(0, 2000),
    sended_time: new Date(),
    media_id: mediaUrl,
    media_type: mediaType,
    reply_to_id: null,
    reply_to_text: null,
    reply_to_sender: null,
    forward_from_name: null,
    forward_original_text: null,
    forward_media_url: null,
    forward_media_type: null,
  });
  const insertedDoc = await groupchats.findOne({ _id: insertResult.insertedId });
  if (!insertedDoc) return null;
  const senderProfile = await pool.query(
    'SELECT first_name, last_name, avatar_url FROM profiles WHERE id = $1',
    [senderId]
  );
  const sender = senderProfile.rows[0] || {};
  return {
    id: String(insertedDoc._id),
    group_id: insertedDoc.group_id,
    sender_id: insertedDoc.id_user,
    text: insertedDoc.message || '',
    created_at: new Date(insertedDoc.sended_time || Date.now()).toISOString(),
    media_url: insertedDoc.media_id || null,
    media_type: insertedDoc.media_type || null,
    sender_first_name: sender.first_name,
    sender_last_name: sender.last_name,
    sender_avatar: sender.avatar_url,
    reply_to_id: null,
    reply_to_text: null,
    reply_to_sender: null,
    forward_from_name: null,
    forward_original_text: null,
    forward_media_url: null,
    forward_media_type: null,
  };
}

function emitNotificationToUser(userId, payload) {
  if (!_io) return;
  const targetSocketId = authUsers.get(userId);
  if (!targetSocketId) return;
  _io.to(targetSocketId).emit('notification', payload);
}

/**
 * Try to authenticate a socket connection via session cookie.
 * Returns the DB user profile or null.
 */
async function authenticateSocket(socket) {
  try {
    const rawCookies = socket.handshake.headers.cookie;
    if (!rawCookies) return null;

    const cookies = cookie.parse(rawCookies);
    const sessionId = cookies.sessionId;
    if (!sessionId) return null;

    const sessionResult = await pool.query(
      'SELECT user_id, expires_at FROM sessions WHERE session_id = $1',
      [sessionId]
    );
    const session = sessionResult.rows[0];
    if (!session || new Date() > new Date(session.expires_at)) return null;

    const userResult = await pool.query(
      'SELECT id, first_name, last_name, avatar_url FROM profiles WHERE id = $1',
      [session.user_id]
    );

    return userResult.rows[0] || null;
  } catch (err) {
    console.error('[SOCKET AUTH] Error:', err.message);
    return null;
  }
}

/**
 * Attach all Socket.IO event handlers to the server instance.
 * @param {import('socket.io').Server} io
 */
export function setupSocketController(io) {
  _io = io;
  io.on('connection', async (socket) => {
    const { chats, groupchats } = await getMongoCollections();
    const userId = generateUserId();
    users.set(userId, socket.id);
    socketToUser.set(socket.id, userId);

    console.log(`✅ [SOCKET] Connected  — userId: ${userId} | socket: ${socket.id}`);

    // Try to authenticate for DM functionality
    const authProfile = await authenticateSocket(socket);
    if (authProfile) {
      authUsers.set(authProfile.id, socket.id);
      socketToAuthUser.set(socket.id, authProfile.id);
      socket.emit('dm:authenticated', {
        dbUserId: authProfile.id,
        firstName: authProfile.first_name,
        lastName: authProfile.last_name,
      });
      console.log(`🔐 [SOCKET] Authenticated — dbUser: ${authProfile.id} (${authProfile.first_name})`);
    }

    socket.emit('user:id', { userId });

    // ─── Chat: Initiate a private room ─────────────────────────────────────
    socket.on('chat:join', ({ targetUserId }) => {
      const targetSocketId = users.get(targetUserId);

      if (!targetSocketId) {
        socket.emit('chat:error', { message: `Пользователь ${targetUserId} не найден или не в сети` });
        return;
      }

      if (targetUserId === userId) {
        socket.emit('chat:error', { message: 'Нельзя подключиться к самому себе' });
        return;
      }

      const roomId = [userId, targetUserId].sort().join('-');

      socket.join(roomId);
      socket.emit('chat:joined', { roomId, targetUserId });

      io.to(targetSocketId).emit('chat:invited', { fromUserId: userId, roomId });

      console.log(`💬 [SOCKET] Room created: ${roomId} (by ${userId})`);
    });

    // ─── Chat: Accept an invitation ────────────────────────────────────────
    socket.on('chat:accept', ({ roomId }) => {
      socket.join(roomId);
      io.to(roomId).emit('chat:ready', { roomId });
      console.log(`💬 [SOCKET] Room accepted: ${roomId} (by ${userId})`);
    });

    socket.on('chat:media-upload:start', async ({ uploadId, target, fileName, mimeType, caption, totalChunks, totalSize }, ack) => {
      if (!uploadId || !target || !fileName || !mimeType || !totalChunks || totalChunks < 1) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Некорректные параметры загрузки' });
        return;
      }

      const mediaType = normalizeMimeType(mimeType);
      if (!mediaType) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Неподдерживаемый тип файла' });
        return;
      }

      if (target.type === 'dm' || target.type === 'group') {
        const authId = socketToAuthUser.get(socket.id);
        if (!authId) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Требуется авторизация' });
          return;
        }
      }

      mediaUploadSessions.set(uploadId, {
        socketId: socket.id,
        userId,
        authUserId: socketToAuthUser.get(socket.id) || null,
        target,
        fileName,
        mimeType,
        mediaType,
        caption: String(caption || '').slice(0, 2000),
        totalChunks: Number(totalChunks),
        totalSize: Number(totalSize) || 0,
        chunks: new Array(Number(totalChunks)),
        receivedChunks: 0,
      });

      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('chat:media-upload:chunk', ({ uploadId, index, chunk }, ack) => {
      const session = mediaUploadSessions.get(uploadId);
      if (!session || session.socketId !== socket.id) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Сессия загрузки не найдена' });
        return;
      }
      if (typeof index !== 'number' || index < 0 || index >= session.totalChunks) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Некорректный индекс чанка' });
        return;
      }
      if (!(chunk instanceof Uint8Array) && !(chunk instanceof ArrayBuffer) && !Buffer.isBuffer(chunk)) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Некорректные данные чанка' });
        return;
      }

      const bufferChunk = Buffer.isBuffer(chunk)
        ? chunk
        : chunk instanceof Uint8Array
          ? Buffer.from(chunk)
          : Buffer.from(new Uint8Array(chunk));

      if (!session.chunks[index]) {
        session.receivedChunks += 1;
      }
      session.chunks[index] = bufferChunk;
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('chat:media-upload:finish', async ({ uploadId }, ack) => {
      const session = mediaUploadSessions.get(uploadId);
      if (!session || session.socketId !== socket.id) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Сессия загрузки не найдена' });
        return;
      }
      if (session.receivedChunks !== session.totalChunks || session.chunks.some((chunk) => !chunk)) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Файл загружен не полностью' });
        return;
      }

      try {
        const binaryData = Buffer.concat(session.chunks);
        const mediaUrl = await saveChatMediaFile({
          chatId:
            session.target.type === 'room'
              ? session.target.roomId
              : session.target.type === 'dm'
                ? buildDirectChatId(session.authUserId, session.target.receiverId)
                : `group-${session.target.groupId}`,
          fileName: session.fileName,
          binaryData,
        });

        let message = null;

        if (session.target.type === 'room') {
          message = buildRoomMediaMessage({
            roomId: session.target.roomId,
            fromUserId: session.userId,
            text: session.caption,
            mediaUrl,
            mediaType: session.mediaType,
          });
          io.to(session.target.roomId).emit('chat:message', message);
        }

        if (session.target.type === 'dm') {
          message = await buildDirectMediaMessage({
            chats,
            senderId: session.authUserId,
            receiverId: session.target.receiverId,
            text: session.caption,
            mediaUrl,
            mediaType: session.mediaType,
          });
          if (message) {
            socket.emit('dm:message', message);
            const receiverSocketId = authUsers.get(session.target.receiverId);
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('dm:message', message);
            }
          }
        }

        if (session.target.type === 'group') {
          const memberCheck = await pool.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
            [session.target.groupId, session.authUserId]
          );
          if (memberCheck.rows.length === 0) {
            throw new Error('Вы не состоите в этой группе');
          }
          message = await buildGroupMediaMessage({
            pool,
            groupchats,
            groupId: session.target.groupId,
            senderId: session.authUserId,
            text: session.caption,
            mediaUrl,
            mediaType: session.mediaType,
          });
          if (message) {
            io.to(`group:${session.target.groupId}`).emit('group:message', message);
          }
        }

        mediaUploadSessions.delete(uploadId);
        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (error) {
        mediaUploadSessions.delete(uploadId);
        if (typeof ack === 'function') {
          ack({ ok: false, error: error instanceof Error ? error.message : 'Не удалось завершить загрузку медиа' });
        }
      }
    });

    // ─── Chat: Send a message ───────────────────────────────────────────────
    socket.on('chat:message', ({ roomId, text, replyToId, replyToText, replyToSender, forwardFromName, forwardOriginalText, forwardMediaUrl, forwardMediaType }) => {
      if (!roomId) return;

      const trimmed = String(text || '').trim();
      const fname = forwardFromName ? String(forwardFromName).slice(0, 100) : null;
      const ftext = forwardOriginalText ? String(forwardOriginalText).slice(0, 2000) : '';
      const fmediaUrl = forwardMediaUrl ? String(forwardMediaUrl).slice(0, 500) : null;
      const fmediaType = forwardMediaType === 'image' || forwardMediaType === 'video' ? forwardMediaType : null;
      const hasForward = Boolean(fname && (ftext || (fmediaUrl && fmediaType)));
      if (!trimmed && !hasForward) return;

      const message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromUserId: userId,
        text: trimmed ? String(text).slice(0, 2000) : '',
        timestamp: new Date().toISOString(),
        isRead: false,
        mediaUrl: null,
        mediaType: null,
        reply_to_id: replyToId ?? null,
        reply_to_text: replyToText ? String(replyToText).slice(0, 300) : null,
        reply_to_sender: replyToSender ? String(replyToSender).slice(0, 100) : null,
        forward_from_name: hasForward ? fname : null,
        forward_original_text: hasForward ? (ftext || null) : null,
        forward_media_url: hasForward ? fmediaUrl : null,
        forward_media_type: hasForward ? fmediaType : null,
      };

      roomMessageMeta.set(message.id, { roomId, fromUserId: userId });

      io.to(roomId).emit('chat:message', message);
      console.log(`💬 [SOCKET] [${roomId}] ${userId}: ${String(text || '').slice(0, 60)}`);
    });

    socket.on('chat:media-upload', async ({ roomId, fileName, mimeType, base64Data, binaryData, caption }, callback) => {
      if (!roomId || (!base64Data && !binaryData)) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: 'Некорректные данные медиафайла' });
        }
        return;
      }

      const mediaType = normalizeMimeType(mimeType);
      if (!mediaType) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: 'Неподдерживаемый тип файла' });
        }
        return;
      }

      try {
        const mediaUrl = await saveChatMediaFile({ chatId: roomId, fileName, base64Data, binaryData });
        const message = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fromUserId: userId,
          text: String(caption || '').slice(0, 2000),
          timestamp: new Date().toISOString(),
          isRead: false,
          mediaUrl,
          mediaType,
        };

        roomMessageMeta.set(message.id, { roomId, fromUserId: userId });

        io.to(roomId).emit('chat:message', message);
        if (typeof callback === 'function') {
          callback({ ok: true, message });
        }
      } catch (err) {
        console.error('[CHAT MEDIA] Save error:', err.message);
        socket.emit('chat:error', { message: 'Не удалось сохранить медиафайл' });
        if (typeof callback === 'function') {
          callback({ ok: false, error: 'Не удалось сохранить медиафайл' });
        }
      }
    });

    socket.on('chat:read', ({ roomId, messageId }) => {
      if (!roomId || !messageId) return;
      io.to(roomId).emit('chat:read-update', { messageId, isRead: true });
    });

    socket.on('chat:edit', ({ roomId, messageId, text }) => {
      if (!roomId || !messageId || !text) return;
      const meta = roomMessageMeta.get(messageId);
      if (!meta || meta.roomId !== roomId || meta.fromUserId !== userId) return;

      io.to(roomId).emit('chat:updated', {
        messageId,
        text: String(text).slice(0, 2000),
        editedAt: new Date().toISOString(),
      });
    });

    socket.on('chat:delete', ({ roomId, messageId }, ack) => {
      if (!roomId || !messageId) return;
      const meta = roomMessageMeta.get(messageId);
      if (!meta || meta.roomId !== roomId || meta.fromUserId !== userId) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }

      roomMessageMeta.delete(messageId);
      io.to(roomId).emit('chat:deleted', { messageId });
      if (typeof ack === 'function') ack({ ok: true });
    });

    // ─── DM: Send a direct message (persisted) ─────────────────────────────
    socket.on('dm:send', async ({ receiverId, text, fileName, mimeType, base64Data, binaryData, caption, replyToId, replyToText, replyToSender, forwardFromName, forwardOriginalText, forwardMediaUrl, forwardMediaType }, ack) => {
      const senderId = socketToAuthUser.get(socket.id);
      if (!senderId) {
        socket.emit('dm:error', { message: 'Требуется авторизация для отправки личных сообщений' });
        if (typeof ack === 'function') ack({ ok: false, error: 'Требуется авторизация для отправки личных сообщений' });
        return;
      }
      if (!receiverId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Не выбран получатель' });
        return;
      }

      const trimmedText = String(text || '').trim();
      const mediaType = normalizeMimeType(mimeType);
      const hasMedia = Boolean(mediaType && (base64Data || binaryData));
      const messageText = hasMedia ? String(caption || '').slice(0, 2000) : trimmedText.slice(0, 2000);

      const fname = forwardFromName ? String(forwardFromName).slice(0, 100) : null;
      const ftext = forwardOriginalText ? String(forwardOriginalText).slice(0, 2000) : '';
      const fmediaUrl = forwardMediaUrl ? String(forwardMediaUrl).slice(0, 500) : null;
      const fmediaType = forwardMediaType === 'image' || forwardMediaType === 'video' ? forwardMediaType : null;
      const hasForward = Boolean(fname && (ftext || (fmediaUrl && fmediaType)));

      if (!hasMedia && !messageText && !hasForward) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Пустое сообщение' });
        return;
      }

      try {
        let mediaUrl = null;
        if (hasMedia) {
          const chatId = buildDirectChatId(senderId, receiverId);
          mediaUrl = await saveChatMediaFile({ chatId, fileName, base64Data, binaryData });
        }

        const chatId = buildDirectChatId(senderId, receiverId);
        const insertResult = await chats.insertOne({
          chat_id: chatId,
          id_user: senderId,
          receiver_id: receiverId,
          message: messageText,
          sended_time: new Date(),
          media_id: mediaUrl,
          media_type: mediaType,
          is_read: false,
          reply_to_id: replyToId ?? null,
          reply_to_text: replyToText ? String(replyToText).slice(0, 300) : null,
          reply_to_sender: replyToSender ? String(replyToSender).slice(0, 100) : null,
          forward_from_name: hasForward ? fname : null,
          forward_original_text: hasForward ? (ftext || null) : null,
          forward_media_url: hasForward ? fmediaUrl : null,
          forward_media_type: hasForward ? fmediaType : null,
        });
        const insertedDoc = await chats.findOne({ _id: insertResult.insertedId });
        if (!insertedDoc) return;
        const msg = {
          ...normalizeMongoMessage(insertedDoc),
          reply_to_id: insertedDoc.reply_to_id ?? null,
          reply_to_text: insertedDoc.reply_to_text ?? null,
          reply_to_sender: insertedDoc.reply_to_sender ?? null,
        };

        // Send to both sender and receiver if they are connected
        socket.emit('dm:message', msg);
        // Notify sender as well (for notification center history)
        socket.emit('notification', {
          type: 'direct_message',
          title: 'Сообщение отправлено',
          body: (messageText || 'Вы отправили личное сообщение').slice(0, 80),
          created_at: new Date().toISOString(),
        });

        const receiverSocketId = authUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('dm:message', msg);
          io.to(receiverSocketId).emit('notification', {
            type: 'direct_message',
            title: 'Новое сообщение',
            body: (messageText || 'Новое личное сообщение').slice(0, 80),
            created_at: new Date().toISOString(),
          });
        }

        console.log(`📩 [DM] ${senderId} → ${receiverId}: ${(messageText || '[media]').slice(0, 60)}`);
        if (typeof ack === 'function') ack({ ok: true, message: msg });
      } catch (err) {
        console.error('[DM] Save error:', err.message);
        socket.emit('dm:error', { message: 'Не удалось отправить сообщение' });
        if (typeof ack === 'function') ack({ ok: false, error: 'Не удалось отправить сообщение' });
      }
    });

    // ─── DM: Mark messages as read ──────────────────────────────────────────
    socket.on('dm:read', async ({ senderId }) => {
      const currentUserId = socketToAuthUser.get(socket.id);
      if (!currentUserId || !senderId) return;

      try {
        const chatId = buildDirectChatId(senderId, currentUserId);
        await chats.updateMany(
          {
            chat_id: chatId,
            id_user: senderId,
            receiver_id: currentUserId,
            is_read: false,
          },
          { $set: { is_read: true } },
        );

        const senderSocketId = authUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('dm:read', { readBy: currentUserId });
        }
      } catch (err) {
        console.error('[DM] Read error:', err.message);
      }
    });

    socket.on('dm:edit', async ({ messageId, text }) => {
      const currentUserId = socketToAuthUser.get(socket.id);
      if (!currentUserId || !messageId || !text) return;

      try {
        const objectId = new ObjectId(String(messageId));
        const updateResult = await chats.findOneAndUpdate(
          { _id: objectId, id_user: currentUserId },
          { $set: { message: String(text).slice(0, 2000) } },
          { returnDocument: 'after' },
        );
        const updatedDoc = updateResult || null;
        if (!updatedDoc) return;

        const updated = normalizeMongoMessage(updatedDoc);
        socket.emit('dm:updated', updated);
        const receiverSocketId = authUsers.get(updated.receiver_id || '');
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('dm:updated', updated);
        }
      } catch (err) {
        console.error('[DM] Edit error:', err.message);
      }
    });

    socket.on('dm:delete', async ({ messageId }, ack) => {
      const currentUserId = socketToAuthUser.get(socket.id);
      if (!currentUserId || !messageId) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }

      try {
        const objectId = new ObjectId(String(messageId));
        const deleted = await chats.findOneAndDelete({ _id: objectId, id_user: currentUserId });
        if (!deleted) {
          if (typeof ack === 'function') ack({ ok: false });
          return;
        }

        socket.emit('dm:deleted', { messageId: String(messageId) });
        const receiverSocketId = authUsers.get(deleted.receiver_id || '');
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('dm:deleted', { messageId: String(messageId) });
        }
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        console.error('[DM] Delete error:', err.message);
        if (typeof ack === 'function') ack({ ok: false });
      }
    });

    // ─── Group: Join socket room for group chat ──────────────────────────────
    socket.on('group:join', async ({ groupId }) => {
      const uid = socketToAuthUser.get(socket.id);
      if (!uid) return;

      try {
        const check = await pool.query(
          'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
          [groupId, uid]
        );
        if (check.rows.length === 0) return;

        const roomName = `group:${groupId}`;
        socket.join(roomName);
        socket.emit('group:joined', { groupId });
      } catch (err) {
        console.error('[GROUP SOCKET] Join error:', err.message);
      }
    });

    // ─── Group: Send a message ──────────────────────────────────────────────
    socket.on('group:send', async ({ groupId, text, fileName, mimeType, base64Data, binaryData, caption, replyToId, replyToText, replyToSender, forwardFromName, forwardOriginalText, forwardMediaUrl, forwardMediaType }, ack) => {
      const uid = socketToAuthUser.get(socket.id);
      if (!uid || !groupId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Нет доступа к групповому чату' });
        return;
      }

      const trimmedText = String(text || '').trim();
      const mediaType = normalizeMimeType(mimeType);
      const hasMedia = Boolean(mediaType && (base64Data || binaryData));
      const messageText = hasMedia ? String(caption || '').slice(0, 2000) : trimmedText.slice(0, 2000);

      const gfname = forwardFromName ? String(forwardFromName).slice(0, 100) : null;
      const gftext = forwardOriginalText ? String(forwardOriginalText).slice(0, 2000) : '';
      const gfmediaUrl = forwardMediaUrl ? String(forwardMediaUrl).slice(0, 500) : null;
      const gfmediaType = forwardMediaType === 'image' || forwardMediaType === 'video' ? forwardMediaType : null;
      const hasForward = Boolean(gfname && (gftext || (gfmediaUrl && gfmediaType)));

      if (!hasMedia && !messageText && !hasForward) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Пустое сообщение' });
        return;
      }

      try {
        const check = await pool.query(
          'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
          [groupId, uid]
        );
        if (check.rows.length === 0) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Вы не состоите в этой группе' });
          return;
        }

        let mediaUrl = null;
        if (hasMedia) {
          const chatId = `group-${groupId}`;
          mediaUrl = await saveChatMediaFile({ chatId, fileName, base64Data, binaryData });
        }

        const chatId = `group-${groupId}`;
        const insertResult = await groupchats.insertOne({
          chat_id: chatId,
          group_id: Number(groupId),
          id_user: uid,
          message: messageText,
          sended_time: new Date(),
          media_id: mediaUrl,
          media_type: mediaType,
          reply_to_id: replyToId ?? null,
          reply_to_text: replyToText ? String(replyToText).slice(0, 300) : null,
          reply_to_sender: replyToSender ? String(replyToSender).slice(0, 100) : null,
          forward_from_name: hasForward ? gfname : null,
          forward_original_text: hasForward ? (gftext || null) : null,
          forward_media_url: hasForward ? gfmediaUrl : null,
          forward_media_type: hasForward ? gfmediaType : null,
        });
        const insertedDoc = await groupchats.findOne({ _id: insertResult.insertedId });
        if (!insertedDoc) return;

        const senderProfile = await pool.query(
          'SELECT first_name, last_name, avatar_url FROM profiles WHERE id = $1',
          [uid]
        );
        const sender = senderProfile.rows[0] || {};

        const fullMsg = {
          id: String(insertedDoc._id),
          group_id: insertedDoc.group_id,
          sender_id: insertedDoc.id_user,
          text: insertedDoc.message || '',
          created_at: new Date(insertedDoc.sended_time || Date.now()).toISOString(),
          media_url: insertedDoc.media_id || null,
          media_type: insertedDoc.media_type || null,
          sender_first_name: sender.first_name,
          sender_last_name: sender.last_name,
          sender_avatar: sender.avatar_url,
          reply_to_id: insertedDoc.reply_to_id ?? null,
          reply_to_text: insertedDoc.reply_to_text ?? null,
          reply_to_sender: insertedDoc.reply_to_sender ?? null,
          forward_from_name: insertedDoc.forward_from_name ?? null,
          forward_original_text: insertedDoc.forward_original_text ?? null,
          forward_media_url: insertedDoc.forward_media_url ?? null,
          forward_media_type: insertedDoc.forward_media_type ?? null,
        };

        io.to(`group:${groupId}`).emit('group:message', fullMsg);
        console.log(`👥 [GROUP] ${uid} → group:${groupId}: ${(messageText || '[media]').slice(0, 60)}`);
        if (typeof ack === 'function') ack({ ok: true, message: fullMsg });
      } catch (err) {
        console.error('[GROUP SOCKET] Send error:', err.message);
        if (typeof ack === 'function') ack({ ok: false, error: 'Не удалось отправить сообщение' });
      }
    });

    socket.on('group:edit', async ({ messageId, text }) => {
      const uid = socketToAuthUser.get(socket.id);
      if (!uid || !messageId || !text) return;

      try {
        const objectId = new ObjectId(String(messageId));
        const updated = await groupchats.findOneAndUpdate(
          { _id: objectId, id_user: uid },
          { $set: { message: String(text).slice(0, 2000) } },
          { returnDocument: 'after' },
        );
        if (!updated) return;
        const senderProfile = await pool.query(
          'SELECT first_name, last_name, avatar_url FROM profiles WHERE id = $1',
          [uid],
        );
        const sender = senderProfile.rows[0] || {};
        io.to(`group:${updated.group_id}`).emit('group:updated', {
          id: String(updated._id),
          group_id: updated.group_id,
          sender_id: updated.id_user,
          text: updated.message || '',
          created_at: new Date(updated.sended_time || Date.now()).toISOString(),
          media_url: updated.media_id || null,
          media_type: updated.media_type || null,
          sender_first_name: sender.first_name,
          sender_last_name: sender.last_name,
          sender_avatar: sender.avatar_url,
          reply_to_id: updated.reply_to_id ?? null,
          reply_to_text: updated.reply_to_text ?? null,
          reply_to_sender: updated.reply_to_sender ?? null,
          forward_from_name: updated.forward_from_name ?? null,
          forward_original_text: updated.forward_original_text ?? null,
          forward_media_url: updated.forward_media_url ?? null,
          forward_media_type: updated.forward_media_type ?? null,
        });
      } catch (err) {
        console.error('[GROUP SOCKET] Edit error:', err.message);
      }
    });

    socket.on('group:delete', async ({ messageId }, ack) => {
      const uid = socketToAuthUser.get(socket.id);
      if (!uid || !messageId) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }

      try {
        const objectId = new ObjectId(String(messageId));
        const deleted = await groupchats.findOneAndDelete({ _id: objectId, id_user: uid });
        if (!deleted) {
          if (typeof ack === 'function') ack({ ok: false });
          return;
        }
        io.to(`group:${deleted.group_id}`).emit('group:deleted', {
          groupId: deleted.group_id,
          messageId: String(messageId),
        });
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        console.error('[GROUP SOCKET] Delete error:', err.message);
        if (typeof ack === 'function') ack({ ok: false });
      }
    });

    // ─── DM: Typing indicator ───────────────────────────────────────────────
    socket.on('dm:typing', ({ receiverId }) => {
      const senderId = socketToAuthUser.get(socket.id);
      if (!senderId || !receiverId) return;

      const receiverSocketId = authUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('dm:typing', { senderId });
      }
    });

    // ─── WebRTC: Offer ─────────────────────────────────────────────────────
    socket.on('webrtc:offer', ({ roomId, offer }) => {
      socket.to(roomId).emit('webrtc:offer', { fromUserId: userId, offer });
      console.log(`🎙️  [WebRTC] Offer from ${userId} in room ${roomId}`);
    });

    // ─── WebRTC: Answer ────────────────────────────────────────────────────
    socket.on('webrtc:answer', ({ roomId, answer }) => {
      socket.to(roomId).emit('webrtc:answer', { fromUserId: userId, answer });
      console.log(`🎙️  [WebRTC] Answer from ${userId} in room ${roomId}`);
    });

    // ─── WebRTC: ICE Candidate ─────────────────────────────────────────────
    socket.on('webrtc:ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('webrtc:ice-candidate', { fromUserId: userId, candidate });
    });

    // ─── WebRTC: Force-mute (teacher → participant) ────────────────────────
    socket.on('webrtc:force-mute', ({ roomId, targetUserId }) => {
      if (!roomId) return;
      const targetSocketId = users.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:force-mute', { fromUserId: userId });
        console.log(`🔇 [WebRTC] Force-mute: ${userId} → ${targetUserId} in room ${roomId}`);
      }
    });

    // ─── Direct P2P Call Signaling ─────────────────────────────────────────
    // Route WebRTC signaling messages directly between two authenticated users.
    // authUsers maps dbUserId → socketId for authenticated sessions.

    socket.on('call:offer', ({ targetUserId, offer, callerName, callerAvatarUrl }) => {
      if (!targetUserId || !offer) return;
      const targetSocketId = authUsers.get(targetUserId);
      if (targetSocketId) {
        const callerId = socketToAuthUser.get(socket.id);
        io.to(targetSocketId).emit('call:incoming', {
          fromUserId: callerId || userId,
          fromName: callerName || 'Пользователь',
          fromAvatarUrl: callerAvatarUrl || null,
          offer,
        });
        console.log(`📞 [Call] Offer: ${userId} → ${targetUserId}`);
      } else {
        socket.emit('call:unavailable', { targetUserId });
        console.log(`📵 [Call] Target unavailable: ${targetUserId}`);
      }
    });

    socket.on('call:answer', ({ targetUserId, answer }) => {
      if (!targetUserId || !answer) return;
      const targetSocketId = authUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:accepted', { answer });
        console.log(`✅ [Call] Answered: ${userId} → ${targetUserId}`);
      }
    });

    socket.on('call:ice-candidate', ({ targetUserId, candidate }) => {
      if (!targetUserId || !candidate) return;
      const targetSocketId = authUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ice-candidate', { candidate });
      }
    });

    socket.on('call:decline', ({ targetUserId }) => {
      if (!targetUserId) return;
      const targetSocketId = authUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:declined', {});
        console.log(`❌ [Call] Declined: ${userId} → ${targetUserId}`);
      }
    });

    socket.on('call:end', ({ targetUserId }) => {
      if (!targetUserId) return;
      const targetSocketId = authUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ended', {});
        console.log(`📴 [Call] Ended: ${userId} → ${targetUserId}`);
      }
    });

    // ─── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      users.delete(userId);
      socketToUser.delete(socket.id);

      const dbUserId = socketToAuthUser.get(socket.id);
      if (dbUserId) {
        authUsers.delete(dbUserId);
        socketToAuthUser.delete(socket.id);
      }

      console.log(`❌ [SOCKET] Disconnected — userId: ${userId}${dbUserId ? ` (db: ${dbUserId})` : ''}`);
    });
  });
}
