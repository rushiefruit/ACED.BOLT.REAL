/*
# Schedule task-reminders edge function via pg_cron

1. Scheduled Jobs
- Create a pg_cron job that runs every 15 minutes.
- The job calls the `task-reminders` edge function via pg_net's http_post.
- The edge function scans for incomplete tasks due within 24h and 1h, inserts reminder
  notifications into the notifications table, and flips dedupe flags on the tasks.

2. Security
- No RLS changes. The cron job runs as the postgres superuser role and posts to the edge
  function endpoint with the anon key (the function uses its own service role key internally).
*/

SELECT cron.schedule(
  'task-reminders-every-15min',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://mdsrbvwzmoumoyfmjpzo.supabase.co/functions/v1/task-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder"}'::jsonb
    );
  $$
);
