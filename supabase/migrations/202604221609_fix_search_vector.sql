-- Migration 002: Fix search_vector generated column issue
-- Created: 2026-04-22
-- Problem: GENERATED ALWAYS AS columns cause stack overflow in Supabase
-- Solution: Replace with nullable column + trigger

-- ====================
-- DROP GENERATED COLUMNS
-- ====================

-- Media table: drop generated column, add nullable column
ALTER TABLE media DROP COLUMN IF EXISTS search_vector;
ALTER TABLE media ADD COLUMN search_vector TSVECTOR;

-- Users table: drop generated column, add nullable column  
ALTER TABLE users DROP COLUMN IF EXISTS search_vector;
ALTER TABLE users ADD COLUMN search_vector TSVECTOR;

-- ====================
-- CREATE TRIGGER FUNCTIONS
-- ====================

-- Function to update media search_vector
CREATE OR REPLACE FUNCTION update_media_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.tags, '{}'), ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update users search_vector
CREATE OR REPLACE FUNCTION update_users_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', coalesce(NEW.username, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.display_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.bio, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- CREATE TRIGGERS
-- ====================

-- Media trigger
DROP TRIGGER IF EXISTS media_search_vector_trigger ON media;
CREATE TRIGGER media_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, tags
  ON media
  FOR EACH ROW
  EXECUTE FUNCTION update_media_search_vector();

-- Users trigger  
DROP TRIGGER IF EXISTS users_search_vector_trigger ON users;
CREATE TRIGGER users_search_vector_trigger
  BEFORE INSERT OR UPDATE OF username, display_name, bio
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_search_vector();

-- ====================
-- UPDATE EXISTING DATA
-- ====================

-- Update existing media records
UPDATE media SET 
  title = COALESCE(title, ''),
  description = COALESCE(description, ''),
  tags = COALESCE(tags, '{}')
WHERE search_vector IS NULL;

-- Update existing user records
UPDATE users SET
  username = COALESCE(username, ''),
  display_name = COALESCE(display_name, ''),
  bio = COALESCE(bio, '')
WHERE search_vector IS NULL;

-- ====================
-- UPDATE SEARCH FUNCTION
-- ====================

-- Update search_media function to work with nullable search_vector
CREATE OR REPLACE FUNCTION search_media(
  search_query TEXT DEFAULT NULL,
  media_type_filter VARCHAR(20) DEFAULT NULL,
  user_id_filter UUID DEFAULT NULL,
  exclusive_filter BOOLEAN DEFAULT NULL,
  limit_val INTEGER DEFAULT 20,
  offset_val INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  title VARCHAR(255),
  description TEXT,
  media_type VARCHAR(20),
  filename TEXT,
  status VARCHAR(20),
  published_at TIMESTAMPTZ,
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.title,
    m.description,
    m.media_type,
    m.filename,
    m.status,
    m.published_at,
    m.view_count,
    m.like_count,
    m.comment_count,
    CASE 
      WHEN search_query IS NOT NULL AND m.search_vector IS NOT NULL 
      THEN ts_rank(m.search_vector, to_tsquery('simple', replace(search_query, ' ', ' & ')))
      ELSE 0.0
    END AS search_rank
  FROM media m
  WHERE
    m.status = 'published'
    AND (search_query IS NULL OR m.search_vector IS NULL OR m.search_vector @@ to_tsquery('simple', replace(search_query, ' ', ' & ')))
    AND (media_type_filter IS NULL OR m.media_type = media_type_filter)
    AND (user_id_filter IS NULL OR m.user_id = user_id_filter)
    AND (exclusive_filter IS NULL OR m.is_exclusive = exclusive_filter)
  ORDER BY
    CASE WHEN search_query IS NOT NULL THEN search_rank ELSE 0 END DESC,
    m.published_at DESC NULLS LAST,
    m.view_count DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Fixed: search_vector columns now use triggers instead of GENERATED ALWAYS AS' AS message;
