/*
# Create Notes Digestor tables

1. New Tables
   - `notes` — stores uploaded notes with extracted OCR text and metadata
     - `id` (uuid, PK)
     - `user_id` (uuid, FK → profiles.id)
     - `title` (text) — user-given or auto-generated name
     - `original_filename` (text) — name of uploaded file
     - `file_url` (text, nullable) — URL of stored file (image/PDF)
     - `raw_text` (text, nullable) — OCR-extracted plain text
     - `summary` (text, nullable) — AI-generated summary
     - `status` (text) — 'uploading' | 'processing' | 'ready' | 'error'
     - `created_at` (timestamptz)

   - `flashcards` — AI-generated flashcards linked to a note
     - `id` (uuid, PK)
     - `note_id` (uuid, FK → notes.id, CASCADE)
     - `user_id` (uuid, FK → profiles.id)
     - `front` (text) — question / term
     - `back` (text) — answer / definition
     - `created_at` (timestamptz)

   - `note_messages` — chat history per note (Q&A)
     - `id` (uuid, PK)
     - `note_id` (uuid, FK → notes.id, CASCADE)
     - `user_id` (uuid, FK → profiles.id)
     - `role` (text) — 'user' | 'assistant'
     - `content` (text)
     - `created_at` (timestamptz)

2. Security
   - RLS enabled on all three tables.
   - Owner-scoped CRUD (auth.uid() = user_id) for authenticated users.
*/

-- notes
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Note',
  original_filename text,
  file_url text,
  raw_text text,
  summary text,
  status text NOT NULL DEFAULT 'uploading',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON notes;
CREATE POLICY "select_own_notes" ON notes FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notes" ON notes;
CREATE POLICY "insert_own_notes" ON notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON notes;
CREATE POLICY "update_own_notes" ON notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notes" ON notes;
CREATE POLICY "delete_own_notes" ON notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_flashcards" ON flashcards;
CREATE POLICY "select_own_flashcards" ON flashcards FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_flashcards" ON flashcards;
CREATE POLICY "insert_own_flashcards" ON flashcards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_flashcards" ON flashcards;
CREATE POLICY "update_own_flashcards" ON flashcards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_flashcards" ON flashcards;
CREATE POLICY "delete_own_flashcards" ON flashcards FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- note_messages
CREATE TABLE IF NOT EXISTS note_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE note_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_note_messages" ON note_messages;
CREATE POLICY "select_own_note_messages" ON note_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_note_messages" ON note_messages;
CREATE POLICY "insert_own_note_messages" ON note_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_note_messages" ON note_messages;
CREATE POLICY "delete_own_note_messages" ON note_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
