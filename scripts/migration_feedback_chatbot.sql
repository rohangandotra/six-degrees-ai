-- Complete Migration: Create feedback table with AI categorization support
-- Run this in Supabase SQL Editor

-- Step 1: Create the feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_text TEXT NOT NULL,
  feedback_type TEXT DEFAULT 'general' CHECK (feedback_type IN ('bug', 'feature', 'general', 'praise')),
  page_context TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- AI categorization columns
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT,
  ai_summary TEXT,
  posthog_session_id TEXT,
  notified_at TIMESTAMPTZ
);

-- Step 2: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_severity ON public.feedback(severity);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);

-- Create index for querying unnotified critical feedback
CREATE INDEX IF NOT EXISTS idx_feedback_urgent_unnotified 
ON public.feedback(severity, notified_at) 
WHERE severity IN ('high', 'critical') AND notified_at IS NULL;

-- Step 3: Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow users to view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Step 5: Add comments for documentation
COMMENT ON TABLE public.feedback IS 'User feedback submissions with AI categorization';
COMMENT ON COLUMN public.feedback.severity IS 'AI-determined severity: low, medium, high, critical';
COMMENT ON COLUMN public.feedback.category IS 'AI-determined category: bug, feature, usability, performance, security, praise, other';
COMMENT ON COLUMN public.feedback.ai_summary IS 'AI-generated one-line summary of the feedback';
COMMENT ON COLUMN public.feedback.posthog_session_id IS 'PostHog session ID for session replay';
COMMENT ON COLUMN public.feedback.notified_at IS 'Timestamp when admin was notified about this feedback';
