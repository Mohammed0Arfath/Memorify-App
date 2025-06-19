/*
  # Create Agent System Tables

  1. New Tables
    - `agent_memories` - Store AI memories about user patterns, preferences, milestones, concerns
    - `agent_checkins` - Track proactive AI outreach messages and responses
    - `weekly_insights` - Automated weekly emotional analysis and growth tracking
    - `agent_settings` - User preferences for AI personality and behavior

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data

  3. Performance
    - Add indexes for efficient querying
    - Add updated_at trigger for agent_settings
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

-- Enable RLS for agent_memories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'agent_memories' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'Table agent_memories does not exist, skipping RLS';
  ELSE
    ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own agent memories" ON agent_memories;
  DROP POLICY IF EXISTS "Users can insert their own agent memories" ON agent_memories;
  DROP POLICY IF EXISTS "Users can update their own agent memories" ON agent_memories;
  DROP POLICY IF EXISTS "Users can delete their own agent memories" ON agent_memories;
END $$;

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

-- Enable RLS for agent_checkins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'agent_checkins' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'Table agent_checkins does not exist, skipping RLS';
  ELSE
    ALTER TABLE agent_checkins ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own agent checkins" ON agent_checkins;
  DROP POLICY IF EXISTS "Users can insert their own agent checkins" ON agent_checkins;
  DROP POLICY IF EXISTS "Users can update their own agent checkins" ON agent_checkins;
  DROP POLICY IF EXISTS "Users can delete their own agent checkins" ON agent_checkins;
END $$;

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

-- Enable RLS for weekly_insights
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'weekly_insights' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'Table weekly_insights does not exist, skipping RLS';
  ELSE
    ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own weekly insights" ON weekly_insights;
  DROP POLICY IF EXISTS "Users can insert their own weekly insights" ON weekly_insights;
  DROP POLICY IF EXISTS "Users can update their own weekly insights" ON weekly_insights;
  DROP POLICY IF EXISTS "Users can delete their own weekly insights" ON weekly_insights;
END $$;

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

-- Add unique constraint for user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'agent_settings_user_id_key'
  ) THEN
    ALTER TABLE agent_settings ADD CONSTRAINT agent_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Enable RLS for agent_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'agent_settings' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'Table agent_settings does not exist, skipping RLS';
  ELSE
    ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own agent settings" ON agent_settings;
  DROP POLICY IF EXISTS "Users can insert their own agent settings" ON agent_settings;
  DROP POLICY IF EXISTS "Users can update their own agent settings" ON agent_settings;
  DROP POLICY IF EXISTS "Users can delete their own agent settings" ON agent_settings;
END $$;

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

-- Create indexes for better performance (only if they don't exist)
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

-- Create updated_at trigger for agent_settings (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_agent_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_agent_settings_updated_at
      BEFORE UPDATE ON agent_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;