-- Upload de capa (covers/{barbershop_id}.ext) e foto do barbeiro (avatars/{member_id}.ext).
-- O bucket só tinha política pra products/, então o painel recebia 403 nesses dois.
-- upsert do Storage precisa de INSERT + SELECT + UPDATE.

CREATE OR REPLACE FUNCTION public.storage_asset_owner_ok(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE (storage.foldername(p_name))[1]
    WHEN 'covers' THEN
      split_part(storage.filename(p_name), '.', 1) IN (
        SELECT id::text FROM public.my_admin_barbershop_ids() AS id
      )
    WHEN 'avatars' THEN
      split_part(storage.filename(p_name), '.', 1) IN (
        SELECT m.id::text FROM public.barbershop_members m
        WHERE m.barbershop_id IN (SELECT public.my_admin_barbershop_ids())
           OR m.user_id = auth.uid()
      )
    ELSE false
  END
$$;

REVOKE EXECUTE ON FUNCTION public.storage_asset_owner_ok(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_asset_owner_ok(text) TO authenticated;

CREATE POLICY "team uploads cover and avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'barbershop-assets' AND public.storage_asset_owner_ok(name));

CREATE POLICY "team reads cover and avatar" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'barbershop-assets' AND public.storage_asset_owner_ok(name));

CREATE POLICY "team updates cover and avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'barbershop-assets' AND public.storage_asset_owner_ok(name))
  WITH CHECK (bucket_id = 'barbershop-assets' AND public.storage_asset_owner_ok(name));

CREATE POLICY "team deletes cover and avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'barbershop-assets' AND public.storage_asset_owner_ok(name));
