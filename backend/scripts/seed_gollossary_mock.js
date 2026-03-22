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

  // Чтобы не мешали старые тестовые документы (seed версии 1),
  // при желании очищаем только mock-данные.
  const clearMock =
    (process.env.CLEAR_MOCK_MINDMAPS || "true").toLowerCase() === "true";
  if (clearMock) {
    await mindmapsCol.deleteMany({ model_used: "mock-seed-script" });
  }

  const now = new Date();

  // Создаем mindmap-документы привязанные к subchapter_id,
  // чтобы фронтенд смог связать их с выбранным курсом.
  const courseIds = courses.map((c) => c.id);
  const subchaptersRes = await pool.query(
    `
      SELECT
        s.id AS subchapter_id,
        s.title AS subchapter_title,
        c.id AS chapter_id,
        c.order AS chapter_order,
        c.course_id AS course_id,
        s.order AS subchapter_order
      FROM subchapters s
      JOIN chapters c ON c.id = s.chapter_id
      WHERE c.course_id = ANY($1::int[])
      ORDER BY c.course_id, chapter_order, subchapter_order
    `,
    [courseIds],
  );

  const byCourse: Record<number, any[]> = {};
  subchaptersRes.rows.forEach((r) => {
    if (!byCourse[r.course_id]) byCourse[r.course_id] = [];
    byCourse[r.course_id].push(r);
  });

  // Для теста не генерим mindmap для абсолютно всех лекций: берем первые N по каждому курсу.
  const MAX_LECTURES_PER_COURSE = 3;

  const docs = [];
  for (const course of courses) {
    const baseTitle = course.title || `Курс #${course.id}`;
    const subs = byCourse[course.id] || [];
    const picked = subs.slice(0, MAX_LECTURES_PER_COURSE);

    for (const sub of picked) {
      const subTitle =
        sub.subchapter_title && String(sub.subchapter_title).trim().length > 0
          ? String(sub.subchapter_title)
          : `Лекция ${String(sub.subchapter_id)}`;

      docs.push({
        lecture_number: subTitle,
        topic: `${baseTitle}: ${subTitle}`,
        description:
          'Тестовая карта знаний, созданная для проверки интеграции фронтенда с backend глоссария (seed script).',
        concepts: [
          {
            term: 'Основное понятие',
            definition: `Ключевая идея из лекции «${subTitle}» по курсу «${baseTitle}».`,
            example: 'Демо-понятие для отображения облаков в Knowledge Map.',
            image_description: '—',
            relations: {
              parent: null,
              children: ['Связанное понятие'],
            },
          },
          {
            term: 'Связанное понятие',
            definition:
              'Дополнительное понятие, связанное с основным и используемое для построения ребер.',
            example: 'Ребро parent->child строится по term/relations.',
            image_description: '',
            relations: {
              parent: 'Основное понятие',
              children: ['Дальнейший шаг'],
            },
          },
          {
            term: 'Дальнейший шаг',
            definition:
              'Третий уровень иерархии, чтобы была видна вложенность и карта выглядела объемнее.',
            example: 'Используется как термин на следующем шаге.',
            image_description: '',
            relations: {
              parent: 'Связанное понятие',
              children: [],
            },
          },
        ],
        source_lecture_id: String(sub.subchapter_id),
        created_at: now,
        updated_at: now,
        model_used: 'mock-seed-script',
        chunk_count: 1,
      });
    }
  }

  console.log(`🧾 Подготовлено документов MindMap для вставки: ${docs.length}`);

  if (!docs.length) {
    console.warn('⚠️ Не удалось подготовить mindmap: нет subchapters для курсов пользователя.');
    await client.close();
    await pool.end();
    process.exit(0);
  }

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

