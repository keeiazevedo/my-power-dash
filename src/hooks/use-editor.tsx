import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type EditorState = { session: Session | null; isEditor: boolean; ready: boolean };
const Ctx = createContext<EditorState>({ session: null, isEditor: false, ready: false });

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EditorState>({ session: null, isEditor: false, ready: false });
  useEffect(() => {
    const check = async (session: Session | null) => {
      if (!session) return setState({ session: null, isEditor: false, ready: true });
      const { data } = await supabase.rpc("is_editor");
      setState({ session, isEditor: data === true, ready: true });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => check(s), 0); });
    supabase.auth.getSession().then(({ data }) => check(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
export const useEditor = () => useContext(Ctx);
