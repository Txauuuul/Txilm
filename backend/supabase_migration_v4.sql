-- ============================================
-- Txilms v4 - Migration: Collaborative Lists
-- ============================================
-- EJECUTAR en Supabase SQL Editor:
--   Dashboard > SQL Editor > New Query > Pegar todo > Run

-- 1. Flag de lista colaborativa
ALTER TABLE custom_lists ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT FALSE;

-- 2. Editores de listas colaborativas
CREATE TABLE IF NOT EXISTS collaborative_list_editors (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_editors_list ON collaborative_list_editors(list_id);
CREATE INDEX IF NOT EXISTS idx_collab_editors_user ON collaborative_list_editors(user_id);

-- RLS - Collaborative List Editors
ALTER TABLE collaborative_list_editors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all editors" ON collaborative_list_editors
  FOR SELECT USING (true);

CREATE POLICY "List owners can manage editors" ON collaborative_list_editors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM custom_lists
      WHERE custom_lists.id = collaborative_list_editors.list_id
      AND custom_lists.user_id = auth.uid()
    )
  );
