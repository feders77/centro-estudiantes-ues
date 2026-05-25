-- =============================================================================
-- sql-votos-server.sql  (versión corregida — migra tabla existente)
-- Registra un voto por usuario por votacion, garantizado por UNIQUE constraint.
-- =============================================================================

-- Borra la tabla vieja si existe con estructura incorrecta y la recrea limpia
DROP TABLE IF EXISTS votos;

CREATE TABLE votos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  votacion_id uuid        NOT NULL REFERENCES votaciones(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  opcion_id   text        NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE(votacion_id, user_id)
);

CREATE INDEX votos_user_idx ON votos(user_id);

ALTER TABLE votos ENABLE ROW LEVEL SECURITY;

-- Los usuarios ven y gestionan solo sus propios votos
CREATE POLICY "votos_select_own" ON votos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "votos_insert_own" ON votos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votos_update_own" ON votos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Los admins ven todos
CREATE POLICY "votos_admin_select" ON votos FOR SELECT TO authenticated
  USING (is_admin());
