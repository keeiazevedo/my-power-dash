CREATE OR REPLACE FUNCTION public.auditar_dashboard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE anterior jsonb; novo jsonb; r record; item jsonb; velho jsonb; campo text; mudancas jsonb := '[]'::jsonb; k text; origem text;
BEGIN
 k := CASE WHEN TG_OP = 'DELETE' THEN OLD.chave ELSE NEW.chave END;
 origem := CASE WHEN TG_OP = 'DELETE' THEN 'restauracao' ELSE NEW.audit_origem END;
 anterior := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE OLD.dados END;
 novo := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE NEW.dados END;
 IF origem = 'edicao' AND TG_OP = 'UPDATE' THEN
   FOR r IN SELECT value, idx FROM jsonb_array_elements(coalesce(novo->'requisitos','[]'::jsonb)) WITH ORDINALITY AS a(value, idx) LOOP
     item := r.value;
     velho := anterior->'requisitos'->(r.idx::integer - 1);
     IF velho IS NOT NULL AND velho->>'servico' = item->>'servico' THEN
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