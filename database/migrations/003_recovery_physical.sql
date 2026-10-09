ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity_at TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light','dark','system'));
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS length_cm DOUBLE PRECISION CHECK(length_cm>0);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS width_cm DOUBLE PRECISION CHECK(width_cm>0);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS height_cm DOUBLE PRECISION CHECK(height_cm>0);
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS width_cm DOUBLE PRECISION NOT NULL DEFAULT 120 CHECK(width_cm>0);
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS depth_cm DOUBLE PRECISION NOT NULL DEFAULT 80 CHECK(depth_cm>0);
ALTER TABLE storage_locations ADD COLUMN IF NOT EXISTS height_cm DOUBLE PRECISION NOT NULL DEFAULT 180 CHECK(height_cm>0);
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS size_limits JSONB NOT NULL DEFAULT '{"Small":[30,30,30],"Medium":[60,50,50]}';
CREATE TABLE IF NOT EXISTS profile_image_requests (
 id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),current_image TEXT,requested_image TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),requested_at TEXT NOT NULL,
 reviewed_at TEXT,reviewed_by INTEGER REFERENCES users(id));
CREATE UNIQUE INDEX IF NOT EXISTS profile_pending_idx ON profile_image_requests(user_id) WHERE status='Pending';
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_severity_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_severity_check CHECK(severity IN ('info','success','warning','error','critical'));
CREATE TABLE IF NOT EXISTS database_backups (
 id TEXT PRIMARY KEY, schema_name TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Running','Completed','Failed')),
 started_at TEXT NOT NULL, completed_at TEXT, size_bytes BIGINT, checksum TEXT, error TEXT, created_by INTEGER REFERENCES users(id));
CREATE INDEX IF NOT EXISTS database_backups_schema_idx ON database_backups(schema_name,started_at);
UPDATE system_settings SET notification_events=notification_events || '["floor_assignment"]'::jsonb WHERE NOT notification_events @> '["floor_assignment"]'::jsonb;
