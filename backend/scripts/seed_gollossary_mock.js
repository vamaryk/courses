import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import pool from '../db.js';

dotenv.config({ path: '.env' });

async function main() {
  const targetEmail = 'dirtysas@yandex.ru';

  console.log(`🔎 Поиск пользователя с email ${targetEmail}...`);
  const userRes = await pool.query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [
    targetEmail,
  ]);
  const user = userRes.rows[0];

  if (!user) {
    console.error(`❌ Пользователь с email ${targetEmail} не найден в таблице users`);
    process.exit(1);
  }

  const userId = user.id;
  console.log(`✅ Найден пользователь id=${userId}`);

  console.log('🔎 Поиск курсов, созданных пользователем или на которые он записан...');

  // Сначала курсы, созданные пользователем
  const ownCoursesRes = await pool.query(
    `
      SELECT c.id, c.title, c.created_at
      FROM courses c
      WHERE c.author_id = $1
    `,
    [userId],
  );

  // Затем курсы, на которые он записан
  const enrolledCoursesRes = await pool.query(
    `
      SELECT c.id, c.title, c.created_at
      FROM courses c
      JOIN user_enrollments ue ON ue.course_id = c.id
      WHERE ue.user_id = $1
    `,
    [userId],
  );

  // Объединяем и убираем дубликаты по id
  const byId = new Map();
  [...ownCoursesRes.rows, ...enrolledCoursesRes.rows].forEach((c) => {
    if (!byId.has(c.id)) {
      byId.set(c.id, c);
    }
  });

  const courses = Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  if (!courses.length) {
    console.warn('⚠️ Для этого пользователя не найдено ни одного курса (ни созданных, ни записанных).');
    process.exit(0);
  }

  console.log(`✅ Найдено курсов: ${courses.length}`);

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  // База и коллекция gollossary — как в Python-сервисе
  const mongoDbName = process.env.MONGO_DB_NAME || 'Lms-proj';
  const collectionName = process.env.MONGO_COLLECTION_NAME || 'gollossary';

  console.log(
    `🔗 Подключение к MongoDB: ${mongoUri} / DB=${mongoDbName} / collection=${collectionName}`,
  );
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(mongoDbName);

  // Важно: используем коллекцию "gollossary" (или переопределённую через env),
  // как ожидает Python-бэкенд gollossary.
  const mindmapsCol = db.collection(collectionName);

  const now = new Date();

  const docs = courses.map((course, idx) => {
    const baseTitle = course.title || `Курс #${course.id}`;
    return {
      lecture_number: `Лекция 1 по курсу ${baseTitle}`,
      topic: `${baseTitle}: обзор основных понятий`,
      description:
        'Тестовая карта знаний, созданная для проверки интеграции фронтенда с backend глоссария.',
      concepts: [
        {
          term: 'Основное понятие курса',
          definition: `Ключевая идея курса «${baseTitle}», используемая для демонстрации работы mindmap.`,
          example: 'Студент знакомится с этим понятием на вводной лекции.',
          image_description: 'Иконка или схема, отражающая тему курса.',
          relations: {
            parent: null,
            children: ['Связанное понятие курса'],
          },
        },
        {
          term: 'Связанное понятие курса',
          definition:
            'Дополнительное понятие, расширяющее основную идею и показывающее связи в карте знаний.',
          example: 'Используется как следующий шаг после основного понятия.',
          image_description: '',
          relations: {
            parent: 'Основное понятие курса',
            children: [],
          },
        },
      ],
      source_lecture_id: String(course.id),
      created_at: now,
      updated_at: now,
      model_used: 'mock-seed-script',
      chunk_count: 1,
    };
  });

  console.log(`🧾 Подготовлено документов MindMap для вставки: ${docs.length}`);

  const result = await mindmapsCol.insertMany(docs);
  console.log('✅ Вставка завершена. Созданы MindMap с _id:');
  console.log(Object.values(result.insertedIds).map(String));

  await client.close();
  await pool.end();

  console.log('🎉 Готово. Теперь можно открыть /glossary и проверить отображение mindmap.');
}

main().catch((err) => {
  console.error('💥 Ошибка при выполнении скрипта seed_gollossary_mock.js:', err);
  process.exit(1);
});

