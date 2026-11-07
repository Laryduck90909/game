import { useEffect, useRef, useState } from "react";
import { ASSETS } from "../game/assets";
import { Sfx } from "../game/audio";
import { FarmGame } from "../game/engine";
import { loadScores } from "../game/storage";
import { COMBO_WINDOW, CROPS, SCARE_CD, type Hud, type Phase, type RunStats, type ScoreRow } from "../game/types";
import { HelpPanel } from "./HelpPanel";
import { ScoreTable } from "./ScoreTable";
import { CoinIcon, CropGlyph, PauseIcon, SpeakerIcon } from "./glyphs";

const initialHud: Hud = {
  coins: 22,
  score: 0,
  happiness: 100,
  day: 1,
  combo: 0,
  bestCombo: 0,
  selected: "radish",
  hint: "احصد الآن",
  hintEn: "Harvest now",
  title: "مزرعة ناشئة",
  harvested: 0,
  phase: "play",
  brokeTick: 0,
  pop: 0,
  happyTick: 0,
  coach: "اضغط المحصول الذهبي",
  coachEn: "Tap the gold crop",
  best: 0,
  recordLive: false,
  shooed: 0,
  withered: 0,
};

export function GameScreen({
  name,
  muted,
  sfx,
  onToggleMute,
  onMenu,
}: {
  name: string;
  muted: boolean;
  sfx: Sfx;
  onToggleMute: () => void;
  onMenu: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FarmGame | null>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const comboBarRef = useRef<HTMLElement>(null);
  const muteRef = useRef(onToggleMute);
  muteRef.current = onToggleMute;

  const [hud, setHud] = useState<Hud>(initialHud);
  const [phase, setPhase] = useState<Phase>("play");
  const [stats, setStats] = useState<RunStats | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>(() => loadScores());
  const [helpOpen, setHelpOpen] = useState(false);
  const [brokeFlash, setBrokeFlash] = useState(false);
  const [happyHit, setHappyHit] = useState(false);

  useEffect(() => {
    if (hud.brokeTick === 0) return;
    setBrokeFlash(true);
    const t = window.setTimeout(() => setBrokeFlash(false), 380);
    return () => window.clearTimeout(t);
  }, [hud.brokeTick]);

  useEffect(() => {
    if (hud.happyTick === 0) return;
    setHappyHit(true);
    const t = window.setTimeout(() => setHappyHit(false), 420);
    return () => window.clearTimeout(t);
  }, [hud.happyTick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const field = fieldRef.current;
    if (!canvas || !field) return;
    let dead = false;
    const engine = new FarmGame(
      {
        onHud: (next) => {
          if (!dead) setHud(next);
        },
        onPhase: (next) => {
          if (!dead) setPhase(next);
        },
        onOver: (next) => {
          if (dead) return;
          setStats(next);
          setScores(next.scores);
          setPhase("over");
        },
      },
      sfx,
      name,
    );
    engineRef.current = engine;

    const resize = () => {
      const rect = field.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      engine.setViewport(rect.width, rect.height, dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(field);
    resize();

    const ctx = canvas.getContext("2d", { alpha: false });
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      engine.update(dt);
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.setTransform(engine.dpr, 0, 0, engine.dpr, 0, 0);
        engine.render(ctx);
      }
      const fab = fabRef.current;
      if (fab) {
        const p = engine.scareT > 0 ? 0 : Math.max(0, engine.scareCd / SCARE_CD);
        fab.style.setProperty("--p", String(p));
        fab.classList.toggle("ready", engine.scareCd <= 0 && engine.scareT <= 0 && engine.phase === "play");
        fab.classList.toggle("on", engine.scareT > 0);
        const label = fab.querySelector(".cd");
        if (label) label.textContent = engine.scareCd > 0.25 && engine.scareT <= 0 ? String(Math.ceil(engine.scareCd)) : "";
      }
      if (comboBarRef.current) {
        const t = engine.combo >= 2 ? Math.max(0, engine.comboTimer / COMBO_WINDOW) : 0;
        comboBarRef.current.style.transform = `scaleX(${t})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const blocked = new Set([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "Enter",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "KeyF",
      "KeyP",
      "Escape",
      "KeyR",
      "KeyM",
      "KeyQ",
      "KeyE",
      "BracketLeft",
      "BracketRight",
    ]);
    const onKey = (e: KeyboardEvent) => {
      if (blocked.has(e.code)) e.preventDefault();
      if (e.code === "KeyM" && !e.repeat) {
        muteRef.current();
        return;
      }
      engine.keyDown(e.code, e.repeat);
    };
    const onKeyUp = (e: KeyboardEvent) => engine.keyUp(e.code);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);

    const onPointer = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      engine.pointer(e.clientX - rect.left, e.clientY - rect.top);
    };
    canvas.addEventListener("pointerdown", onPointer, { passive: false });
    const onContext = (e: Event) => e.preventDefault();
    canvas.addEventListener("contextmenu", onContext);
    const onVis = () => {
      if (document.hidden) engine.pause();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("contextmenu", onContext);
      document.removeEventListener("visibilitychange", onVis);
      engine.destroy();
      engineRef.current = null;
    };
  }, [name, sfx]);

  const happyTone = hud.happiness > 60 ? "good" : hud.happiness > 30 ? "mid" : "bad";

  return (
    <div className="stage" style={{ backgroundImage: `url(${ASSETS.sky})` }}>
      <aside className="side side-l">
        <div className="side-card">
          <div className="brand-mini">
            <div className="medallion sm">
              <img src={ASSETS.farmer} alt="" />
            </div>
            <div>
              <div className="eyebrow">Happy Farm</div>
              <strong>المزرعة السعيدة</strong>
            </div>
          </div>
          <HelpPanel />
        </div>
      </aside>

      <div className="game-col" style={{ "--wood": `url(${ASSETS.wood})` } as React.CSSProperties}>
        <header className="hud">
          <div className="hud-top">
            <div className={`coin-pill ${brokeFlash ? "broke" : ""}`}>
              <CoinIcon />
              <b key={hud.coins}>{hud.coins}</b>
            </div>
            <div className="score-wrap">
              <span>النقاط</span>
              <strong key={hud.pop} className={`score-num ${hud.combo >= 5 ? "fire" : hud.combo >= 3 ? "hot" : ""}`}>
                {hud.score.toLocaleString("en-US")}
              </strong>
              {hud.combo >= 2 && (
                <em className="combo" key={hud.combo}>
                  ×{hud.combo} سلسلة
                  <i ref={comboBarRef} />
                </em>
              )}
            </div>
            <div className="hud-actions">
              <button className="icon-btn" onClick={onToggleMute} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}>
                <SpeakerIcon muted={muted} />
              </button>
              <button className="icon-btn" onClick={() => engineRef.current?.pause()} aria-label="إيقاف مؤقت">
                <PauseIcon />
              </button>
            </div>
          </div>
          <div className="hud-mid">
            <div className={`happy ${happyTone} ${happyHit ? "hit" : ""}`}>
              <span>السعادة</span>
              <div className="bar" aria-valuenow={hud.happiness} aria-valuemin={0} aria-valuemax={100} role="meter">
                <div style={{ width: `${hud.happiness}%` }} />
              </div>
            </div>
            <span className="pill">اليوم {hud.day}</span>
            <span className="pill soft">{hud.title}</span>
          </div>
          {hud.coach && (
            <div className="coach">
              <b>{hud.coach}</b>
              <span>{hud.coachEn}</span>
            </div>
          )}
          {hud.recordLive && <div className="record-live">رقم قياسي جديد</div>}
        </header>

        <div className="field" ref={fieldRef}>
          <canvas ref={canvasRef} role="application" aria-label="حقل المزرعة السعيدة" />
          <button
            ref={fabRef}
            className="fab"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engineRef.current?.scarecrow();
            }}
            aria-label="تفعيل الفزّاعة"
            title="الفزّاعة (F)"
          >
            <img src={ASSETS.scarecrow} alt="" />
            <span className="sweep" />
            <span className="cd" />
          </button>
        </div>

        <div className="hint-bar">
          <b>{hud.hint}</b>
          <span>{hud.hintEn}</span>
          <kbd className="kbd">Space</kbd>
        </div>

        <div className="seed-bar" dir="ltr">
          {CROPS.map((crop, i) => (
            <button
              key={crop.id}
              className={`seed ${hud.selected === crop.id ? "on" : ""} ${hud.coins < crop.cost ? "poor" : ""}`}
              onClick={() => engineRef.current?.select(crop.id)}
              aria-pressed={hud.selected === crop.id}
              aria-label={`${crop.name} تكلفة ${crop.cost} حصاد ${crop.value}`}
            >
              <span className="hotkey">{i + 1}</span>
              <CropGlyph id={crop.id} />
              <b>{crop.name}</b>
              <small>
                <i className="pay">{crop.cost}</i>
                <i className="gain">{crop.value}</i>
              </small>
              <em>{crop.speed}</em>
            </button>
          ))}
        </div>

        {phase === "pause" && (
          <div className="overlay">
            <div className="sheet">
              <p className="eyebrow">استراحة</p>
              <h2>الحقل نائم بأمان</h2>
              <p className="sheet-lead">النقاط {hud.score.toLocaleString("en-US")} · اليوم {hud.day} · سلسلة {hud.bestCombo}</p>
              <button className="play-btn" onClick={() => engineRef.current?.resume()}>
                تابع الحصاد
              </button>
              <div className="row">
                <button className="ghost" onClick={() => engineRef.current?.restart()}>
                  أعد الجولة
                </button>
                <button className="ghost" onClick={onMenu}>
                  القائمة
                </button>
              </div>
              <button className="text-btn" onClick={() => setHelpOpen((v) => !v)}>
                {helpOpen ? "إخفاء الشرح" : "كيف تلعب"}
              </button>
              {helpOpen && <HelpPanel />}
            </div>
          </div>
        )}

        {phase === "over" && stats && (
          <div className="overlay">
            <div className="sheet over-sheet">
              {stats.isRecord && <div className="ribbon">رقم قياسي جديد</div>}
              <p className="eyebrow">{stats.title}</p>
              <h2>خمدت سعادة المزرعة</h2>
              <div className="final-score">{stats.score.toLocaleString("en-US")}</div>
              <p className="sheet-lead">
                {stats.rank > 0 ? `المركز ${stats.rank} على جهازك` : "ازرع أسرع في الجولة القادمة"}
              </p>
              <button className="play-btn" onClick={() => engineRef.current?.restart()}>
                احصد مجددًا
              </button>
              <div className="stat-grid">
                <div>
                  <b>{stats.day}</b>
                  <span>اليوم</span>
                </div>
                <div>
                  <b>{stats.bestCombo}</b>
                  <span>السلسلة</span>
                </div>
                <div>
                  <b>{stats.harvested}</b>
                  <span>محاصيل</span>
                </div>
                <div>
                  <b>{stats.shooed}</b>
                  <span>غربان</span>
                </div>
              </div>
              <ScoreTable rows={stats.scores} highlightAt={stats.highlightAt} />
              <button className="ghost wide" onClick={onMenu}>
                القائمة
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="side side-r">
        <div className="side-card">
          <img src={ASSETS.basket} alt="" className="side-basket blend" />
          <h2>لوحة المزرعة</h2>
          <div className="live-stats">
            <span>النقاط <b>{hud.score.toLocaleString("en-US")}</b></span>
            <span>محاصيل <b>{hud.harvested}</b></span>
            <span>غربان <b>{hud.shooed}</b></span>
            <span>ذبول <b>{hud.withered}</b></span>
          </div>
          <ScoreTable rows={scores} highlightAt={stats?.highlightAt} />
        </div>
      </aside>
    </div>
  );
}
