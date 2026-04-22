-- Simplified Reads System Migration
-- Apply this via Supabase SQL Editor

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  genre VARCHAR(100) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cover_url VARCHAR(500),
  is_free BOOLEAN DEFAULT false,
  price_cents INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  visibility VARCHAR(20) DEFAULT 'public',
  view_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  published_at TIMESTAMPTZ
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_free BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'draft',
  word_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(book_id, chapter_number)
);

-- Reading progress
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  current_page INTEGER DEFAULT 1,
  percentage_complete DECIMAL(5,2) DEFAULT 0.00,
  is_currently_reading BOOLEAN DEFAULT true,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, book_id)
);

-- Book reviews
CREATE TABLE IF NOT EXISTS book_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  helpful_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, book_id)
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  name VARCHAR(255),
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  admin_level VARCHAR(20) DEFAULT 'moderator',
  permissions TEXT[] DEFAULT '{}',
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Admin actions log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_users(user_id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  reason VARCHAR(100),
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to UUID REFERENCES admin_users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_books_author ON books(author_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_chapters_book ON chapters(book_id);
CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX idx_book_reviews_book ON book_reviews(book_id);
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);

-- Insert test admin (using existing test user)
INSERT INTO admin_users (user_id, admin_level, permissions) 
VALUES ('35e8b4e6-c8b0-4469-89f5-9eeac84f1ee3', 'superadmin', 
        ARRAY['manage_users', 'manage_content', 'view_analytics', 'manage_settings'])
ON CONFLICT DO NOTHING;

-- Insert test book
INSERT INTO books (
  author_id,
  title,
  description,
  genre,
  tags,
  is_free,
  status,
  visibility,
  word_count
) VALUES (
  '35e8b4e6-c8b0-4469-89f5-9eeac84f1ee3',
  'The Digital Chronicles',
  'A collection of short stories exploring life in the digital era.',
  'fiction',
  ARRAY['digital', 'technology', 'short-stories'],
  true,
  'published',
  'public',
  15000
) ON CONFLICT DO NOTHING;

-- Insert test chapter
WITH book_id AS (
  SELECT id FROM books WHERE title = 'The Digital Chronicles' LIMIT 1
)
INSERT INTO chapters (book_id, chapter_number, title, content, word_count, status)
SELECT 
  book_id.id,
  1,
  'The First Connection',
  'It began with a single click. A notification that would change everything...',
  2500,
  'published'
FROM book_id
ON CONFLICT DO NOTHING;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Reads System migration completed successfully!';
  RAISE NOTICE '   - Created 7 tables for Reads system';
  RAISE NOTICE '   - Created 3 tables for Admin system';
  RAISE NOTICE '   - Added 6 indexes for performance';
  RAISE NOTICE '   - Inserted test data';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Reads System is now ready!';
  RAISE NOTICE '👑 Admin Panel database is ready!';
END $$;
