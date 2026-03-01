/**
 * One-off script: set cover_image in DB for courses 1 and 3.
 * Run from backend: node scripts/update-course-covers.js
 */
import pool from '../db.js';

const updates = [
  { id: 1, cover_image: '/course-media/1/cover.png' },
  { id: 3, cover_image: '/course-media/3/cover.png' },
];

async function run() {
  for (const { id, cover_image } of updates) {
    const res = await pool.query(
      'UPDATE courses SET cover_image = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, cover_image',
      [cover_image, id]
    );
    if (res.rowCount === 0) {
      console.log(`Course ${id} not found, skipped.`);
    } else {
      console.log(`Updated course ${id}:`, res.rows[0]);
    }
  }
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
