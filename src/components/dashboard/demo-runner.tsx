import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ClipboardCheck,
  Gamepad2,
  Pause,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const GAME_HEIGHT = 360;
const FLOOR = 286;
const PLAYER_WIDTH = 42;
const PLAYER_HEIGHT = 68;
const GRAVITY = 2200;
const JUMP_SPEED = 820;
const RECORD_KEY = "demo-corrida-bravante-recorde";

type GameStatus = "ready" | "running" | "paused" | "over";

type Obstacle = { x: number; y: number; width: number; height: number };
type Collectible = { x: number; y: number; collected: boolean; phase: number };
type Popup = { x: number; y: number; life: number };

type World = {
  width: number;
  playerY: number;
  velocityY: number;
  grounded: boolean;
  obstacles: Obstacle[];
  items: Collectible[];
  popups: Popup[];
  elapsed: number;
  distance: number;
  bonus: number;
  collected: number;
  speed: number;
  spawnIn: number;
  seed: number;
};

function createWorld(width = 960): World {
  return {
    width,
    playerY: FLOOR - PLAYER_HEIGHT,
    velocityY: 0,
    grounded: true,
    obstacles: [],
    items: [],
    popups: [],
    elapsed: 0,
    distance: 0,
    bonus: 0,
    collected: 0,
    speed: 340,
    spawnIn: 1.5,
    seed: 2026,
  };
}

function playerX(world: World) {
  return Math.min(128, world.width * 0.22);
}

function score(world: World) {
  return Math.floor(world.distance) + world.bonus;
}

function random(world: World) {
  world.seed = (world.seed * 1664525 + 1013904223) >>> 0;
  return world.seed / 4294967296;
}

function jump(world: World) {
  if (!world.grounded) return;
  world.velocityY = -JUMP_SPEED;
  world.grounded = false;
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function updateWorld(world: World, dt: number) {
  world.elapsed += dt;
  world.speed = Math.min(590, 340 + world.elapsed * 7);
  world.distance += (world.speed * dt) / 18;

  world.velocityY += GRAVITY * dt;
  world.playerY += world.velocityY * dt;
  if (world.playerY >= FLOOR - PLAYER_HEIGHT) {
    world.playerY = FLOOR - PLAYER_HEIGHT;
    world.velocityY = 0;
    world.grounded = true;
  }

  world.spawnIn -= dt;
  if (world.spawnIn <= 0) {
    const height = 44 + random(world) * 28;
    const x = world.width + 30;
    world.obstacles.push({ x, y: FLOOR - height, width: 34, height });
    if (random(world) > 0.25) {
      world.items.push({
        x: x + 155,
        y: FLOOR - 154,
        collected: false,
        phase: random(world) * Math.PI * 2,
      });
    }
    world.spawnIn = 1.12 + random(world) * 0.62;
  }

  for (const obstacle of world.obstacles) obstacle.x -= world.speed * dt;
  for (const item of world.items) item.x -= world.speed * dt;
  for (const popup of world.popups) {
    popup.y -= 34 * dt;
    popup.life -= dt;
  }

  const player = {
    x: playerX(world) + 7,
    y: world.playerY + 5,
    width: PLAYER_WIDTH - 14,
    height: PLAYER_HEIGHT - 8,
  };

  for (const item of world.items) {
    if (
      !item.collected &&
      overlaps(player, { x: item.x, y: item.y, width: 30, height: 36 })
    ) {
      item.collected = true;
      world.bonus += 25;
      world.collected += 1;
      world.popups.push({ x: item.x, y: item.y, life: 0.8 });
    }
  }

  world.obstacles = world.obstacles.filter((o) => o.x + o.width > -20);
  world.items = world.items.filter((item) => !item.collected && item.x > -40);
  world.popups = world.popups.filter((popup) => popup.life > 0);

  return world.obstacles.some((obstacle) =>
    overlaps(player, {
      x: obstacle.x + 6,
      y: obstacle.y + 5,
      width: obstacle.width - 12,
      height: obstacle.height - 5,
    }),
  );
}

function palette(canvas: HTMLCanvasElement) {
  const styles = getComputedStyle(canvas);
  const value = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    card: value("--card", "#ffffff"),
    foreground: value("--foreground", "#17352b"),
    muted: value("--muted", "#f0f4f1"),
    mutedForeground: value("--muted-foreground", "#64766e"),
    border: value("--border", "#dfe7e2"),
    primary: value("--brand-green", "#007A4D"),
    primaryLight: value("--brand-green-45", "#87C3A9"),
    secondary: value("--brand-yellow", "#EAA921"),
    gray: value("--brand-gray", "#B6B6B6"),
  };
}

function drawClipboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: ReturnType<typeof palette>,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = colors.secondary;
  ctx.shadowBlur = 14;
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.roundRect(0, 3, 30, 33, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors.card;
  ctx.fillRect(5, 9, 20, 22);
  ctx.fillStyle = colors.primary;
  ctx.beginPath();
  ctx.roundRect(9, 0, 12, 7, 3);
  ctx.fill();
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(9, 19);
  ctx.lineTo(13, 23);
  ctx.lineTo(21, 14);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  world: World,
  status: GameStatus,
  colors: ReturnType<typeof palette>,
) {
  const x = playerX(world);
  const y = world.playerY;
  const phase = status === "running" ? Math.sin(world.elapsed * 15) : 0;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = colors.foreground;
  ctx.beginPath();
  ctx.ellipse(x + 21, FLOOR + 4, world.grounded ? 28 : 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(21, 29);
  ctx.lineTo(20, 49);
  ctx.stroke();

  ctx.strokeStyle = colors.foreground;
  ctx.lineWidth = 6;
  ctx.beginPath();
  if (world.grounded) {
    ctx.moveTo(20, 47);
    ctx.lineTo(20 + phase * 13, 59);
    ctx.lineTo(20 + phase * 20, 66);
    ctx.moveTo(20, 47);
    ctx.lineTo(20 - phase * 13, 59);
    ctx.lineTo(20 - phase * 20, 66);
  } else {
    ctx.moveTo(20, 47);
    ctx.lineTo(32, 55);
    ctx.lineTo(37, 49);
    ctx.moveTo(20, 47);
    ctx.lineTo(9, 57);
    ctx.lineTo(4, 52);
  }
  ctx.stroke();

  ctx.strokeStyle = colors.primaryLight;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(20, 33);
  ctx.lineTo(20 - phase * 14, 43);
  ctx.moveTo(22, 33);
  ctx.lineTo(22 + phase * 14, 42);
  ctx.stroke();

  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.arc(22, 16, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.arc(22, 13, 12, Math.PI, Math.PI * 2);
  ctx.lineTo(36, 14);
  ctx.lineTo(9, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  status: GameStatus,
) {
  const colors = palette(ctx.canvas);
  ctx.clearRect(0, 0, world.width, GAME_HEIGHT);
  ctx.fillStyle = colors.card;
  ctx.fillRect(0, 0, world.width, GAME_HEIGHT);

  ctx.save();
  ctx.strokeStyle = colors.border;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  const offset = -((world.distance * 5) % 80);
  for (let x = offset; x < world.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FLOOR);
    ctx.stroke();
  }
  for (let y = 46; y < FLOOR; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = colors.muted;
  for (let x = 30; x < world.width; x += 190) {
    const height = 38 + ((x * 7) % 55);
    ctx.fillRect(x, FLOOR - height, 110, height);
    ctx.fillStyle = colors.primaryLight;
    for (let wx = x + 14; wx < x + 96; wx += 24) {
      ctx.fillRect(wx, FLOOR - height + 15, 9, 9);
    }
    ctx.fillStyle = colors.muted;
  }
  ctx.restore();

  ctx.fillStyle = colors.muted;
  ctx.fillRect(0, FLOOR, world.width, GAME_HEIGHT - FLOOR);
  ctx.fillStyle = colors.primary;
  ctx.fillRect(0, FLOOR, world.width, 4);
  ctx.fillStyle = colors.border;
  for (let x = offset; x < world.width; x += 54) ctx.fillRect(x, FLOOR + 33, 30, 3);

  for (const obstacle of world.obstacles) {
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width, FLOOR);
    ctx.lineTo(obstacle.x, FLOOR);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.card;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 8, FLOOR - obstacle.height * 0.42);
    ctx.lineTo(obstacle.x + obstacle.width - 8, FLOOR - obstacle.height * 0.42);
    ctx.stroke();
    ctx.fillStyle = colors.foreground;
    ctx.fillRect(obstacle.x - 5, FLOOR - 5, obstacle.width + 10, 7);
  }

  for (const item of world.items) {
    const bob = Math.sin(world.elapsed * 5 + item.phase) * 5;
    drawClipboard(ctx, item.x, item.y + bob, colors);
  }

  drawPlayer(ctx, world, status, colors);

  for (const popup of world.popups) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, popup.life * 2);
    ctx.fillStyle = colors.primary;
    ctx.font = "700 18px system-ui";
    ctx.fillText("+25", popup.x, popup.y);
    ctx.restore();
  }
}

