-- ==============================================================
-- DRIP SCHEMA — Applicalo dal Supabase Dashboard → SQL Editor
-- ==============================================================

-- 🔥 1. Tabella principale: drops
CREATE TABLE IF NOT EXISTS drops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  drop_type TEXT NOT NULL CHECK (drop_type IN ('snapshot','capsule','page','portal','echo','box','moment')),
  title TEXT,
  description TEXT,
  content TEXT,
  media_url TEXT,
  media_thumb TEXT,
  media_size BIGINT,
  media_mime TEXT,
  link_url TEXT,
  link_preview JSONB,
  tags TEXT[] DEFAULT '{}',
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_nsfw BOOLEAN DEFAULT false,
  location JSONB,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','archived','draft','flagged')),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  dropped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔥 2. Indici
CREATE INDEX IF NOT EXISTS idx_drops_user_id ON drops(user_id);
CREATE INDEX IF NOT EXISTS idx_drops_drop_type ON drops(drop_type);
CREATE INDEX IF NOT EXISTS idx_drops_tags ON drops USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_drops_created_at ON drops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drops_dropped_at ON drops(dropped_at DESC);
CREATE INDEX IF NOT EXISTS idx_drops_status ON drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_featured ON drops(is_featured) WHERE is_featured = true;

-- 🔥 3. Full-text search
ALTER TABLE drops ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
CREATE INDEX IF NOT EXISTS idx_drops_search ON drops USING GIN(search_vector);

CREATE OR REPLACE FUNCTION drops_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_drops_search ON drops;
CREATE TRIGGER trg_drops_search
  BEFORE INSERT OR UPDATE ON drops
  FOR EACH ROW EXECUTE FUNCTION drops_search_update();

-- 🔥 4. Reazioni emoji
CREATE TABLE IF NOT EXISTS drop_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID REFERENCES drops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drop_id, user_id, emoji)
);

-- 🔥 5. Commenti
CREATE TABLE IF NOT EXISTS drop_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID REFERENCES drops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES drop_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔥 6. Bookmarks
CREATE TABLE IF NOT EXISTS drop_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID REFERENCES drops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drop_id, user_id)
);

-- 🔥 7. AI tag suggestion logging
CREATE TABLE IF NOT EXISTS drop_tag_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID REFERENCES drops(id) ON DELETE CASCADE NOT NULL,
  suggested_tags TEXT[] DEFAULT '{}',
  user_accepted TEXT[] DEFAULT '{}',
  user_added TEXT[] DEFAULT '{}',
  model_used TEXT,
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔥 8. Segnalazioni
CREATE TABLE IF NOT EXISTS drop_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID REFERENCES drops(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔥 9. RPC per like
CREATE OR REPLACE FUNCTION increment_like(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE drops SET like_count = like_count + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- 🔥 10. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ✅ Fatto! Ora refresh e vai su /drip/
