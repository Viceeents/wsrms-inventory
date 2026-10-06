CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY,code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','staff')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY,name TEXT UNIQUE NOT NULL,color TEXT NOT NULL DEFAULT '#4b8870',active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS warehouse (id INTEGER PRIMARY KEY CHECK(id=1),name TEXT NOT NULL,rows INTEGER NOT NULL,cols INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS grid_cells (
 id TEXT PRIMARY KEY,row INTEGER NOT NULL,col INTEGER NOT NULL,UNIQUE(row,col),
 type TEXT NOT NULL CHECK(type IN ('walkway','rack','floor_storage','door','wall','blocked')),
 walkable BOOLEAN NOT NULL DEFAULT false,active BOOLEAN NOT NULL DEFAULT true,can_store BOOLEAN NOT NULL DEFAULT false,
 availability TEXT NOT NULL DEFAULT 'Available' CHECK(availability IN ('Available','Blocked')),
 movement_cost DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK(movement_cost>0),
 door_usage TEXT CHECK(door_usage IS NULL OR door_usage IN ('receiving','dispatch','both')),
 directions JSONB NOT NULL DEFAULT '["north","south","east","west"]'
);
CREATE TABLE IF NOT EXISTS storage_locations (
 id SERIAL PRIMARY KEY,code TEXT UNIQUE NOT NULL,cell_id TEXT UNIQUE NOT NULL REFERENCES grid_cells(id),
 storage_type TEXT NOT NULL CHECK(storage_type IN ('rack','floor_storage','walkway')),
 capacity INTEGER NOT NULL CHECK(capacity>0),unit_capacity INTEGER NOT NULL CHECK(unit_capacity>0),
 max_weight DOUBLE PRECISION NOT NULL CHECK(max_weight>0),max_size TEXT NOT NULL CHECK(max_size IN ('Small','Medium','Large')),
 category_id INTEGER REFERENCES categories(id),status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','Reserved','Blocked'))
);
CREATE TABLE IF NOT EXISTS parcels (
 id SERIAL PRIMARY KEY,code TEXT UNIQUE NOT NULL,tracking_number TEXT UNIQUE,description TEXT NOT NULL,
 category_id INTEGER NOT NULL REFERENCES categories(id),size TEXT NOT NULL CHECK(size IN ('Small','Medium','Large')),
 weight DOUBLE PRECISION NOT NULL CHECK(weight>0),quantity INTEGER NOT NULL CHECK(quantity>0),
 status TEXT NOT NULL CHECK(status IN ('Stored','Retrieved','Dispatched')),location_id INTEGER NOT NULL REFERENCES storage_locations(id),
 checked_in_by INTEGER NOT NULL REFERENCES users(id),checked_in_at TEXT NOT NULL,dispatched_at TEXT
);
CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY,code TEXT UNIQUE NOT NULL,parcel_id INTEGER REFERENCES parcels(id),user_id INTEGER NOT NULL REFERENCES users(id),type TEXT NOT NULL,previous_status TEXT,new_status TEXT,previous_location TEXT,new_location TEXT,verified INTEGER,metadata TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY,value INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS system_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,
 floor_storage_enabled BOOLEAN NOT NULL DEFAULT true,near_full_threshold INTEGER NOT NULL DEFAULT 80 CHECK(near_full_threshold BETWEEN 50 AND 99),
 notification_events JSONB NOT NULL DEFAULT '["capacity_near_full","capacity_full","check_in","dispatch","verification_failed","blocked_route","storage_unavailable","layout_change"]'
);
INSERT INTO system_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS user_preferences (user_id INTEGER PRIMARY KEY REFERENCES users(id),font_size TEXT NOT NULL DEFAULT 'medium' CHECK(font_size IN ('small','medium','large')),accent_color TEXT NOT NULL DEFAULT 'green' CHECK(accent_color IN ('blue','teal','green','purple','orange')));
CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY,user_id INTEGER REFERENCES users(id),type TEXT NOT NULL,severity TEXT NOT NULL CHECK(severity IN ('info','warning','error')),message TEXT NOT NULL,parcel_id INTEGER REFERENCES parcels(id),location_id INTEGER REFERENCES storage_locations(id),dedupe_key TEXT UNIQUE,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notification_reads (notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,user_id INTEGER REFERENCES users(id),read_at TEXT NOT NULL,PRIMARY KEY(notification_id,user_id));
CREATE TABLE IF NOT EXISTS storage_alert_state (location_id INTEGER PRIMARY KEY REFERENCES storage_locations(id) ON DELETE CASCADE,level TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS parcels_status_idx ON parcels(status);
CREATE INDEX IF NOT EXISTS parcels_location_idx ON parcels(location_id);
CREATE INDEX IF NOT EXISTS transactions_parcel_idx ON transactions(parcel_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(created_at);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_idx ON categories(lower(name));
