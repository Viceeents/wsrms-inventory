ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE users ADD CONSTRAINT deleted_users_inactive CHECK (deleted_at IS NULL OR active=0);
