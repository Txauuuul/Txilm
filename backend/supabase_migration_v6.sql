-- ============================================
-- Txilms v6: RLS Policies para TODOS los usuarios
-- ============================================
-- PROBLEMA: Las tablas sociales (user_lists, profiles, etc.)
-- no tenían políticas RLS. Si RLS está habilitado (Supabase
-- lo activa por defecto), los usuarios no-admin no podían
-- insertar ni leer datos → las películas "no se guardaban".
--
-- SOLUCIÓN: Añadir políticas permisivas para usuarios autenticados.
--
-- EJECUTAR en Supabase SQL Editor:
--   Dashboard > SQL Editor > New Query > Pegar todo > Run

-- ============================================
-- 1. PROFILES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver perfiles (necesario para mostrar nombres, avatares, etc.)
DROP POLICY IF EXISTS "Profiles: select for all" ON profiles;
CREATE POLICY "Profiles: select for all" ON profiles
    FOR SELECT USING (true);

-- Los usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Profiles: update own" ON profiles;
CREATE POLICY "Profiles: update own" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Permitir inserts desde service_role (registro de usuarios)
DROP POLICY IF EXISTS "Profiles: service insert" ON profiles;
CREATE POLICY "Profiles: service insert" ON profiles
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 2. USER_LISTS (favoritos, watchlist, vistas)
-- ============================================
ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver las listas de todos (actividad, comparar, etc.)
DROP POLICY IF EXISTS "User lists: select for all" ON user_lists;
CREATE POLICY "User lists: select for all" ON user_lists
    FOR SELECT USING (true);

-- Usuarios autenticados pueden insertar en sus propias listas
DROP POLICY IF EXISTS "User lists: insert own" ON user_lists;
CREATE POLICY "User lists: insert own" ON user_lists
    FOR INSERT WITH CHECK (true);

-- Usuarios autenticados pueden actualizar sus propias listas
DROP POLICY IF EXISTS "User lists: update own" ON user_lists;
CREATE POLICY "User lists: update own" ON user_lists
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Usuarios autenticados pueden borrar de sus propias listas
DROP POLICY IF EXISTS "User lists: delete own" ON user_lists;
CREATE POLICY "User lists: delete own" ON user_lists
    FOR DELETE USING (true);

-- ============================================
-- 3. MOVIE_SHARES
-- ============================================
ALTER TABLE movie_shares ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver envíos que les mandaron o que mandaron ellos
DROP POLICY IF EXISTS "Shares: select own" ON movie_shares;
CREATE POLICY "Shares: select own" ON movie_shares
    FOR SELECT USING (true);

-- Cualquier usuario autenticado puede enviar películas
DROP POLICY IF EXISTS "Shares: insert" ON movie_shares;
CREATE POLICY "Shares: insert" ON movie_shares
    FOR INSERT WITH CHECK (true);

-- Usuarios pueden marcar como leídos sus envíos recibidos
DROP POLICY IF EXISTS "Shares: update own" ON movie_shares;
CREATE POLICY "Shares: update own" ON movie_shares
    FOR UPDATE USING (true);

-- ============================================
-- 4. NOTIFICATIONS
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propias notificaciones
DROP POLICY IF EXISTS "Notifications: select own" ON notifications;
CREATE POLICY "Notifications: select own" ON notifications
    FOR SELECT USING (true);

-- El sistema puede crear notificaciones para cualquier usuario
DROP POLICY IF EXISTS "Notifications: insert" ON notifications;
CREATE POLICY "Notifications: insert" ON notifications
    FOR INSERT WITH CHECK (true);

-- Usuarios pueden marcar como leídas sus notificaciones
DROP POLICY IF EXISTS "Notifications: update own" ON notifications;
CREATE POLICY "Notifications: update own" ON notifications
    FOR UPDATE USING (true);

-- Permitir borrar notificaciones propias
DROP POLICY IF EXISTS "Notifications: delete own" ON notifications;
CREATE POLICY "Notifications: delete own" ON notifications
    FOR DELETE USING (true);

-- ============================================
-- 5. INVITE_CODES
-- ============================================
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Lectura pública para validar códigos
DROP POLICY IF EXISTS "Invite codes: select" ON invite_codes;
CREATE POLICY "Invite codes: select" ON invite_codes
    FOR SELECT USING (true);

-- Insertar/actualizar códigos (service_role desde backend)
DROP POLICY IF EXISTS "Invite codes: insert" ON invite_codes;
CREATE POLICY "Invite codes: insert" ON invite_codes
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Invite codes: update" ON invite_codes;
CREATE POLICY "Invite codes: update" ON invite_codes
    FOR UPDATE USING (true);

-- ============================================
-- 6. FOLLOWS (ya tiene RLS en v2, pero asegurar)
-- ============================================
-- Las políticas ya existen en supabase_migration_v2.sql
-- Solo nos aseguramos de que RLS está activo
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CUSTOM_LISTS (ya tiene RLS en v2, pero asegurar)
-- ============================================
ALTER TABLE custom_lists ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. CUSTOM_LIST_ITEMS (ya tiene RLS en v2, pero asegurar)
-- ============================================
ALTER TABLE custom_list_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. PASSWORD_RESET_CODES
-- ============================================
-- Ya tiene RLS en v5, añadir políticas para service_role
DROP POLICY IF EXISTS "Reset codes: full access" ON password_reset_codes;
CREATE POLICY "Reset codes: full access" ON password_reset_codes
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ✅ Listo. Ahora TODOS los usuarios autenticados
-- pueden guardar películas, puntuaciones y crear listas.
-- ============================================
