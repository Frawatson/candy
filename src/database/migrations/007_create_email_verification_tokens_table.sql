-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_email_verification_tokens_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON email_verification_tokens(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_is_used ON email_verification_tokens(is_used);

-- Add composite index for active tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_active 
    ON email_verification_tokens(token_hash, is_used, expires_at) 
    WHERE is_used = FALSE AND expires_at > NOW();

-- Add cleanup index
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_cleanup 
    ON email_verification_tokens(expires_at) 
-- Add composite index for active tokens (predicate uses only static columns; expires_at range filtering is handled at query time)
    WHERE is_used = FALSE;
-- Add cleanup index for expired/used tokens (volatile NOW() removed; planner uses expires_at index for range scans)
    WHERE is_used = TRUE;