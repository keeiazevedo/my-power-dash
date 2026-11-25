CREATE TABLE public.editores (email text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.editores TO service_role;
ALTER TABLE public.editores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.editores WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
REVOKE ALL ON FUNCTION public.is_editor() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated;

DROP POLICY IF EXISTS "anexos checklists envio" ON storage.objects;
CREATE POLICY "anexos checklists envio editores" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'checklists-anexos' AND public.is_editor());