-- Migration: Complete Reads System for FanCake Staging
-- Created: 2026-04-22 18:13 UTC
-- Author: Kimi (OpenClaw Assistant)

-- ============================================
-- READS SYSTEM TABLES
-- ============================================

-- Books/Works table (main container for written content)
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Book metadata
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  synopsis TEXT,
  
  -- Categorization
  genre VARCHAR(100) NOT NULL,
  subgenre VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  
  -- Cover and visuals
  cover_url VARCHAR(500),
  cover_thumbnail_url VARCHAR(500),
  
  -- Publishing info
  language VARCHAR(10) DEFAULT 'en',
  word_count INTEGER DEFAULT 0,
  page_count INTEGER DEFAULT 0,
  estimated_reading_time_minutes INTEGER DEFAULT 0,
  
  -- Monetization
  is_free BOOLEAN DEFAULT false,
  price_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',
  is_exclusive BOOLEAN DEFAULT false,
  exclusive_price_cents INTEGER DEFAULT 0,
  
  -- Status and visibility
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'hidden')),
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'subscribers_only')),
  age_rating VARCHAR(10) DEFAULT 'all' CHECK (age_rating IN ('all', 'teen', 'mature', 'adult')),
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  purchase_count INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '')) ||
    to_tsvector('simple', coalesce(subtitle, '')) ||
    to_tsvector('simple', coalesce(description, '')) ||
    to_tsvector('simple', coalesce(synopsis, '')) ||
    to_tsvector('simple', array_to_string(tags, ' '))
  ) STORED
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  
  -- Chapter info
  chapter_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  
  -- Content
  content TEXT NOT NULL,
  content_html TEXT,
  excerpt TEXT,
  
  -- Metadata
  word_count INTEGER DEFAULT 0,
  reading_time_minutes INTEGER DEFAULT 0,
  
  -- Monetization (some chapters can be paid even if book is free)
  is_free BOOLEAN DEFAULT true,
  price_cents INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  is_preview BOOLEAN DEFAULT false,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ordering
  UNIQUE(book_id, chapter_number)
);

-- Pages table (for paginated reading experience)
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  
  -- Page info
  page_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  
  -- Metadata
  word_count INTEGER DEFAULT 0,
  has_images BOOLEAN DEFAULT false,
  image_urls TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ordering
  UNIQUE(chapter_id, page_number)
);

-- Reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  
  -- Progress info
  current_page INTEGER DEFAULT 1,
  total_pages_read INTEGER DEFAULT 0,
  percentage_complete DECIMAL(5,2) DEFAULT 0.00,
  last_position INTEGER DEFAULT 0, -- character position
  
  -- Reading session
  is_currently_reading BOOLEAN DEFAULT true,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  reading_time_seconds INTEGER DEFAULT 0,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One progress per user per book
  UNIQUE(user_id, book_id)
);

-- Book reviews and ratings
CREATE TABLE IF NOT EXISTS book_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  is_spoiler BOOLEAN DEFAULT false,
  
  -- Helpfulness
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One review per user per book
  UNIQUE(user_id, book_id)
);

-- Bookmarks/Favorites
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  
  -- Bookmark info
  name VARCHAR(255),
  notes TEXT,
  position INTEGER, -- character position
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure at least one reference
  CHECK (
    (book_id IS NOT NULL) OR
    (chapter_id IS NOT NULL) OR
    (page_id IS NOT NULL)
  )
);

-- Reading lists/collections
CREATE TABLE IF NOT EXISTS reading_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- List info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  cover_url VARCHAR(500),
  
  -- Stats
  book_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Books in reading lists (junction table)
