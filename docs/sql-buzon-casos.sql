-- =============================================================================
-- sql-buzon-casos.sql
-- Tabla `buzon_casos` para el seguimiento publico de casos del buzon de
-- sugerencias. Lectura publica para todos; escritura restringida a admins.
--
-- Requisitos previos:
--   - Funcion `is_admin()` definida como SECURITY DEFINER
--
-- Instrucciones: ejecutar en el SQL Editor de Supabase.
-- =============================================================================

CREATE TABLE IF NOT EXISTS buzon_casos (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  numero          text        NOT NULL UNIQUE,
  titulo          text        NOT NULL,
  descripcion     text        NOT NULL,
  estado          text        NOT NULL DEFAULT 'recibido'
                              CHECK (estado IN ('recibido','gestion','resuelto')),
  categoria       text        NOT NULL DEFAULT 'Otro',
  agradecimientos int         NOT NULL DEFAULT 0,
  dias_gestion    int         NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE buzon_casos ENABLE ROW LEVEL SECURITY;

-- anyone can read public cases
CREATE POLICY "casos_read_public" ON buzon_casos FOR SELECT TO public USING (true);

-- only admins can write
CREATE POLICY "casos_admin_insert" ON buzon_casos FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "casos_admin_update" ON buzon_casos FOR UPDATE TO authenticated
  USING (is_admin());
CREATE POLICY "casos_admin_delete" ON buzon_casos FOR DELETE TO authenticated
  USING (is_admin());
