import './config.js';
import pool from './db.js'; // Import the PostgreSQL connection pool

console.log('🚀 [SERVER] Запуск сервера...');

// --- Process-level Error Handlers ---
process.on('uncaughtException', (err) => {
  console.error('💥 [SERVER] UNCAUGHT EXCEPTION! Shutting down...');
  console.error('💥 [SERVER]', err.name, err.message);
  console.error('💥 [SERVER] Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [SERVER] UNHANDLED REJECTION! Shutting down...');
  console.error('💥 [SERVER] Reason:', reason);
  console.error('💥 [SERVER] Promise:', promise);
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ [SERVER] Ошибка подключения к базе данных:', err);
    process.exit(1);
  } else {
    console.log('✅ [SERVER] Подключение к базе данных успешно');
    console.log('📅 [SERVER] Текущее время БД:', res.rows[0].now);
  }
});

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs/promises';
import { setupSocketController } from './socket/socketController.js';

// Get the current file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const chatsMediaRoot = path.join(__dirname, 'data', 'chats');
const coursesMediaRoot = path.join(__dirname, 'data', 'courses');
const achievementsMediaRoot = path.join(__dirname, 'data', 'achievements');
const profilesMediaRoot = path.join(__dirname, 'data', 'profiles');

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import courseRoutes from './routes/courses.js';
import calendarRoutes from './routes/calendar.js';
import statisticsRoutes from './routes/statistics.js';
import progressRoutes from './routes/progress.js';
import friendsRoutes from './routes/friends.js';
import groupsRoutes from './routes/groups.js';
import { authenticateSession, authorizeRole } from './middleware/auth.js';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3002;

// Allowed origins shared between CORS middleware and Socket.IO
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:3002', 'null'];

console.log('🔧 [SERVER] Конфигурация сервера:');
console.log('🔧 [SERVER] PORT:', port);
console.log('🔧 [SERVER] NODE_ENV:', process.env.NODE_ENV || 'development');

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Socket.IO: origin not allowed'));
      }
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

setupSocketController(io);
console.log('🔌 [SOCKET.IO] Сервер настроен');

// ─── CORS ─────────────────────────────────────────────────────────────────────

// Configure CORS with dynamic origin handling
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins including null (file://)
    if (process.env.NODE_ENV === 'development' || !origin) {
      console.log('✅ [CORS] Allowing origin:', origin || 'null');
      return callback(null, true);
    }

    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      console.log('✅ [CORS] Allowing origin:', origin);
      callback(null, true);
    } else {
      console.error('❌ [CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  exposedHeaders: ['Content-Length', 'Set-Cookie', 'X-Auth-Token'],
  optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  maxAge: 86400, // 24 hours
  preflightContinue: false
};

// Add logging middleware for all requests
app.use((req, res, next) => {
  console.log(`🌐 [REQUEST] ${req.method} ${req.url}`);
  console.log(`🍪 [REQUEST] Cookies:`, req.cookies);
  console.log(`🔗 [REQUEST] Origin:`, req.headers.origin);
  next();
});

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Add CORS headers manually for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin) || origin === 'null')) {
    res.header('Access-Control-Allow-Origin', origin === 'null' ? '*' : origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Set-Cookie, X-Auth-Token');
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
await fs.mkdir(chatsMediaRoot, { recursive: true });
await fs.mkdir(coursesMediaRoot, { recursive: true });
await fs.mkdir(achievementsMediaRoot, { recursive: true });
await fs.mkdir(profilesMediaRoot, { recursive: true });
app.use('/chat-media', express.static(chatsMediaRoot));
app.use('/course-media', express.static(coursesMediaRoot));
app.use('/achievement-media', express.static(achievementsMediaRoot));
app.use('/profile-media', express.static(profilesMediaRoot));

console.log('🔗 [SERVER] Middleware настроены');

// --- API Routes ---
// console.log('🔗 [SERVER] Подключение маршрутов...');// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/groups', groupsRoutes);
// Подключаем роуты для глав и подглав без префикса /courses
app.use('/api/chapters', courseRoutes);
app.use('/api/subchapters', courseRoutes);
app.use('/api/contentblocks', courseRoutes);
console.log('✅ [SERVER] Маршруты подключены');

// --- Protected Routes Example ---
app.get('/api/protected', authenticateSession, authorizeRole('any'), (req, res) => {
  console.log('🔐 [SERVER] Доступ к защищенному маршруту');
  const userName = req.user.profile.first_name || 'User';
  res.json({ message: `Hello ${userName}! This is a protected route.`, user: req.user.profile });
});

// Handle 404 errors
app.use((req, res, next) => {
  console.log('❌ [SERVER] 404 - Страница не найдена:', req.originalUrl);
  res.status(404).json({ error: 'Not Found', message: `The requested URL ${req.originalUrl} was not found on this server.` });
});

// Generic error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 [SERVER] Глобальная ошибка:', err.stack);
  console.error('💥 [SERVER] Детали ошибки:', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack
  });
  res.status(err.statusCode || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on the server.',
  });
});

// Start the HTTP server (Express + Socket.IO share the same port)
httpServer.listen(port, '0.0.0.0', () => {
  console.log('🎉 [SERVER] Сервер успешно запущен!');
  console.log(`🚀 [SERVER] Доступен по адресу: http://localhost:${port}`);
  console.log(`🌐 [SERVER] Доступен в локальной сети на порту ${port}`);
  console.log(`📚 [SERVER] API документация: http://localhost:${port}/api`);
  console.log(`🔌 [SERVER] Socket.IO: ws://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 [SERVER] Получен сигнал SIGTERM, завершение работы...');
  httpServer.close(() => {
    console.log('🔒 [SERVER] Сервер закрыт');
    pool.end(() => {
      console.log('💾 [SERVER] Подключение к БД закрыто');
      process.exit(0);
    });
  });
});
