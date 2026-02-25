-- ============================================
-- Txilms - Migración SQL para Supabase
-- ============================================
-- Ejecuta este SQL en el SQL Editor de Supabase
-- (Dashboard > SQL Editor > New Query)
--
-- Crea la tabla de caché para las puntuaciones
-- scrapeadas de Rotten Tomatoes y FilmAffinity.
-- ============================================

-- 1. Crear la tabla de caché
CREATE TABLE IF NOT EXISTS score_cache (
    cache_key   TEXT PRIMARY KEY,
    data        JSONB NOT NULL,
    created_at  DOUBLE PRECISION NOT NULL
);

-- 2. Índice para limpiar entradas expiradas eficientemente
CREATE INDEX IF NOT EXISTS idx_score_cache_created_at
    ON score_cache (created_at);

-- 3. Comentario descriptivo
COMMENT ON TABLE score_cache IS
    'Caché de puntuaciones scrapeadas (RT + FA). TTL = 7 días.';

-- 4. Habilitar Row Level Security (recomendado por Supabase)
--    Permitimos acceso total desde service_role (backend).
ALTER TABLE score_cache ENABLE ROW LEVEL SECURITY;

-- Política: permitir todo al service_role (usado por el backend)
CREATE POLICY "Backend full access" ON score_cache
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- ✅ Listo. La tabla está preparada.
-- ============================================
