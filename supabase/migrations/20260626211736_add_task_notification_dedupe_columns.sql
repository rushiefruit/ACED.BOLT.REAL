/*
# Add notification dedupe columns to tasks

1. Modified Tables
- `tasks`
  - `notified_24h` (boolean, default false) — set true once the 24-hour-before notification has been sent
  - `notified_1h` (boolean, default false) — set true once the 1-hour-before notification has been sent

2. Purpose
- The scheduled reminder edge function scans for incomplete tasks whose due_date is within
  the next 24 hours (or 1 hour). To avoid sending duplicate notifications on every run, it flips
  these flags to true after inserting a notification, and only selects rows where the flag is false.
- Existing rows default to false, so they become eligible for notifications on the next run.

3. Security
- No RLS changes. These columns are only written by the service-role key inside the edge function
  and read/written by the owning user through existing task policies.
*/

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS notified_24h boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_1h boolean NOT NULL DEFAULT false;
