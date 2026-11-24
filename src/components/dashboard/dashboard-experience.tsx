import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const ExperienceContext = createContext({ dark: false, presenting: false, toggleDark: () => {}, togglePresentation: async () => {} });

export function DashboardExperience({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dashboard-theme-dark", dark);
    return () => document.documentElement.classList.remove("dashboard-theme-dark");
  }, [dark]);
  useEffect(() => {
    const fullscreen = () => { if (!document.fullscreenElement) setPresenting(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setPresenting(false); };
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("fullscreenchange", fullscreen); document.removeEventListener("keydown", escape); };
  }, []);
  async function togglePresentation() {
    if (presenting) {
      setPresenting(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } else {
      setPresenting(true);
      await root.current?.requestFullscreen?.().catch(() => {});
    }
  }
  return <ExperienceContext.Provider value={{ dark, presenting, toggleDark: () => setDark(v => !v), togglePresentation }}><div ref={root} className={`dashboard-live bg-background text-foreground ${presenting ? "dashboard-presenting" : ""}`}>{children}</div></ExperienceContext.Provider>;
}

export function DashboardDisplayControls() {
  const { dark, presenting, toggleDark, togglePresentation } = useContext(ExperienceContext);
  return <div className="dashboard-display-controls no-print flex flex-wrap items-center gap-2">
    <Button variant="outline" size="icon" onClick={toggleDark} aria-label={dark ? "Tema claro" : "Tema escuro"} title={dark ? "Tema claro" : "Tema escuro"}>{dark ? <Sun /> : <Moon />}</Button>
    <Button variant="outline" onClick={togglePresentation}>{presenting ? <Minimize2 /> : <Maximize2 />}{presenting ? "Sair da apresentação" : "Apresentar"}</Button>
  </div>;
}