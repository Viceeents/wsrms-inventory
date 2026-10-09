ALTER TABLE database_backups ADD COLUMN IF NOT EXISTS backup_synced_at TEXT;
ALTER TABLE database_backups ADD COLUMN IF NOT EXISTS backup_database_name TEXT;
UPDATE user_preferences SET theme='light' WHERE theme NOT IN ('light','dark');
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_theme_check;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_theme_check CHECK(theme IN ('light','dark'));
