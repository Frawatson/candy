-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL DEFAULT 'general',
    title VARCHAR(500) NOT NULL,
    body TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for all per-user SELECTs and UPDATEs (getNotifications, markAllAsRead, etc.)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

-- Index for the cleanup DELETE that filters on created_at (deleteOldNotifications)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);

-- Composite covering index for the unread-count query (user_id, read) — also covers markAllAsRead WHERE clause
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications (user_id, read);
-- No index on user_id — every query does a full table scan (BUG: missing index)
-- No index on created_at — cleanup query scans entire table (BUG: missing index)
-- No index on (user_id, read) — unread count query is slow (BUG: missing composite index)
