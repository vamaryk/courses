import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";

// Node 18+ может иметь global fetch, но в проекте уже есть node-fetch.
import nodeFetch from "node-fetch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Postgres env from repo root .env
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
// Save postgres env because gollossary/.env also uses DB_NAME variable.
const postgresEnv = {
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_PORT: process.env.DB_PORT,
};

// Load gollossary/Mongo env from gollossary/.env.
// It must override DB_NAME because both env files use the same variable name.
dotenv.config({
  path: path.resolve(__dirname, "..", "gollossary", ".env"),
  override: true,
});

const { Pool } = pg;
const pool = new Pool({
  user: postgresEnv.DB_USER,
  host: postgresEnv.DB_HOST,
  database: postgresEnv.DB_NAME,
  password: postgresEnv.DB_PASSWORD,
  port: postgresEnv.DB_PORT ? Number(postgresEnv.DB_PORT) : undefined,
});

function getArg(name, defaultValue) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return defaultValue;
  const raw = process.argv[idx + 1];
  return raw == null ? defaultValue : raw;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const courseIdArg = getArg("--courseId", "");
const limitSubchapters = Number(getArg("--limitSubchapters", "15"));
const force = hasFlag("--force");
const dryRun = hasFlag("--dry-run");

const language = process.env.LANGUAGE || "ru";
const lectureProcessorUrl =
  process.env.GOLLOSSARY_LECTURE_PROCESSOR_URL ||
  // Use async endpoint: local GGUF generation can take long and sync requests may drop.
  "http://127.0.0.1:8001/api/v1/lectures/process-async";

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017";
const mongoDbName = process.env.DB_NAME || "Lms-proj";
const collectionName = process.env.COLLECTION_NAME || "gollossary";

async function main() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(mongoDbName);
  const mindmapsCol = db.collection(collectionName);

  // 1) Получаем subchapters, у которых реально есть контент
  const params = [limitSubchapters];
  let whereCourse = "";
  if (courseIdArg) {
    whereCourse = "AND co.id = $1";
    params.unshift(Number(courseIdArg));
  }

  const sql = `
    SELECT
      s.id AS subchapter_id,
      s.title AS subchapter_title,
      ch.title AS chapter_title,
      ch."order" AS chapter_order,
      s."order" AS subchapter_order,
      co.id AS course_id,
      co.title AS course_title
    FROM subchapters s
    JOIN chapters ch ON s.chapter_id = ch.id
    JOIN courses co ON ch.course_id = co.id
    WHERE 1=1
      ${whereCourse}
      AND EXISTS (
        SELECT 1
        FROM content_blocks cb
        WHERE cb.subchapter_id = s.id
          AND cb.content IS NOT NULL
          AND cb.content <> ''
      )
    ORDER BY co.id, ch."order" ASC, s."order" ASC
    LIMIT $${courseIdArg ? "2" : "1"};
  `;

  const candidates = await pool.query(sql, params);
  const rows = candidates.rows || [];

  const subchapterIds = rows.map((r) => Number(r.subchapter_id)).filter(Number.isFinite);

  if (!subchapterIds.length) {
    console.log("No subchapters found to ingest.");
    await client.close();
    await pool.end();
    return;
  }

  // 2) Пропускаем те subchapter, для которых уже есть MindMap в Mongo
  const sourceLectureIds = subchapterIds.map((id) => String(id));
  const existing = await mindmapsCol
    .find({ source_lecture_id: { $in: sourceLectureIds } })
    .project({ source_lecture_id: 1 })
    .toArray();

  const existingSet = new Set(existing.map((d) => String(d.source_lecture_id)));

  console.log(
    `Candidates: ${rows.length}. Existing in Mongo: ${existingSet.size}. force=${force}. dryRun=${dryRun}.`,
  );

  if (dryRun) {
    console.log("DRY RUN: would ingest these subchapters:");
    rows
      .filter((r) => !existingSet.has(String(r.subchapter_id)))
      .slice(0, limitSubchapters)
      .forEach((r) => {
        console.log(`- course=${r.course_id} subchapter=${r.subchapter_id} "${r.subchapter_title}"`);
      });
    await client.close();
    await pool.end();
    return;
  }

  // 3) Инжест: вызываем lecture-processor для каждого subchapter
  for (const r of rows) {
    const subchapterId = Number(r.subchapter_id);
    if (!Number.isFinite(subchapterId)) continue;
    const sourceLectureId = String(subchapterId);

    if (!force && existingSet.has(sourceLectureId)) {
      continue;
    }

    const blocksRes = await pool.query(
      `SELECT type, content
       FROM content_blocks
       WHERE subchapter_id = $1
       ORDER BY "order" ASC`,
      [subchapterId],
    );

    const parts = [];
    const header = r.subchapter_title || r.chapter_title || `Лекция ${subchapterId}`;
    parts.push(String(header));

    for (const b of blocksRes.rows || []) {
      if (b && b.content) {
        const text = String(b.content).trim();
        if (text.length > 0) parts.push(text);
      }
    }

    const content = parts.join("\n\n").trim();
    if (!content || content.length < 10) {
      console.log(`Skip subchapter ${subchapterId}: content too short.`);
      continue;
    }

    const payload = {
      content,
      lecture_number: header,
      source_id: sourceLectureId,
      language,
    };

    console.log(
      `Ingest course=${r.course_id} subchapter=${subchapterId} -> ${lectureProcessorUrl}`,
    );

    const resp = await nodeFetch(lectureProcessorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error(
        `Lecture processor failed for subchapter=${subchapterId}. status=${resp.status} ${resp.statusText}. body=${text.slice(0, 500)}`,
      );
      continue;
    }

    const data = await resp.json().catch(() => ({}));
    console.log(
      `OK: subchapter=${subchapterId} mindmap_id=${data?.mindmap_id || "<unknown>"}`,
    );

    // Чтобы в этом запуске не дергать повторно, обновим сет.
    existingSet.add(sourceLectureId);
  }

  await client.close();
  await pool.end();
  console.log("Ingestion finished.");
}

main().catch(async (e) => {
  console.error("Ingestion script error:", e);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});

