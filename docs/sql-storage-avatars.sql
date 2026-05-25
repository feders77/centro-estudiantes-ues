-- ============================================================
-- Supabase Storage: bucket "avatars" + políticas RLS
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Crear el bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Política: cada usuario puede subir / actualizar solo su propia carpeta
CREATE POLICY "avatar_upload_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Política: cada usuario puede reemplazar (update) su propio avatar
CREATE POLICY "avatar_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Política: lectura pública (para mostrar el avatar en otros perfiles)
CREATE POLICY "avatar_read_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 5. Política: cada usuario puede borrar su propio avatar
CREATE POLICY "avatar_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
