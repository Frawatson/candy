-- Insert default roles
INSERT INTO roles (name, description, permissions, is_system) VALUES
(
    'admin',
    'System administrator with full access',
    '["user:read", "user:write", "user:delete", "role:read", "role:write", "role:delete", "system:admin"]'::jsonb,
    true
),
(
    'moderator',
    'Content moderator with limited admin privileges',
    '["user:read", "user:write", "role:read", "content:moderate"]'::jsonb,
    true
),
(
    'user',
    'Standard user with basic permissions',
    '["profile:read", "profile:write"]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;