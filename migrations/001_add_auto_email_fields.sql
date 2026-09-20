-- ============================================================================
-- Migration: Add enable_monday_auto_email to Rentals and
--            global_auto_email_enabled to System Settings
-- ============================================================================

-- 1. Add enable_monday_auto_email to rentals table (default TRUE)
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS enable_monday_auto_email BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add global_auto_email_enabled to system_settings table (default TRUE)
-- If system_settings table already exists:
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS global_auto_email_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- If system_settings is initialized with a singleton row, ensure default values:
INSERT INTO system_settings (id, global_auto_email_enabled, created_at, updated_at)
VALUES (1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
