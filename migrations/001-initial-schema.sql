-- Migration 001: Initial Schema for FanCake Staging
-- Created: 2026-04-21
-- Strategy: Option B (Incremental migrations)
-- Priority: Performance > Maintainability > Costs
-- BASED ON REAL FANCAKE ANALYSIS: creator-first platform with media content, tips, memberships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================
-- CORE TABLES (REAL FANCAKE STRUCTURE)
-- ====================

-- Users/Profiles table (REAL: @username profiles with verification)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Supabase Auth reference
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile info (REAL: username @Admin, display_name FanCake)
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Assets (REAL: /assets/avatar/{size}/{filename})
  avatar_filename TEXT,
  cover_filename TEXT,
  
  bio TEXT,
  website TEXT,
  
  -- Creator status (REAL: verified badge, featured badge)
  is_creator BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Stats (REAL: follower counts visible)
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  
  -- Media counts (REAL: images, videos, audio counts shown)
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  audio_count INTEGER DEFAULT 0,
  
  -- Monetization (REAL: Stripe integration for tips/memberships)
  stripe_customer_id TEXT,
  stripe_account_id TEXT, -- For creator payouts
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Performance indexes
  CONSTRAINT valid_username CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$')
);

-- Performance indexes for profiles
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_creator ON profiles(is_creator) WHERE is_creator = TRUE;
CREATE INDEX idx_profiles_created ON profiles(created_at DESC);

-- ====================
-- MEDIA CONTENT TABLES (REAL FANCAKE: images, videos, audio)
-- ====================

-- Media/Content table (REAL: images, videos, audio content)
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Content metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Media type (REAL: images, videos, audio)
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'live_stream')),
  
  -- File info (REAL: assets/{type}/{size}/{filename})
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  duration INTEGER, -- seconds for video/audio
  
  -- Monetization (REAL: exclusive content, tips, memberships)
  is_exclusive BOOLEAN DEFAULT FALSE,
  is_free BOOLEAN DEFAULT TRUE,
  price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Access type (REAL: free, tip, subscription, membership)
  access_type VARCHAR(20) DEFAULT 'free' CHECK (access_type IN ('free', 'tip', 'subscription', 'membership')),
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'private', 'archived')),
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  tip_count INTEGER DEFAULT 0,
  tip_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED
);

-- Performance indexes for works
CREATE INDEX idx_works_creator ON works(creator_id);
CREATE INDEX idx_works_status ON works(status) WHERE status = 'published';
CREATE INDEX idx_works_published ON works(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_works_search ON works USING GIN(search_vector);
CREATE INDEX idx_works_slug ON works(slug);

-- ====================
-- MONETIZATION TABLES (REAL FANCAKE: tips, memberships, subscriptions)
-- ====================

-- Tips table (REAL: fans can tip creators)
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_id UUID REFERENCES media(id) ON DELETE SET NULL,
  
  -- Tip info
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  -- Stripe payment
  stripe_payment_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Memberships/Subscriptions table (REAL: monthly memberships)
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subscriber_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Membership plan
  plan_name VARCHAR(100) NOT NULL,
  plan_description TEXT,
  monthly_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Stripe subscription
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  
  -- Dates
  start_date TIMESTAMPTZ DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One active membership per creator-subscriber
  UNIQUE(creator_id, subscriber_id) WHERE status = 'active'
);

-- Private calls/streams bookings (REAL: private calls feature)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  fan_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Booking type (REAL: video call, audio call, live stream)
  booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('video_call', 'audio_call', 'live_stream')),
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Pricing
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'canceled', 'no_show')),
  
  -- Stripe payment
  stripe_payment_id TEXT,
  
  -- Meeting info
  meeting_url TEXT,
  meeting_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================
-- SOCIAL INTERACTIONS
-- ====================

-- Follow relationships
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Likes on media
CREATE TABLE likes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, media_id)
);

-- Comments on media
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social tables
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_likes_work ON likes(work_id);
CREATE INDEX idx_comments_work ON comments(work_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- ====================
-- MONETIZATION
-- ====================

-- Purchases/Transactions
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  
  -- Payment info
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  stripe_payment_id TEXT,
  stripe_customer_id TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- User reading progress
CREATE TABLE reading_progress (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  
  -- Progress tracking
  last_position INTEGER, -- character position
  completed BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, work_id, chapter_id)
);

-- Indexes for monetization
CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_work ON purchases(work_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);

-- ====================
-- AUDIT & UTILITY
-- ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON works FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- INITIAL DATA (optional)
-- ====================

-- Insert system user for automated actions
INSERT INTO profiles (id, username, email, display_name, is_creator) 
VALUES ('00000000-0000-0000-0000-000000000001', 'system', 'system@fancake.online', 'System', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ====================
-- MIGRATION NOTES
-- ====================
-- This is Migration 001 - Initial schema
-- Next migration: Row Level Security (RLS) policies
-- Following: Authentication setup (Option A)
-- Then: Deployment configuration (Option B)