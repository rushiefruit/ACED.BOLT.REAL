/*
# Remove XP system tables and columns

1. Removed Database Objects
- `xp_transactions` table — dropped entirely. This table stored XP reward transactions
  (amount, reason, source) that were summed to compute user levels. The XP system has been
  removed from the application; this table is no longer referenced by any code.
- `tasks.xp_reward` column — dropped. This column held the XP amount awarded for completing
  a task. No longer referenced.

2. Security
- No RLS policy changes needed (the table is being removed entirely).

3. Important Notes
- This is a user-requested removal of the entire XP/gamification system.
- The `xp_transactions` table and `xp_reward` column contained only XP-related data with no
  other purpose, so dropping them does not affect tasks, events, subjects, or any other data.
- The leaderboard now ranks users by completed task count instead of XP.
*/

DROP TABLE IF EXISTS xp_transactions;

ALTER TABLE tasks DROP COLUMN IF EXISTS xp_reward;
