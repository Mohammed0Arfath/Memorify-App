/*
  # Create Agent System Tables

  1. New Tables
    - `agent_memories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `memory_type` (text) - pattern, preference, milestone, concern
      - `content` (text) - the memory content
      - `emotional_context` (jsonb) - associated emotions
      - `importance_score` (float) - 0-1 relevance score
      - `created_at` (timestamptz)
      - `last_accessed` (timestamptz)
      - `access_count` (integer)

    - `agent_checkins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `trigger_type` (text) - inactivity, emotional_pattern, milestone, scheduled
      - `message` (text) - the check-in message
      - `emotional_context` (text) - context for the check-in
      - `is_read` (boolean)
      - `created_at` (timestamptz)
      - `responded_at` (timestamptz)

    - `weekly_insights`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `week_start` (timestamptz)
      - `week_end` (timestamptz)
      - `dominant_emotions` (jsonb)
      - `emotion_distribution` (jsonb)
      - `key_themes` (jsonb)
      - `growth_observations` (jsonb)
      - `recommended_actions` (jsonb)
      - `mood_trend` (text) - improving, declining, stable
      - `generated_visual_prompt` (text)
      - `created_at` (timestamptz)

    - `agent_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `is_agentic_mode_enabled` (boolean)
      - `personality_type` (text) - therapist, poet, coach, friend, philosopher
      - `check_in_frequency` (text) - daily, every_2_days, weekly, as_needed
      - `proactive_insights` (boolean)
      - `visual_generation` (boolean)
      - `last_check_in` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Agent Memories Table
CREATE TABLE IF NOT EXISTS agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type text NOT NULL CHECK (memory_type IN ('pattern', 'preference', 'milestone', 'concern')),
  content text NOT NULL,
  emotional_context jsonb DEFAULT '[]'::jsonb,
  importance_score float NOT NULL DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  created_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  access_count integer DEFAULT 0
);

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent memories"
  ON agent_memories FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent memories"
  ON agent_memories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent memories"
  ON agent_memories FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent memories"
  ON agent_memories FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Agent Check-ins Table
CREATE TABLE IF NOT EXISTS agent_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('inactivity', 'emotional_pattern', 'milestone', 'scheduled')),
  message text NOT NULL,
  emotional_context text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE agent_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent checkins"
  ON agent_checkins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent checkins"
  ON agent_checkins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent checkins"
  ON agent_checkins FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent checkins"
  ON agent_checkins FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Weekly Insights Table
CREATE TABLE IF NOT EXISTS weekly_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start timestamptz NOT NULL,
  week_end timestamptz NOT NULL,
  dominant_emotions jsonb DEFAULT '[]'::jsonb,
  emotion_distribution jsonb DEFAULT '{}'::jsonb,
  key_themes jsonb DEFAULT '[]'::jsonb,
  growth_observations jsonb DEFAULT '[]'::jsonb,
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  mood_trend text CHECK (mood_trend IN ('improving', 'declining', 'stable')),
  generated_visual_prompt text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly insights"
  ON weekly_insights FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly insights"
  ON weekly_insights FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly insights"
  ON weekly_insights FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly insights"
  ON weekly_insights FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Agent Settings Table
CREATE TABLE IF NOT EXISTS agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_agentic_mode_enabled boolean DEFAULT true,
  personality_type text DEFAULT 'therapist' CHECK (personality_type IN ('therapist', 'poet', 'coach', 'friend', 'philosopher')),
  check_in_frequency text DEFAULT 'every_2_days' CHECK (check_in_frequency IN ('daily', 'every_2_days', 'weekly', 'as_needed')),
  proactive_insights boolean DEFAULT true,
  visual_generation boolean DEFAULT true,
  last_check_in timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent settings"
  ON agent_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent settings"
  ON agent_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent settings"
  ON agent_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent settings"
  ON agent_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_importance ON agent_memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_accessed ON agent_memories(last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_agent_checkins_user_id ON agent_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_checkins_unread ON agent_checkins(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_agent_checkins_created ON agent_checkins(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_insights_user_id ON weekly_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_insights_week ON weekly_insights(week_start DESC);

CREATE INDEX IF NOT EXISTS idx_agent_settings_user_id ON agent_settings(user_id);

-- Create updated_at trigger for agent_settings
CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();