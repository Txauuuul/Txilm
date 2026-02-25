-- ============================================
-- Txilms Social - Database Migration
-- ============================================
-- EJECUTAR en Supabase SQL Editor:
--   Dashboard > SQL Editor > New Query > Pegar todo > Run
--
-- Crea las tablas para el sistema social:
--   profiles, invite_codes, user_lists, movie_shares, notifications

-- 1. Profiles (vinculada a Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Códigos de invitación
CREATE TABLE IF NOT EXISTS invite_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- 3. Listas de películas de usuario (reemplaza localStorage)
CREATE TABLE IF NOT EXISTS user_lists (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  list_type TEXT NOT NULL CHECK (list_type IN ('favorite', 'watchlist', 'watched')),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
  movie_title TEXT NOT NULL,
  movie_poster TEXT,
  movie_year TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tmdb_id, list_type)
);

-- 4. Envío de películas entre usuarios
CREATE TABLE IF NOT EXISTS movie_shares (
  id SERIAL PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  movie_title TEXT NOT NULL,
  movie_poster TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_user_id UUID REFERENCES profiles(id),
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_user_lists_user ON user_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lists_tmdb ON user_lists(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_shares_to_user ON movie_shares(to_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_invite_code ON invite_codes(code);

-- Generar 10 códigos de invitación iniciales
INSERT INTO invite_codes (code) VALUES
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6))),
  ('TXILMS-' || upper(substr(md5(random()::text), 1, 6)));
