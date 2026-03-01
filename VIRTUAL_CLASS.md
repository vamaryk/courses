# Виртуальный класс — документация

## Что реализовано

| Функционал | Технология | Файлы |
|---|---|---|
| Текстовый чат (комнаты) | Socket.IO rooms | `backend/socket/socketController.js`, `src/hooks/useChat.ts` |
| Поиск пользователя по ID | Socket.IO events | `socketController.js` → `chat:join` |
| WebRTC голосовой звонок | RTCPeerConnection + STUN | `src/hooks/useWebRTC.ts` |
| Сигнальный сервер | Socket.IO | `socketController.js` → `webrtc:offer/answer/ice-candidate` |
| Страница «Виртуальный класс» | React + Tailwind CSS | `src/widgets/VirtualClassPage.tsx` |
| Кнопка в сайдбаре | Lucide React / React Router | `src/widgets/navigation/model/menuItem.tsx` |

---

## Архитектура

```
Frontend (Vite + React)          Backend (Node.js + Express)
┌─────────────────────────┐      ┌──────────────────────────────┐
│  VirtualClassPage        │      │  server.js                   │
│  ├── useSocket           │◄────►│  └── Socket.IO (ws://…:3002) │
│  ├── useChat             │      │       └── socketController.js│
│  └── useWebRTC           │      │                              │
│       └── RTCPeerConn.   │      │  Express REST API (/api/*)   │
└─────────────────────────┘      └──────────────────────────────┘
                  WebRTC (P2P audio after signaling)
         User A ◄──────────────────────────────► User B
```

### Socket.IO события

| Событие | Направление | Описание |
|---|---|---|
| `user:id` | server → client | Сервер отправляет уникальный 6-символьный ID |
| `chat:join` | client → server | Инициировать комнату с пользователем `targetUserId` |
| `chat:joined` | server → client | Подтверждение, содержит `roomId` |
| `chat:invited` | server → client | Уведомление второму участнику |
| `chat:accept` | client → server | Принять приглашение в комнату |
| `chat:ready` | server → all in room | Оба участника в комнате, чат активен |
| `chat:message` | client → server → room | Отправить сообщение |
| `chat:error` | server → client | Ошибка (пользователь не найден и т.д.) |
| `webrtc:offer` | client → server → room | WebRTC offer (инициатор звонка) |
| `webrtc:answer` | client → server → room | WebRTC answer (принимающий) |
| `webrtc:ice-candidate` | client → server → room | ICE-кандидаты для NAT traversal |

---

## Структура новых файлов

```
backend/
└── socket/
    └── socketController.js   # Весь Socket.IO + WebRTC сигналинг

src/
├── hooks/
│   ├── useSocket.ts          # Управление Socket.IO соединением
│   ├── useChat.ts            # Логика чата (комнаты, сообщения)
│   └── useWebRTC.ts          # WebRTC peer connection + медиа
└── widgets/
    └── VirtualClassPage.tsx  # Страница «Виртуальный класс»
```

---

## Как запустить локально

### 1. Зависимости (если ещё не установлены)

```bash
# Backend
cd backend
npm install

# Frontend
cd ..
npm install
```

### 2. Запустить бэкенд

```bash
cd backend
npm run dev
# Сервер стартует на http://localhost:3002
# Socket.IO доступен на ws://localhost:3002
```

### 3. Запустить фронтенд

```bash
# В корне проекта
npm run dev
# Vite dev server на http://localhost:5173
```

### 4. Открыть в браузере

- Перейти на `http://localhost:5173/virtual-class`
- Или нажать «Вирт. класс» в боковом меню

---

## Как протестировать чат

1. Откройте **два разных браузера** (или одно обычное + одно приватное окно).
2. В первом окне запомните свой **ID** (например `AB12CD`).
3. Во втором окне введите этот ID в поле «Подключиться к пользователю» → нажмите **Войти**.
4. Первое окно автоматически примет приглашение — комната становится активной.
5. Пишите сообщения — они мгновенно появятся у обоих.

### Как протестировать голос

1. После того как чат активен, нажмите **«Голосовой звонок»** в одном из окон.
2. Браузер попросит разрешение на микрофон — разрешите.
3. Второй участник автоматически примет WebRTC offer и тоже запросит микрофон.
4. Говорите — звук передаётся через P2P соединение (WebRTC).
5. Нажмите **«Завершить звонок»** для остановки.

> **Заметка:** Для теста в одном браузере (два вкладки одного домена) WebRTC ICE может не пройти без TURN-сервера. Рекомендуется тестировать в двух разных браузерах.

---

## Деплой и доступность через интернет

### Вариант 1 — Cloudflare Tunnel (рекомендуется, стабильно в РФ в 2026)

```bash
# Установить cloudflared (Windows)
winget install Cloudflare.cloudflared

# Создать туннель к бэкенду
cloudflared tunnel --url http://localhost:3002
# Получите URL вида: https://xxxxx.trycloudflare.com
```

В корне проекта создайте `.env` (или добавьте в `.env.local`):
```env
VITE_SOCKET_URL=https://xxxxx.trycloudflare.com
```

Перезапустите `npm run dev` — фронтенд теперь подключится к туннельному URL.

### Вариант 2 — Localtunnel

```bash
npx localtunnel --port 3002
# Получите URL вида: https://xxxxx.loca.lt
```

Аналогично установите `VITE_SOCKET_URL` в `.env`.

### Вариант 3 — Production деплой

| Компонент | Рекомендация |
|---|---|
| Backend | Railway, Render, VPS (Ubuntu + PM2) |
| Frontend | Vercel, Netlify |
| WebSocket | Убедитесь, что хостинг поддерживает Upgrade → WebSocket |
| TURN сервер | Для NAT traversal в продакшне добавьте TURN (coturn или Metered.ca) |

---

## Переменные окружения

| Переменная | Где | Описание |
|---|---|---|
| `VITE_SOCKET_URL` | `.env` (фронт) | URL Socket.IO сервера (по умолчанию `http://localhost:3002`) |
| `PORT` | `.env` (бэк) | Порт сервера (по умолчанию `3002`) |
| `NODE_ENV` | `.env` (бэк) | `development` снимает ограничения CORS |

---

## Технологии

- **Socket.IO 4.x** — WebSocket с автоматическим fallback на long-polling
- **WebRTC** — нативный браузерный API, P2P аудио без доп. сервера
- **STUN (Google)** — обнаружение публичного IP для NAT traversal
- **React 19 + TypeScript** — фронтенд
- **Node.js + Express** — бэкенд
- **Tailwind CSS 4** — стилизация
