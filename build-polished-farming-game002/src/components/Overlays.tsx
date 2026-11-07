import React from 'react';
import { TEXT } from '../data/farmConfig';
import { GameHUDState, HighScoreEntry, Language } from '../types/game';
import { CropBadgeIcon } from './CropBadgeIcon';

interface StartOverlayProps {
  lang: Language;
  muted: boolean;
  highScores: HighScoreEntry[];
  onStart: () => void;
  onToggleLang: () => void;
  onToggleMute: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({
  lang,
  muted,
  highScores,
  onStart,
  onToggleLang,
  onToggleMute,
}) => {
  const t = TEXT[lang];
  const topScores = highScores.slice(0, 3);

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between bg-black/25 p-3 backdrop-blur-[2px] sm:p-5">
      {/* Top Bar: Offline badge + Lang + Mute */}
      <div className="flex w-full max-w-2xl items-center justify-between">
        <div className="rounded-full bg-emerald-950/75 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/40">
          ● {t.offlineBadge}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleLang}
            className="wood-panel cursor-pointer rounded-xl px-3 py-1.5 text-xs font-black text-amber-100 transition hover:brightness-110 active:scale-95"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="wood-panel cursor-pointer rounded-xl px-3 py-1.5 text-xs font-black text-amber-100 transition hover:brightness-110 active:scale-95"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* Main Title & Card */}
      <div className="parchment-panel my-auto w-full max-w-lg rounded-3xl p-4 text-center sm:p-6">
        {/* Wooden Ribbon Header */}
        <div className="wood-panel animate-float-slow mx-auto -mt-9 mb-3 inline-block rounded-2xl px-6 py-2.5 text-white shadow-xl sm:-mt-11 sm:px-8 sm:py-3">
          <h1 className="text-2xl font-black tracking-tight text-amber-100 drop-shadow sm:text-4xl">
            🌾 {t.title}
          </h1>
        </div>
        <p className="text-xs font-bold text-amber-900/80 sm:text-sm">{t.subtitle}</p>

        {/* 3-Step Visual Core Loop */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-amber-900/10 p-2.5">
            <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20">
              <CropBadgeIcon cropId="wheat" className="h-7 w-7" />
            </div>
            <div className="text-xs font-black text-amber-950">{t.howToPlant}</div>
          </div>
          <div className="rounded-2xl bg-amber-900/10 p-2.5">
            <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-lg">
              💧
            </div>
            <div className="text-xs font-black text-amber-950">{t.howToWater}</div>
          </div>
          <div className="rounded-2xl bg-amber-900/10 p-2.5">
            <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/25">
              <CropBadgeIcon cropId="strawberry" className="h-7 w-7" />
            </div>
            <div className="text-xs font-black text-amber-950">{t.howToHarvest}</div>
          </div>
        </div>

        {/* Play CTA */}
        <button
          type="button"
          onClick={onStart}
          className="btn-farm-green mt-4 w-full cursor-pointer rounded-2xl py-3.5 text-lg font-black text-white shadow-lg sm:py-4 sm:text-xl"
        >
          ▶ {t.playNow}
        </button>

        {/* Controls Guide */}
        <div className="mt-3 rounded-xl bg-amber-950/8 px-3 py-2 text-[11px] font-bold text-amber-900/85">
          <div className="hidden sm:block">{t.controlsHintDesktop}</div>
          <div className="sm:hidden">{t.controlsHintTouch}</div>
        </div>

        {/* Top 3 Local High Scores Preview */}
        {topScores.length > 0 && (
          <div className="mt-3 border-t-2 border-amber-900/15 pt-2.5">
            <div className="mb-1.5 text-[11px] font-black text-amber-900/75 uppercase">
              🏆 {t.leaderboardTitle}
            </div>
            <div className="space-y-1">
              {topScores.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-1 text-xs font-bold text-amber-950"
                >
                  <div className="flex items-center gap-2">
                    <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span>{entry.playerName}</span>
                  </div>
                  <span className="font-black tabular-nums text-amber-800">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-2" />
    </div>
  );
};

interface PauseOverlayProps {
  lang: Language;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onToggleMute: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  lang,
  muted,
  onResume,
  onRestart,
  onMainMenu,
  onToggleMute,
}) => {
  const t = TEXT[lang];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
      <div className="parchment-panel w-full max-w-sm rounded-3xl p-6 text-center">
        <div className="wood-panel mx-auto -mt-10 mb-4 inline-block rounded-2xl px-6 py-2 text-white">
          <h2 className="text-xl font-black text-amber-100">⏸ {t.paused}</h2>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="btn-farm-green w-full cursor-pointer rounded-2xl py-3 text-base font-black text-white"
          >
            ▶ {t.resume}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="btn-farm-amber w-full cursor-pointer rounded-2xl py-3 text-base font-black text-amber-950"
          >
            ↻ {t.restart}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="w-full cursor-pointer rounded-2xl border-2 border-amber-900/25 bg-white/70 py-2.5 text-sm font-black text-amber-950 transition hover:bg-white"
          >
            {muted ? `🔇 ${t.soundOff}` : `🔊 ${t.soundOn}`}
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full cursor-pointer rounded-2xl py-2 text-xs font-extrabold text-amber-900/75 hover:text-amber-950"
          >
            {t.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverOverlayProps {
  hud: GameHUDState;
  lang: Language;
  lastSavedId: string | null;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  hud,
  lang,
  lastSavedId,
  onRestart,
  onMainMenu,
}) => {
  const t = TEXT[lang];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-5">
      <div className="parchment-panel max-h-[94vh] w-full max-w-md overflow-y-auto rounded-3xl p-4 text-center sm:p-6">
        <div className="wood-panel mx-auto mb-2 inline-block rounded-2xl px-6 py-2 text-white">
          <h2 className="text-xl font-black text-amber-100 sm:text-2xl">
            🌻 {t.gameOverTitle}
          </h2>
        </div>

        {hud.isNewHighScore && (
          <div className="mx-auto mb-2 inline-block animate-bounce rounded-full bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 px-4 py-1 text-xs font-black text-amber-950 shadow ring-2 ring-amber-600">
            ✨ {t.newRecord} ✨
          </div>
        )}

        {/* Score Hero Box */}
        <div className="rounded-2xl bg-gradient-to-b from-amber-900/12 to-amber-900/5 p-3">
          <div className="text-xs font-extrabold text-amber-900/75 uppercase">{t.finalScore}</div>
          <div className="text-4xl font-black tabular-nums text-amber-950 sm:text-5xl">
            {hud.score.toLocaleString()}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/75 p-2">
              <div className="text-[10px] font-bold text-amber-900/70">{t.cropsHarvested}</div>
              <div className="text-base font-black tabular-nums text-emerald-700">
                {hud.harvestedCount}
              </div>
            </div>
            <div className="rounded-xl bg-white/75 p-2">
              <div className="text-[10px] font-bold text-amber-900/70">{t.bestCombo}</div>
              <div className="text-base font-black tabular-nums text-amber-700">
                ×{hud.maxCombo}
              </div>
            </div>
            <div className="rounded-xl bg-white/75 p-2">
              <div className="text-[10px] font-bold text-amber-900/70">{t.ordersDone}</div>
              <div className="text-base font-black tabular-nums text-sky-700">
                {hud.ordersCompleted}
              </div>
            </div>
          </div>
        </div>

        {/* Local High-Score Table */}
        <div className="mt-3 text-start">
          <div className="mb-1.5 flex items-center justify-between text-xs font-black text-amber-950">
            <span>🏆 {t.leaderboardTitle}</span>
          </div>
          <div className="space-y-1.5">
            {hud.highScores.slice(0, 5).map((entry, idx) => {
              const isCurrentRun = entry.id === lastSavedId;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    isCurrentRun
                      ? 'bg-gradient-to-r from-amber-300/80 to-yellow-200/90 text-amber-950 ring-2 ring-amber-600'
                      : 'bg-white/70 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-black">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span className="font-extrabold">{entry.playerName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-amber-900/65">
                      ×{entry.bestCombo}
                    </span>
                    <span className="font-black tabular-nums text-amber-900">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instant Restart & Menu */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="btn-farm-green flex-1 cursor-pointer rounded-2xl py-3.5 text-base font-black text-white shadow-lg"
          >
            ↻ {t.playAgain}
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="rounded-2xl border-2 border-amber-900/25 bg-white/75 px-4 py-3 text-sm font-black text-amber-950 transition hover:bg-white cursor-pointer"
          >
            {t.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
};