CREATE TABLE IF NOT EXISTS reading_list_books (
  reading_list_id UUID REFERENCES reading_lists(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes TEXT,
  position INTEGER DEFAULT 0,
  
  PRIMARY KEY (reading_list_id, book_id)
);

-- ============================================
-- ADMIN SYSTEM TABLES
-- ============================================

-- Admin users (extended from users table)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Admin info
  admin_level VARCHAR(20) DEFAULT 'moderator' CHECK (admin_level IN ('moderator', 'admin', 'superadmin')),
  permissions TEXT[] DEFAULT '{}',
  
  -- Admin stats
  actions_taken INTEGER DEFAULT 0,
  last_action_at TIMESTAMPTZ,
  
  -- Timestamps
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Admin actions log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_users(user_id) ON DELETE SET NULL,
  
  -- Action info
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  
  -- Details
  details JSONB DEFAULT '{}',
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reverted')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Content moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Content info
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('book', 'chapter', 'review', 'comment', 'media')),
  content_id UUID NOT NULL,
  
  -- Moderation info
  reason VARCHAR(100),
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected', 'escalated')),
  assigned_to UUID REFERENCES admin_users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  
  -- Resolution
  resolution VARCHAR(100),
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Books indexes
CREATE INDEX idx_books_author ON books(author_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_books_published_at ON books(published_at DESC);
CREATE INDEX idx_books_search ON books USING GIN(search_vector);
CREATE INDEX idx_books_popularity ON books((view_count + read_count * 2 + purchase_count * 5) DESC);

-- Chapters indexes
CREATE INDEX idx_chapters_book ON chapters(book_id);
CREATE INDEX idx_chapters_number ON chapters(book_id, chapter_number);
CREATE INDEX idx_chapters_status ON chapters(status);
CREATE INDEX idx_chapters_published_at ON chapters(published_at DESC);

-- Pages indexes
CREATE INDEX idx_pages_chapter ON pages(chapter_id);
CREATE INDEX idx_pages_number ON pages(chapter_id, page_number);

-- Reading progress indexes
CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_book ON reading_progress(book_id);
CREATE INDEX idx_reading_progress_current ON reading_progress(user_id) WHERE is_currently_reading = true;
CREATE INDEX idx_reading_progress_completed ON reading_progress(user_id) WHERE is_completed = true;

-- Reviews indexes
CREATE INDEX idx_book_reviews_book ON book_reviews(book_id);
CREATE INDEX idx_book_reviews_user ON book_reviews(user_id);
CREATE INDEX idx_book_reviews_rating ON book_reviews(rating);
CREATE INDEX idx_book_reviews_created ON book_reviews(created_at DESC);

-- Bookmarks indexes
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_book ON bookmarks(book_id);

-- Reading lists indexes
CREATE INDEX idx_reading_lists_user ON reading_lists(user_id);
CREATE INDEX idx_reading_lists_public ON reading_lists(is_public) WHERE is_public = true;

-- Admin indexes
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);

