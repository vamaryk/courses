import express from 'express';
import pool from '../db.js';
import { authenticateSession, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all calendar events for the authenticated user
router.get('/', authenticateSession, async (req, res) => {
  try {
    console.log('🔄 [CALENDAR] Получение задач календаря для пользователя');
    console.log('👤 [CALENDAR] req.user:', req.user);
    const userId = req.user.userId;
    console.log('👤 [CALENDAR] User ID:', userId);

    console.log('📡 [CALENDAR] Выполнение SQL запроса для получения задач...');
    const result = await pool.query(
      'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY start_time ASC',
      [userId]
    );

    console.log('✅ [CALENDAR] Найдено задач:', result.rows.length);
    console.log('📦 [CALENDAR] Данные задач:', JSON.stringify(result.rows, null, 2));

    res.json(result.rows);
    console.log('🚀 [CALENDAR] Ответ отправлен клиенту');
  } catch (error) {
    console.error('❌ [CALENDAR] Ошибка при получении задач календаря:', error);
    console.error('❌ [CALENDAR] Stack trace:', error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new calendar event (task)
router.post('/', authenticateSession, async (req, res) => {
  try {
    console.log('🔄 [CALENDAR] Создание новой задачи в календаре');
    console.log('👤 [CALENDAR] req.user:', req.user);
    const userId = req.user.userId;
    const { title, description, start_time, end_time, event_type, location } = req.body;

    console.log('👤 [CALENDAR] User ID:', userId);
    console.log('📥 [CALENDAR] Полученные данные:', {
      title,
      description,
      start_time,
      end_time,
      event_type,
      location
    });

    // Валидация обязательных полей
    console.log('🔍 [BACKEND] Проверка обязательных полей...');
    if (!title || !start_time || !end_time || !event_type) {
      console.log('❌ [BACKEND] Отсутствуют обязательные поля:', {
        title: !title,
        start_time: !start_time,
        end_time: !end_time,
        event_type: !event_type
      });
      return res.status(400).json({ message: 'Missing required event fields' });
    }

    // Преобразование дат в timestamp
    console.log('🔄 [BACKEND] Преобразование дат в timestamp...');
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    console.log('📅 [BACKEND] Преобразованные даты:', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    // Проверка корректности дат
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.log('❌ [BACKEND] Некорректный формат дат');
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (startTime >= endTime) {
      console.log('❌ [BACKEND] Время начала позже времени окончания');
      return res.status(400).json({ message: 'Start time must be before end time' });
    }

    console.log('📡 [BACKEND] Выполнение SQL запроса для создания задачи...');
    const result = await pool.query(
      `INSERT INTO calendar_events (user_id, title, description, start_time, end_time, event_type, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, title, description, startTime, endTime, event_type, location]
    );

    console.log('✅ [BACKEND] Задача успешно создана:', result.rows[0]);
    res.status(201).json(result.rows[0]);
    console.log('🚀 [BACKEND] Ответ создания задачи отправлен клиенту');
  } catch (error) {
    console.error('❌ [BACKEND] Ошибка при создании задачи календаря:', error);
    console.error('❌ [BACKEND] Stack trace:', error.stack);
    console.error('❌ [BACKEND] Полные данные запроса:', req.body);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a calendar event
router.put('/:id', authenticateSession, async (req, res) => {
  try {
    console.log('🔄 [BACKEND] Обновление задачи календаря');
    const userId = req.user.userId;
    const eventId = req.params.id;
    const { title, description, start_time, end_time, event_type, location } = req.body;

    console.log('👤 [BACKEND] User ID:', userId);
    console.log('📝 [BACKEND] Event ID для обновления:', eventId);
    console.log('📥 [BACKEND] Полученные данные для обновления:', {
      title,
      description,
      start_time,
      end_time,
      event_type,
      location
    });

    // Преобразование дат в timestamp
    console.log('🔄 [BACKEND] Преобразование дат в timestamp...');
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    console.log('📅 [BACKEND] Преобразованные даты:', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    // Проверка корректности дат
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.log('❌ [BACKEND] Некорректный формат дат');
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (startTime >= endTime) {
      console.log('❌ [BACKEND] Время начала позже времени окончания');
      return res.status(400).json({ message: 'Start time must be before end time' });
    }

    console.log('📡 [BACKEND] Выполнение SQL запроса для обновления задачи...');
    const result = await pool.query(
      `UPDATE calendar_events
       SET title = $1, description = $2, start_time = $3, end_time = $4, event_type = $5, location = $6
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [title, description, startTime, endTime, event_type, location, eventId, userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ [BACKEND] Задача не найдена или пользователь не авторизован');
      return res.status(404).json({ message: 'Event not found or not authorized' });
    }

    console.log('✅ [BACKEND] Задача успешно обновлена:', result.rows[0]);
    res.json(result.rows[0]);
    console.log('🚀 [BACKEND] Ответ обновления задачи отправлен клиенту');
  } catch (error) {
    console.error('❌ [BACKEND] Ошибка при обновлении задачи календаря:', error);
    console.error('❌ [BACKEND] Stack trace:', error.stack);
    console.error('❌ [BACKEND] Полные данные запроса:', req.body);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a calendar event
router.delete('/:id', authenticateSession, async (req, res) => {
  try {
    console.log('🔄 [BACKEND] Удаление задачи календаря');
    const userId = req.user.userId;
    const eventId = req.params.id;

    console.log('👤 [BACKEND] User ID:', userId);
    console.log('🗑️ [BACKEND] Event ID для удаления:', eventId);

    console.log('📡 [BACKEND] Выполнение SQL запроса для удаления задачи...');
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING id',
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ [BACKEND] Задача не найдена или пользователь не авторизован');
      return res.status(404).json({ message: 'Event not found or not authorized' });
    }

    console.log('✅ [BACKEND] Задача успешно удалена, ID:', result.rows[0].id);
    res.status(204).send(); // No content for successful deletion
    console.log('🚀 [BACKEND] Ответ удаления задачи отправлен клиенту');
  } catch (error) {
    console.error('❌ [BACKEND] Ошибка при удалении задачи календаря:', error);
    console.error('❌ [BACKEND] Stack trace:', error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
