/*
# Create google_calendar_tokens table

Stores Google OAuth refresh tokens per user so we can re-import
calendar data without requiring re-authorization each time.

1. New Tables
   - `google_calendar_tokens`
     - `user_id` (uuid, PK, FK → auth.users)
     - `access_token` (text)
     - `refresh_token` (text)
     - `expires_at` (timestamptz)
     - `updated_at` (timestamptz)

2. Security
   - RLS enabled, owner-scoped policies (authenticated only).
*/

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  text NOT NULL,
  refresh_token text,
  expires_at    timestamptz,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_gcal_token" ON google_calendar_tokens;
CREATE POLICY "select_own_gcal_token" ON google_calendar_tokens FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_gcal_token" ON google_calendar_tokens;
CREATE POLICY "insert_own_gcal_token" ON google_calendar_tokens FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_gcal_token" ON google_calendar_tokens;
CREATE POLICY "update_own_gcal_token" ON google_calendar_tokens FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_gcal_token" ON google_calendar_tokens;
CREATE POLICY "delete_own_gcal_token" ON google_calendar_tokens FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
