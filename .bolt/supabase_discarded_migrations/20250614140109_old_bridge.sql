/*
  # Create diary entries table

  1. New Tables
    - `diary_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `date` (timestamptz)
      - `chat_messages` (jsonb)
      - `generated_entry` (text)
      - `emotion_primary` (text)
      - `emotion_intensity` (float)
      - `emotion_secondary` (text, nullable)
      - `emotion_color` (text)
      - `emotion_emoji` (text)
      - `photo` (text, nullable)
      - `summary` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `diary_entries` table
    - Add policies for authenticated users to manage their own entries
*/

CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  chat_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_entry text NOT NULL DEFAULT '',
  emotion_primary text NOT NULL DEFAULT 'reflection',
  emotion_intensity float NOT NULL DEFAULT 0.7 CHECK (emotion_intensity >= 0 AND emotion_intensity <= 1),
  emotion_secondary text,
  emotion_color text NOT NULL DEFAULT '#8B5CF6',
  emotion_emoji text NOT NULL DEFAULT '🤔',
  photo text,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own diary entries"
  ON diary_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diary entries"
  ON diary_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary entries"
  ON diary_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary entries"
  ON diary_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_diary_entries_emotion ON diary_entries(emotion_primary);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();