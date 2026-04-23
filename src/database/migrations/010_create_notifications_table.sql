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

-- No index on user_id — every query does a full table scan (BUG: missing index)
-- No index on created_at — cleanup query scans entire table (BUG: missing index)
-- No index on (user_id, read) — unread count query is slow (BUG: missing composite index)
