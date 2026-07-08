-- ============================================
-- Txilms v5: Códigos de recuperación de contraseña
-- ============================================
-- Los admins generan códigos temporales para que un usuario
-- pueda resetear su contraseña sin necesidad de email.

CREATE TABLE IF NOT EXISTS password_reset_codes (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    target_user TEXT NOT NULL,              -- username del usuario destinatario
    created_by  UUID REFERENCES profiles(id),  -- admin que lo creó
    created_at  TIMESTAMPTZ DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,       -- expira tras X horas
    used_at     TIMESTAMPTZ,                -- null = no usado
    CONSTRAINT code_not_empty CHECK (code <> '')
);

-- Índice para búsquedas rápidas por código + usuario
CREATE INDEX IF NOT EXISTS idx_reset_codes_lookup
    ON password_reset_codes(code, target_user);

-- RLS: solo service_role puede acceder
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;
