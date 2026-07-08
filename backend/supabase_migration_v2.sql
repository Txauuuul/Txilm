-- ============================================
-- Txilms v2 - Migration: Follows + Custom Lists
-- ============================================
-- EJECUTAR en Supabase SQL Editor:
--   Dashboard > SQL Editor > New Query > Pegar todo > Run
--
-- Nuevas tablas: follows, custom_lists, custom_list_items

-- 1. Sistema de seguimiento
CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 2. Listas personalizadas
CREATE TABLE IF NOT EXISTS custom_lists (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Items de listas personalizadas
CREATE TABLE IF NOT EXISTS custom_list_items (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  movie_title TEXT NOT NULL,
  movie_poster TEXT,
  movie_year TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, tmdb_id)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_custom_lists_user ON custom_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_list_items_list ON custom_list_items(list_id);

-- RLS (Row Level Security) - Follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all follows" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- RLS - Custom Lists
ALTER TABLE custom_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all custom lists" ON custom_lists
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own custom lists" ON custom_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom lists" ON custom_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom lists" ON custom_lists
  FOR DELETE USING (auth.uid() = user_id);

-- RLS - Custom List Items
ALTER TABLE custom_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all custom list items" ON custom_list_items
  FOR SELECT USING (true);

CREATE POLICY "Users can manage custom list items" ON custom_list_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM custom_lists
      WHERE custom_lists.id = custom_list_items.list_id
      AND custom_lists.user_id = auth.uid()
    )
  );
