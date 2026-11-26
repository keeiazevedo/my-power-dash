CREATE TABLE public.dashboard_auditoria (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 chave text NOT NULL,
 acao text NOT NULL CHECK (acao IN ('importacao','edicao','restauracao','anexo_enviado','anexo_removido')),
 editor_id uuid,
 editor_email text NOT NULL,
 detalhes jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.dashboard_auditoria TO authenticated;
GRANT ALL ON public.dashboard_auditoria TO service_role;
ALTER TABLE public.dashboard_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historico leitura editores" ON public.dashboard_auditoria FOR SELECT TO authenticated USING (public.is_editor());
CREATE INDEX dashboard_auditoria_chave_data ON public.dashboard_auditoria(chave, created_at DESC);
CREATE UNIQUE INDEX dashboard_auditoria_anexo_unico ON public.dashboard_auditoria(acao, (detalhes->>'path')) WHERE acao = 'anexo_enviado';
ALTER TABLE public.dashboard_dados ADD COLUMN audit_origem text NOT NULL DEFAULT 'importacao' CHECK (audit_origem IN ('importacao','edicao'));
CREATE FUNCTION public.auditar_dashboard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE anterior jsonb; novo jsonb; item jsonb; velho jsonb; campo text; mudancas jsonb := '[]'::jsonb; k text; origem text;
BEGIN
 k := CASE WHEN TG_OP = 'DELETE' THEN OLD.chave ELSE NEW.chave END;
 origem := CASE WHEN TG_OP = 'DELETE' THEN 'restauracao' ELSE NEW.audit_origem END;
 anterior := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE OLD.dados END;
 novo := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE NEW.dados END;
 IF origem = 'edicao' AND TG_OP = 'UPDATE' THEN
   FOR item IN SELECT value FROM jsonb_array_elements(coalesce(novo->'requisitos','[]'::jsonb)) WITH ORDINALITY AS r(value, idx) LOOP
     SELECT value INTO velho FROM jsonb_array_elements(coalesce(anterior->'requisitos','[]'::jsonb)) r(value) WHERE value->>'servico' = item->>'servico' AND value->>'unidade' = item->>'unidade' LIMIT 1;
     IF velho IS NOT NULL THEN
       FOREACH campo IN ARRAY ARRAY['ultimaExecucao','proximoVencimento','responsavel','unidade'] LOOP
         IF coalesce(velho->>campo,'') IS DISTINCT FROM coalesce(item->>campo,'') THEN
           mudancas := mudancas || jsonb_build_array(jsonb_build_object('servico',item->>'servico','unidade',item->>'unidade','campo',campo,'antes',velho->>campo,'depois',item->>campo));
         END IF;
       END LOOP;
     END IF;
   END LOOP;
 END IF;
 INSERT INTO public.dashboard_auditoria(chave,acao,editor_id,editor_email,detalhes) VALUES(k,origem,auth.uid(),coalesce(auth.jwt()->>'email','Sistema'),jsonb_build_object('campos',mudancas));
 RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION public.auditar_dashboard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER dashboard_historico AFTER INSERT OR UPDATE OR DELETE ON public.dashboard_dados FOR EACH ROW EXECUTE FUNCTION public.auditar_dashboard();
CREATE FUNCTION public.registrar_anexo_enviado(p_chave text, p_path text, p_label text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_editor() THEN RAISE EXCEPTION 'Sem permissão de edição'; END IF;
 IF p_chave !~ '^dashboard-adm-[0-9]{4}$' OR length(p_label) > 300 THEN RAISE EXCEPTION 'Anexo inválido'; END IF;
 IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='checklists-anexos' AND name=p_path AND owner_id=auth.uid()::text) THEN RAISE EXCEPTION 'Anexo não encontrado'; END IF;
 INSERT INTO public.dashboard_auditoria(chave,acao,editor_id,editor_email,detalhes) VALUES(p_chave,'anexo_enviado',auth.uid(),coalesce(auth.jwt()->>'email','Editor'),jsonb_build_object('path',p_path,'servico',p_label)) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.registrar_anexo_enviado(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_anexo_enviado(text,text,text) TO authenticated;