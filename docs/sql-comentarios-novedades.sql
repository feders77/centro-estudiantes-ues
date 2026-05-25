-- ============================================================
-- Tabla de comentarios en novedades + RLS
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE novedades_comentarios (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  novedad_id uuid        NOT NULL REFERENCES novedades(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  texto      text        NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 500),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- índice para acelerar la carga por novedad
CREATE INDEX ON novedades_comentarios (novedad_id, created_at);

-- RLS
ALTER TABLE novedades_comentarios ENABLE ROW LEVEL SECURITY;

-- cualquiera puede leer (incluso sin login)
CREATE POLICY "comentarios_leer"
ON novedades_comentarios FOR SELECT
TO public USING (true);

-- solo usuarios autenticados pueden insertar su propio comentario
CREATE POLICY "comentarios_insertar_propio"
ON novedades_comentarios FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- cada quien borra el suyo; admins borran cualquiera
CREATE POLICY "comentarios_borrar"
ON novedades_comentarios FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR is_admin());
