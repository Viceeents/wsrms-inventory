CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('team','announcements','updates')),
  sender_user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Normal','Important','Urgent')),
  created_at TEXT NOT NULL,
  archived_at TEXT
);
CREATE INDEX IF NOT EXISTS messages_channel_history ON messages(channel,id DESC) WHERE archived_at IS NULL;
CREATE TABLE IF NOT EXISTS message_reads (
  user_id INTEGER NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL CHECK (channel IN ('team','announcements','updates')),
  last_read_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id,channel)
);
INSERT INTO messages(channel,title,message,created_at)
SELECT 'updates','Storix team messaging','Team messages and announcements are now available inside your workspace.',CURRENT_TIMESTAMP::text
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE channel='updates');
