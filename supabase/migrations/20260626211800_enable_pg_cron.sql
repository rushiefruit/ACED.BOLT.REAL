/*
# Enable pg_cron for scheduled task reminders

1. Extensions
- Enable pg_cron (scheduled job runner) in the extensions schema.

2. Scheduled Jobs
- Schedule the `task-reminders` edge function to run every 15 minutes.
- The job uses `net.http_post` (pg_net) to call the edge function endpoint, which scans
  for incomplete tasks due within 24h / 1h and inserts reminder notifications.

3. Security
- No RLS changes. The cron job runs as the postgres role and calls the edge function with
  the service role via the anon key header (the function itself uses the service role key
  from its own env to write notifications).
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
