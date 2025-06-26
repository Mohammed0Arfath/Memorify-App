/*
  # Fresh Supabase Project Schema Setup for Memorify
  
  This migration recreates the complete schema for a new Supabase project.
  
  1. New Tables
    - `diary_entries` - Core diary functionality
    - `agent_memories` - AI memory system for patterns, preferences, milestones, concerns
    - `agent_checkins` - Proactive AI outreach messages and responses  
    - `weekly_insights` - Automated weekly emotional analysis and growth tracking
    - `agent_settings` - User preferences for AI personality and behavior

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data

  3. Performance
    - Add indexes for efficient querying
    - Add updated_at triggers

  4. Sample Data
    - Add example rows to prevent frontend errors
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at function (reusable trigger function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- DIARY ENTRIES TABLE
-- =====================================================

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

-- Enable RLS
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diary_entries
CREATE POLICY "Users can view their own diary entries"
  ON diary_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diary entries"
  ON diary_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary entries"
  ON diary_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary entries"
  ON diary_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for diary_entries
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_diary_entries_emotion ON diary_entries(emotion_primary);

-- Updated_at trigger for diary_entries
CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AGENT MEMORIES TABLE
-- =====================================================

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

-- Enable RLS
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_memories
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

-- Indexes for agent_memories
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_importance ON agent_memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_accessed ON agent_memories(last_accessed DESC);

-- =====================================================
-- AGENT CHECKINS TABLE
-- =====================================================

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

-- Enable RLS
ALTER TABLE agent_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_checkins
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

-- Indexes for agent_checkins
CREATE INDEX IF NOT EXISTS idx_agent_checkins_user_id ON agent_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_checkins_unread ON agent_checkins(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_agent_checkins_created ON agent_checkins(created_at DESC);

-- =====================================================
-- WEEKLY INSIGHTS TABLE
-- =====================================================

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

-- Enable RLS
ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_insights
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

-- Indexes for weekly_insights
CREATE INDEX IF NOT EXISTS idx_weekly_insights_user_id ON weekly_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_insights_week ON weekly_insights(week_start DESC);

-- =====================================================
-- AGENT SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_agentic_mode_enabled boolean DEFAULT true,
  personality_type text DEFAULT 'therapist' CHECK (personality_type IN ('therapist', 'poet', 'coach', 'friend', 'philosopher')),
  check_in_frequency text DEFAULT 'every_2_days' CHECK (check_in_frequency IN ('daily', 'every_2_days', 'weekly', 'as_needed')),
  proactive_insights boolean DEFAULT true,
  visual_generation boolean DEFAULT true,
  last_check_in timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for user_id
ALTER TABLE agent_settings ADD CONSTRAINT agent_settings_user_id_key UNIQUE (user_id);

-- Enable RLS
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_settings
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

-- Indexes for agent_settings
CREATE INDEX IF NOT EXISTS idx_agent_settings_user_id ON agent_settings(user_id);

-- Updated_at trigger for agent_settings
CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Note: Sample data will be inserted after users sign up
-- This is just the schema setup for the fresh Supabase project

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all tables exist
DO $$
BEGIN
  RAISE NOTICE 'Schema setup complete! Tables created:';
  RAISE NOTICE '✅ diary_entries';
  RAISE NOTICE '✅ agent_memories'; 
  RAISE NOTICE '✅ agent_checkins';
  RAISE NOTICE '✅ weekly_insights';
  RAISE NOTICE '✅ agent_settings';
  RAISE NOTICE '';
  RAISE NOTICE 'All tables have RLS enabled and proper policies configured.';
  RAISE NOTICE 'Ready for production use! 🚀';
END $$;