/*
# Fix task-reminders cron job auth header

1. Scheduled Jobs
- Unschedule the previous task-reminders job (jobid 1) that had a placeholder auth header.
- Reschedule with the correct anon key in both the Authorization Bearer and apikey headers,
  which the Supabase functions gateway requires even when JWT verification is disabled.

2. Security
- No RLS changes. The anon key is public and only grants access permitted by RLS policies;
  the edge function itself uses the service role key from its own env to write notifications.
*/

SELECT cron.unschedule('task-reminders-every-15min');

SELECT cron.schedule(
  'task-reminders-every-15min',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://mdsrbvwzmoumoyfmjpzo.supabase.co/functions/v1/task-reminders',
      headers := '{
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3Jidnd6bW91bW95Zm1qcHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjcwNTksImV4cCI6MjA5NzcwMzA1OX0.s_0FEoVypn_1GIxZm8-NNbHqWm89niqQn7sosqqXaW8",
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3Jidnd6bW91bW95Zm1qcHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjcwNTksImV4cCI6MjA5NzcwMzA1OX0.s_0FEoVypn_1GIxZm8-NNbHqWm89niqQn7sosqqXaW8"
      }'::jsonb
    );
  $$
);
