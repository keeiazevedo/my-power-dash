CREATE TABLE public.dashboard_dados (
  chave text PRIMARY KEY,
  dados jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dashboard_dados TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_dados TO authenticated;
GRANT ALL ON public.dashboard_dados TO service_role;
ALTER TABLE public.dashboard_dados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dashboard leitura publica" ON public.dashboard_dados FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dashboard editores inserem" ON public.dashboard_dados FOR INSERT TO authenticated WITH CHECK (public.is_editor());
CREATE POLICY "dashboard editores atualizam" ON public.dashboard_dados FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());
CREATE POLICY "dashboard editores removem" ON public.dashboard_dados FOR DELETE TO authenticated USING (public.is_editor());