export function DemoRunner() {
  const [status, setStatus] = useState<GameStatus>("ready");
  const [hud, setHud] = useState({ score: 0, collected: 0 });
  const [record, setRecord] = useState(0);
  const [message, setMessage] = useState("Pronto para começar a Corrida Bravante.");
  const gameRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World>(createWorld());
  const statusRef = useRef<GameStatus>("ready");
  const recordRef = useRef(0);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(RECORD_KEY) ?? 0);
      if (Number.isFinite(saved) && saved > 0) {
        setRecord(Math.floor(saved));
        recordRef.current = Math.floor(saved);
      }
    } catch {
      // O jogo funciona mesmo quando o navegador bloqueia o armazenamento local.
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animation = 0;
    let previous = performance.now();
    let lastHud = 0;
    let scale = 1;
    let ratio = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      scale = rect.height / GAME_HEIGHT;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      worldRef.current.width = rect.width / scale;
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
    };

    const frame = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.034);
      previous = now;
      const world = worldRef.current;
      if (statusRef.current === "running") {
        const collided = updateWorld(world, dt);
        if (now - lastHud > 100) {
          const next = { score: score(world), collected: world.collected };
          setHud((current) =>
            current.score === next.score && current.collected === next.collected
              ? current
              : next,
          );
          lastHud = now;
        }
        if (collided) {
          const finalScore = score(world);
          statusRef.current = "over";
          setStatus("over");
          setHud({ score: finalScore, collected: world.collected });
          setMessage(`Fim da corrida com ${finalScore} pontos.`);
          if (finalScore > recordRef.current) {
            recordRef.current = finalScore;
            setRecord(finalScore);
            try {
              localStorage.setItem(RECORD_KEY, String(finalScore));
            } catch {
              // O recorde da sessão continua disponível sem armazenamento local.
            }
          }
        }
      }
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
      drawWorld(ctx, world, statusRef.current);
      animation = requestAnimationFrame(frame);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    animation = requestAnimationFrame(frame);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animation);
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && statusRef.current === "running") {
        statusRef.current = "paused";
        setStatus("paused");
        setMessage("Corrida pausada.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  function focusGame() {
    requestAnimationFrame(() => gameRef.current?.focus({ preventScroll: true }));
  }

  function startGame() {
    const width = worldRef.current.width;
    worldRef.current = createWorld(width);
    statusRef.current = "running";
    setStatus("running");
    setHud({ score: 0, collected: 0 });
    setMessage("Corrida iniciada. Pule os obstáculos e colete as pranchetas.");
    focusGame();
  }

  function pauseGame() {
    if (statusRef.current !== "running") return;
    statusRef.current = "paused";
    setStatus("paused");
    setMessage("Corrida pausada.");
  }

  function resumeGame() {
    if (statusRef.current !== "paused") return;
    statusRef.current = "running";
    setStatus("running");
    setMessage("Corrida retomada.");
    focusGame();
  }

  function primaryAction() {
    if (statusRef.current === "ready" || statusRef.current === "over") {
      startGame();
    } else if (statusRef.current === "paused") {
      resumeGame();
    } else {
      jump(worldRef.current);
    }
  }

  return (
    <section
      ref={gameRef}
      tabIndex={0}
      aria-labelledby="runner-title"
      className="demo-runner rounded-lg border bg-card p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
      onKeyDown={(event) => {
        if (event.target instanceof HTMLButtonElement) return;
        if (event.code === "Space" || event.code === "ArrowUp") {
          event.preventDefault();
          primaryAction();
        }
        if (event.code === "KeyP") {
          event.preventDefault();
          if (statusRef.current === "running") pauseGame();
          else if (statusRef.current === "paused") resumeGame();
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Prévia interativa</p>
          <h2 id="runner-title" className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <Gamepad2 className="size-5 text-primary" /> Corrida Bravante
          </h2>
        </div>
        {(status === "running" || status === "paused") && (
          <Button
            variant="outline"
            size="sm"
            onClick={status === "running" ? pauseGame : resumeGame}
          >
            {status === "running" ? <Pause /> : <Play />}
            {status === "running" ? "Pausar" : "Continuar"}
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3" aria-label="Pontuação do jogo">
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Pontos</p>
          <p className="demo-runner-score mt-1 text-xl font-semibold">{hud.score}</p>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <ClipboardCheck className="size-3" /> Pranchetas
          </p>
          <p className="demo-runner-score mt-1 text-xl font-semibold">{hud.collected}</p>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <Trophy className="size-3" /> Recorde
          </p>
          <p className="demo-runner-score mt-1 text-xl font-semibold">{record}</p>
        </div>
      </div>

      <div className="demo-runner-stage mt-4">
        <canvas
          ref={canvasRef}
          className="demo-runner-canvas"
          aria-label="Pista da Corrida Bravante. Pule cones e colete pranchetas."
          onPointerDown={() => {
            if (statusRef.current === "running") {
              jump(worldRef.current);
              focusGame();
            }
          }}
        />
        {status !== "running" && (
          <div className="demo-runner-overlay">
            <div className="demo-runner-overlay-content">
              {status === "ready" && (
                <>
                  <span className="demo-runner-symbol"><Gamepad2 /></span>
                  <h3>Prepare-se para correr!</h3>
                  <p>Desvie dos cones e colete pranchetas para ganhar 25 pontos.</p>
                  <Button onClick={startGame}><Play /> Começar corrida</Button>
                </>
              )}
              {status === "paused" && (
                <>
                  <span className="demo-runner-symbol"><Pause /></span>
                  <h3>Corrida pausada</h3>
                  <p>Seu progresso está guardado nesta tentativa.</p>
                  <Button onClick={resumeGame}><Play /> Continuar</Button>
                </>
              )}
              {status === "over" && (
                <>
                  <span className="demo-runner-symbol"><Trophy /></span>
                  <h3>Fim da corrida</h3>
                  <p>
                    <strong>{hud.score} pontos</strong> · {hud.collected} pranchetas coletadas
                  </p>
                  <Button onClick={startGame}><RotateCcw /> Jogar novamente</Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          <kbd className="rounded border bg-muted px-1.5 py-0.5">Espaço</kbd> ou{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5">↑</kbd> para pular · P para pausar
        </p>
        <Button variant="secondary" onClick={primaryAction}>
          {status === "ready" || status === "over" ? <Play /> : <ArrowUp />}
          {status === "ready" ? "Começar" : status === "over" ? "Jogar de novo" : status === "paused" ? "Continuar" : "Pular"}
        </Button>
      </div>
      <p role="status" className="sr-only">{message}</p>
    </section>
  );
}