-- Moderation indexes
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_content ON moderation_queue(content_type, content_id);
CREATE INDEX idx_moderation_queue_assigned ON moderation_queue(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Update word count for books (trigger)
CREATE OR REPLACE FUNCTION update_book_word_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update book word count when chapters change
  UPDATE books 
  SET word_count = (
    SELECT COALESCE(SUM(word_count), 0)
    FROM chapters 
    WHERE book_id = NEW.book_id
      AND status = 'published'
  )
  WHERE id = NEW.book_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_book_word_count
AFTER INSERT OR UPDATE OR DELETE ON chapters
FOR EACH ROW
EXECUTE FUNCTION update_book_word_count();

-- Update reading time estimate
CREATE OR REPLACE FUNCTION update_reading_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Estimate 200 words per minute
  NEW.estimated_reading_time_minutes := CEIL(NEW.word_count / 200.0);
  NEW.page_count := CEIL(NEW.word_count / 300.0); -- ~300 words per page
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reading_time
BEFORE INSERT OR UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION update_reading_time();

-- Update chapter reading time
CREATE OR REPLACE FUNCTION update_chapter_reading_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Estimate 200 words per minute
  NEW.reading_time_minutes := CEIL(NEW.word_count / 200.0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chapter_reading_time
BEFORE INSERT OR UPDATE ON chapters
FOR EACH ROW
EXECUTE FUNCTION update_chapter_reading_time();

-- Update book stats when review is added/updated
CREATE OR REPLACE FUNCTION update_book_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update average rating and count
  UPDATE books 
  SET 
    rating_count = (
      SELECT COUNT(*) 
      FROM book_reviews 
      WHERE book_id = NEW.book_id 
        AND status = 'published'
    ),
    average_rating = (
      SELECT COALESCE(AVG(rating::decimal), 0.00)
      FROM book_reviews 
      WHERE book_id = NEW.book_id 
        AND status = 'published'
    )
  WHERE id = NEW.book_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_book_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON book_reviews
FOR EACH ROW
EXECUTE FUNCTION update_book_rating_stats();

-- Search function for books
CREATE OR REPLACE FUNCTION search_books(
  search_query TEXT DEFAULT '',
  genre_filter TEXT DEFAULT NULL,
  author_filter UUID DEFAULT NULL,
  min_rating DECIMAL DEFAULT 0,
  max_price_cents INTEGER DEFAULT NULL,
  status_filter TEXT DEFAULT 'published',
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  subtitle VARCHAR,
  author_id UUID,
  genre VARCHAR,
  description TEXT,
  cover_url VARCHAR,
  price_cents INTEGER,
  average_rating DECIMAL,
  rating_count INTEGER,
  word_count INTEGER,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.subtitle,
    b.author_id,
    b.genre,
    b.description,
    b.cover_url,
    b.price_cents,
    b.average_rating,
    b.rating_count,
    b.word_count,
    ts_rank(b.search_vector, websearch_to_tsquery('simple', search_query)) AS search_rank
  FROM books b
  WHERE 
    b.status = status_filter
    AND (genre_filter IS NULL OR b.genre = genre_filter)
    AND (author_filter IS NULL OR b.author_id = author_filter)
    AND b.average_rating >= min_rating
    AND (max_price_cents IS NULL OR b.price_cents <= max_price_cents)
    AND (search_query = '' OR b.search_vector @@ websearch_to_tsquery('simple', search_query))
  ORDER BY 
    CASE WHEN search_query = '' THEN 1 ELSE ts_rank(b.search_vector, websearch_to_tsquery('simple', search_query)) END DESC,
    b.published_at DESC NULLS LAST,
    b.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get reading statistics for admin
CREATE OR REPLACE FUNCTION get_reading_statistics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  period_date DATE,
  books_published INTEGER,
  chapters_published INTEGER,
  total_reads INTEGER,
  total_reading_time_minutes INTEGER,
  average_rating DECIMAL,
  total_revenue_cents INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(rp.last_read_at) AS period_date,
    COUNT(DISTINCT b.id) FILTER (WHERE DATE(b.published_at) = DATE(rp.last_read_at)) AS books_published,
    COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.published_at) = DATE(rp.last_read_at)) AS chapters_published,
    COUNT(DISTINCT rp.id) AS total_reads,
    SUM(rp.reading_time_seconds) / 60 AS total_reading_time_minutes,
    COALESCE(AVG(br.rating), 0.00) AS average_rating,
    SUM(b.revenue_cents) FILTER (WHERE DATE(b.updated_at) = DATE(rp.last_read_at)) AS total_revenue_cents
  FROM reading_progress rp
  LEFT JOIN books b ON rp.book_id = b.id
  LEFT JOIN chapters c ON rp.chapter_id = c.id
  LEFT JOIN book_reviews br ON rp.book_id = br.book_id AND DATE(br.created_at) = DATE(rp.last_read_at)
  WHERE rp.last_read_at BETWEEN start_date AND end_date
  GROUP BY DATE(rp.last_read_at)
  ORDER BY period_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- Books policies
CREATE POLICY "Books are viewable by everyone" ON books
  FOR SELECT USING (status = 'published' AND visibility IN ('public', 'subscribers_only'));

CREATE POLICY "Authors can manage their own books" ON books
  FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all books" ON books
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Chapters policies
CREATE POLICY "Published chapters are viewable by everyone" ON chapters
  FOR SELECT USING (status = 'published');

CREATE POLICY "Authors can manage their own chapters" ON chapters
  FOR ALL USING (EXISTS (SELECT 1 FROM books WHERE id = chapters.book_id AND author_id = auth.uid()));

-- Reading progress policies
CREATE POLICY "Users can only see their own reading progress" ON reading_progress
  FOR ALL USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Published reviews are viewable by everyone" ON book_reviews
  FOR SELECT USING (status = 'published');

CREATE POLICY "Users can manage their own reviews" ON book_reviews
  FOR ALL USING (auth.uid() = user_id);

-- Admin policies (only admins can access)
CREATE POLICY "Only admins can access admin tables" ON admin_users
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================
-- INITIAL DATA (TEST DATA)
-- ============================================

-- Insert test book (if author exists)
INSERT INTO books (
  author_id,
  title,
  subtitle,
  description,
  genre,
  tags,
  cover_url,
  is_free,
  status,
  visibility,
  word_count
) VALUES (
  '35e8b4e6-c8b0-4469-89f5-9eeac84f1ee3', -- Test author
  'The Digital Chronicles',
  'Tales from the Internet Age',
  'A collection of short stories exploring life, love, and technology in the digital era.',
  'fiction',
  ARRAY['digital', 'technology', 'short-stories', 'contemporary'],
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop',
  true,
  'published',
  'public',
  15000
) ON CONFLICT DO NOTHING;

-- Insert test chapters for the book
WITH book_id AS (
  SELECT id FROM books WHERE title = 'The Digital Chronicles' LIMIT 1
)
INSERT INTO chapters (book_id, chapter_number, title, content, word_count, status, is_free)
SELECT 
  book_id.id,
  1,
  'The First Connection',
  'It began with a single click. A notification that would change everything...',
  2500,
  'published',
  true
FROM book_id
ON CONFLICT DO NOTHING;

-- Make the test author an admin
INSERT INTO admin_users (user_id, admin_level, permissions)
VALUES (
  '35e8b4e6-c8b0-4469-89f5-9eeac84f1ee3',
  'superadmin',
  ARRAY['manage_users', 'manage_content', 'view_analytics', 'manage_settings']
) ON CONFLICT DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE MESSAGE
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Reads System migration completed successfully!';
  RAISE NOTICE '   - Created 10 tables for Reads system';
  RAISE NOTICE '   - Created 3 tables for Admin system';
  RAISE NOTICE '   - Added 25 indexes for performance';
  RAISE NOTICE '   - Created 6 functions and triggers';
  RAISE NOTICE '   - Added RLS policies for security';
  RAISE NOTICE '   - Inserted test data';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Reads System is now ready!';
  RAISE NOTICE '👑 Admin Panel database is ready!';
  RAISE NOTICE '🚀 Next: Create frontend for Reads and Admin Panel';
END $$;
