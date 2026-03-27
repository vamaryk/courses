-- Privacy flags on profiles + email change tracking on users.
-- Run once against your Postgres DB, e.g.: psql $DATABASE_URL -f migration_profile_privacy_email.sql

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_details_public BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS learning_progress_public BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.profile_details_public IS 'If false, others see only name, avatar, banner.';
COMMENT ON COLUMN profiles.learning_progress_public IS 'If false, others do not see stats / courses in progress (requires profile_details_public).';
COMMENT ON COLUMN users.email_changed_at IS 'Last email change time; next change allowed after 30 days. NULL = never changed since registration.';
