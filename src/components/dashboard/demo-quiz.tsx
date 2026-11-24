import { useEffect, useState } from "react";
import { Check, RotateCcw, Star, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUESTIONS = [
  { q: "Qual exame confirma que o colaborador segue apto para a função?", options: ["ASO Periódico", "Atestado médico", "CAT"], answer: 0 },
  { q: "O que deve ser emitido após um acidente de trabalho?", options: ["Ação PQV", "CAT", "Chamado administrativo"], answer: 1 },
  { q: "Qual atitude mais ajuda a reduzir o absenteísmo?", options: ["Ignorar sintomas leves", "Prevenção e acompanhamento de saúde", "Trabalhar sem pausas"], answer: 1 },
  { q: "O que é recomendado em longos períodos sentado?", options: ["Pausas e alongamento", "Postura curvada", "Não beber água"], answer: 0 },
];
const TIME = 15;

export function DemoQuiz() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(TIME);
  const done = i >= QUESTIONS.length;
  const cur = QUESTIONS[i];

  useEffect(() => {
    if (done || picked !== null) return;
    if (time <= 0) { setPicked(-1); return; }
    const t = setTimeout(() => setTime((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [time, picked, done]);

  function choose(o: number) {
    if (picked !== null || !cur) return;
    setPicked(o);
    if (o === cur.answer) setScore((s) => s + 1);
  }
  function next() { setI((v) => v + 1); setPicked(null); setTime(TIME); }
  function restart() { setI(0); setPicked(null); setScore(0); setTime(TIME); }

  return (
    <section aria-labelledby="quiz-title" className="relative overflow-hidden rounded-lg border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="quiz-title" className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="size-5 text-primary" /> Desafio do Mês · Quiz do Gestor
        </h2>
        {!done && <span className="text-xs text-muted-foreground">Pergunta {i + 1} de {QUESTIONS.length} · Pontos: {score}</span>}
      </div>
      {done ? (
        <div className="mt-6 text-center">
          {score === QUESTIONS.length && (
            <div aria-hidden className="quiz-confetti">
              {Array.from({ length: 30 }).map((_, k) => (
                <span key={k} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 10) * 0.12}s`, background: k % 2 ? "var(--primary)" : "var(--chart-2, #EAA921)" }} />
              ))}
            </div>
          )}
          <div className="flex justify-center gap-1">
            {QUESTIONS.map((_, k) => (
              <Star key={k} className={`size-8 ${k < score ? "fill-primary text-primary quiz-pop" : "text-muted-foreground"}`} style={{ animationDelay: `${k * 0.15}s` }} />
            ))}
          </div>
          <p className="mt-3 text-2xl font-semibold">{score} de {QUESTIONS.length} acertos</p>
          <p className="text-sm text-muted-foreground">{score === QUESTIONS.length ? "Gabaritou! Parabéns!" : "Bom trabalho! Tente de novo para gabaritar."}</p>
          <Button className="mt-4" onClick={restart}><RotateCcw /> Jogar novamente</Button>
        </div>
      ) : cur && (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded bg-muted">
            <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${(time / TIME) * 100}%` }} />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">{time}s</p>
          <p className="mt-2 text-base font-medium">{cur.q}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {cur.options.map((o, k) => {
              const right = picked !== null && k === cur.answer;
              const wrong = picked === k && k !== cur.answer;
              return (
                <Button key={k} variant="outline" disabled={picked !== null}
                  className={`h-auto justify-between whitespace-normal py-3 text-left disabled:opacity-100 ${right ? "border-primary bg-primary/10 quiz-pop" : ""} ${wrong ? "border-destructive bg-destructive/10 quiz-shake" : ""}`}
                  onClick={() => choose(k)}>
                  {o}{right && <Check className="text-primary" />}{wrong && <X className="text-destructive" />}
                </Button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm" role="status">{picked === cur.answer ? "Acertou!" : picked === -1 ? "Tempo esgotado!" : "Não foi dessa vez."}</p>
              <Button onClick={next}>{i + 1 < QUESTIONS.length ? "Próxima" : "Ver resultado"}</Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
