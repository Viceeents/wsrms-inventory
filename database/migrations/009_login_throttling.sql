CREATE TABLE IF NOT EXISTS login_attempts (
 identity_hash TEXT PRIMARY KEY,
 bucket BIGINT NOT NULL,
 attempts INTEGER NOT NULL CHECK (attempts > 0)
);
CREATE INDEX IF NOT EXISTS login_attempts_bucket_idx ON login_attempts(bucket);
