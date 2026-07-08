-- ============================================
-- Txilms v3 - Migration: Reviews + Genres
-- ============================================
-- EJECUTAR en Supabase SQL Editor:
--   Dashboard > SQL Editor > New Query > Pegar todo > Run
--
-- Cambios: añadir columna review a user_lists, columna genre_ids

-- 1. Añadir campo review (mini-reseña de 280 chars)
ALTER TABLE user_lists ADD COLUMN IF NOT EXISTS review TEXT;

-- 2. Añadir campo genre_ids para estadísticas de géneros
ALTER TABLE user_lists ADD COLUMN IF NOT EXISTS genre_ids TEXT;

-- Índice para buscar reviews
CREATE INDEX IF NOT EXISTS idx_user_lists_review ON user_lists(user_id) WHERE review IS NOT NULL;
