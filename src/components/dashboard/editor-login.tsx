import { useState } from "react";
import { Lock, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/hooks/use-editor";

const G = <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>;

type Variante = "padrao" | "sutil" | "linha";

export function EditorLogin({ variant = "padrao" }: { variant?: Variante }) {
  const { session, isEditor, ready } = useEditor();
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  if (!ready) return null;

  const sair = () => supabase.auth.signOut();

  if (session) {
    if (variant === "linha") {
      return (
        <span className="no-print inline-flex items-center gap-1 text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
          <ShieldCheck className={`h-3 w-3 ${isEditor ? "text-primary" : ""}`} />
          {isEditor ? "Editor" : "Sem permissão"}
          <button type="button" onClick={sair} className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground">
            <LogOut className="h-2.5 w-2.5" />Sair
          </button>
        </span>
      );
    }
    return (
      <div className="no-print flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className={`h-4 w-4 ${isEditor ? "text-primary" : ""}`} />
        {isEditor ? "Editor" : "Sem permissão de edição"} • {session.user.email}
        <Button size="sm" variant="ghost" onClick={sair}><LogOut className="h-3.5 w-3.5" />Sair</Button>
      </div>
    );
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setMsg("E-mail ou senha incorretos."); else setOpen(false);
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } });
      setMsg(error ? "Não foi possível criar a conta." : "Enviamos um link de confirmação para o seu e-mail.");
    }
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg("Não foi possível entrar com Google.");
    else if (!r.redirected) setOpen(false);
  };

  const gatilho =
    variant === "linha" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Entrar para editar"
        className="no-print presentation-tools inline-flex items-center gap-1 text-[10px] font-medium normal-case tracking-normal text-muted-foreground/80 transition-colors hover:text-foreground"
      >
        <Lock className="h-3 w-3" />
        Entrar
      </button>
    ) : variant === "sutil" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print inline-flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Lock className="h-3 w-3" />
        Entrar para editar
      </button>
    ) : (
      <Button size="sm" variant="outline" className="no-print" onClick={() => setOpen(true)}><LogIn className="h-3.5 w-3.5" />Entrar para editar</Button>
    );

  return (
    <>
      {gatilho}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{modo === "entrar" ? "Entrar para editar" : "Criar conta"}</DialogTitle>
            <DialogDescription>Só e-mails liberados como editores podem anexar e remover arquivos.</DialogDescription>
          </DialogHeader>
          <button type="button" onClick={google} className="flex h-10 w-full items-center justify-center gap-[10px] rounded-md border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]">{G}Continuar com Google</button>
          <form onSubmit={enviar} className="space-y-2">
            <Input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" required minLength={6} placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
            {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
            <Button type="submit" className="w-full">{modo === "entrar" ? "Entrar" : "Criar conta"}</Button>
          </form>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setMsg(""); }}>
            {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
