/**
 * Краткое описание главы и ориентировочное время изучения (минуты).
 * Идемпотентно: безопасно, если колонки уже добавлены вручную.
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chapters' AND column_name = 'short_description'
    ) THEN
        ALTER TABLE chapters ADD COLUMN short_description TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chapters' AND column_name = 'study_minutes'
    ) THEN
        ALTER TABLE chapters ADD COLUMN study_minutes INTEGER;
    END IF;
END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE chapters DROP COLUMN IF EXISTS study_minutes');
  pgm.sql('ALTER TABLE chapters DROP COLUMN IF EXISTS short_description');
};
