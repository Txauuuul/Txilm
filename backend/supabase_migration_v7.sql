-- ============================================
-- Txilms v7: Corregir columna rating para decimales
-- ============================================
-- PROBLEMA: La columna `rating` en user_lists es INTEGER,
-- pero el frontend envía puntuaciones decimales (ej: 7.3).
-- PostgREST rechaza valores como 7.3 para columnas INTEGER,
-- lo que impide guardar películas como "vistas" con puntuación.
--
-- SOLUCIÓN: Cambiar el tipo de rating a NUMERIC(3,1) para
-- soportar valores decimales de 0.1 a 10.0.
--
-- EJECUTAR en Supabase SQL Editor:
--   Dashboard > SQL Editor > New Query > Pegar todo > Run

-- 1. Eliminar el CHECK constraint existente
ALTER TABLE user_lists DROP CONSTRAINT IF EXISTS user_lists_rating_check;

-- 2. Cambiar tipo de columna de INTEGER a NUMERIC(3,1)
ALTER TABLE user_lists ALTER COLUMN rating TYPE NUMERIC(3,1) USING rating::NUMERIC(3,1);

-- 3. Añadir nuevo CHECK constraint que soporte decimales
ALTER TABLE user_lists ADD CONSTRAINT user_lists_rating_check
    CHECK (rating IS NULL OR (rating >= 0.1 AND rating <= 10.0));

-- ============================================
-- ✅ Listo. Ahora las puntuaciones decimales (0.1 - 10.0)
-- se guardan correctamente en la base de datos.
-- ============================================
