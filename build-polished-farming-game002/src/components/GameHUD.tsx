import React from 'react';
import { CROPS, CROP_ORDER, TEXT } from '../data/farmConfig';
import { CropId, GameHUDState, Language } from '../types/game';
import { CropBadgeIcon } from './CropBadgeIcon';

interface GameHUDProps {
  hud: GameHUDState;
  lang: Language;
  muted: boolean;
  onSelectCrop: (cropId: CropId) => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  lang,
  muted,
  onSelectCrop,
  onTogglePause,
  onToggleMute,
}) => {
  const t = TEXT[lang];
  const isUrgentTime = hud.timeLeft <= 15 && hud.timeLeft > 0;
  const displayTime = Math.max(0, Math.ceil(hud.timeLeft));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-2 sm:p-3">
      {/* TOP BAR */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* Left: Score & Combo */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="wood-panel flex items-center gap-2 rounded-2xl px-3 py-1.5 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 text-amber-950 shadow-inner">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-bold tracking-wide text-amber-200/90 uppercase">
                {t.score}
              </div>
              <div className="text-lg font-black tabular-nums sm:text-xl">
                {hud.score.toLocaleString()}
              </div>
            </div>
          </div>

          {hud.combo >= 2 && (
            <div
              key={hud.combo}
              className="btn-farm-amber animate-bounce rounded-2xl px-2.5 py-1 text-center text-amber-950"
            >
              <div className="text-xs font-black leading-none sm:text-sm">
                ×{hud.combo} {t.combo}!
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-amber-950/25">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${Math.round(hud.comboTimer * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center: Active Market Order + Fever Bar */}
        <div className="pointer-events-auto order-3 flex w-full flex-col items-center sm:order-2 sm:w-auto">
          <div
            className={`parchment-panel flex items-center gap-2.5 rounded-2xl px-3 py-1 transition-transform ${
              hud.activeOrder.completedFlash > 0 ? 'scale-110 ring-4 ring-yellow-300' : ''
            }`}
          >
            <span className="hidden text-xs font-extrabold text-amber-900 md:inline">
              {t.marketOrder}:
            </span>
            <div className="flex items-center gap-2.5">
              {hud.activeOrder.items.map((item) => {
                const done = item.collected >= item.required;
                return (
                  <div
                    key={item.cropId}
                    className={`flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-black transition-colors ${
                      done
                        ? 'bg-emerald-500/20 text-emerald-800 ring-1 ring-emerald-600/40'
                        : 'bg-amber-900/10 text-amber-950'
                    }`}
                  >
                    <CropBadgeIcon cropId={item.cropId} className="h-5 w-5" />
                    <span className="tabular-nums">
                      {Math.min(item.collected, item.required)}/{item.required}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg bg-emerald-600 px-1.5 py-0.5 text-[11px] font-black text-white">
              +{hud.activeOrder.bonusTime}
              {t.bonusTimeUnit}
            </div>
          </div>

          {/* Fever Progress / Active Pill */}
          <div className="mt-1 flex items-center gap-2">
            {hud.feverActive ? (
              <div className="rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-orange-500 px-3 py-0.5 text-[11px] font-black text-amber-950 shadow-md ring-2 ring-white">
                ☀️ {t.feverMode} ({Math.ceil(hud.feverTimeLeft)}
                {t.bonusTimeUnit})
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-0.5 backdrop-blur-xs">
                <span className="text-[10px] font-bold text-amber-200">☀️</span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/25 sm:w-28">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 transition-all duration-150"
                    style={{ width: `${Math.round(hud.feverMeter * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Timer + Mute + Pause */}
        <div className="pointer-events-auto order-2 flex items-center gap-1.5 sm:order-3 sm:gap-2">
          <div
            className={`wood-panel flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-white ${
              isUrgentTime ? 'animate-pulse-urgent ring-2 ring-red-400' : ''
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-5 w-5 ${isUrgentTime ? 'text-red-300' : 'text-amber-300'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 1.5M9.5 3h5" strokeLinecap="round" />
            </svg>
            <span
              className={`text-lg font-black tabular-nums sm:text-xl ${
                isUrgentTime ? 'text-red-200' : 'text-white'
              }`}
            >
              {displayTime}
              <span className="text-xs font-bold opacity-85">{t.bonusTimeUnit}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? t.soundOff : t.soundOn}
            className="wood-panel flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl text-amber-100 transition hover:brightness-110 active:scale-95"
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinejoin="round" />
                <path d="M22 9l-6 6M16 9l6 6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinejoin="round" />
                <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            aria-label={t.paused}
            className="wood-panel flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl text-amber-100 transition hover:brightness-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1.5" />
              <rect x="14" y="5" width="4" height="14" rx="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* BOTTOM SEED & TOOL DOCK */}
      <div className="flex flex-col items-center gap-1">
        <div className="pointer-events-auto wood-panel flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 sm:gap-2.5 sm:px-3.5 sm:py-2">
          {CROP_ORDER.map((cropId) => {
            const crop = CROPS[cropId];
            const selected = hud.selectedCrop === cropId;
            const name = lang === 'ar' ? crop.nameAr : crop.nameEn;

            return (
              <button
                key={cropId}
                type="button"
                onClick={() => onSelectCrop(cropId)}
                className={`relative flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-all sm:px-3.5 ${
                  selected
                    ? 'btn-farm-amber -translate-y-1 text-amber-950 ring-2 ring-white'
                    : 'bg-amber-950/45 text-amber-100 hover:bg-amber-950/65'
                }`}
              >
                <span
                  className={`hidden h-4 w-4 items-center justify-center rounded text-[10px] font-black md:inline-flex ${
                    selected ? 'bg-amber-950/20 text-amber-950' : 'bg-white/15 text-amber-200'
                  }`}
                >
                  {crop.keyHint}
                </span>
                <CropBadgeIcon cropId={cropId} className="h-7 w-7 sm:h-8 sm:w-8" />
                <div className="text-start leading-tight">
                  <div className="text-[11px] font-black sm:text-xs">{name}</div>
                  <div
                    className={`text-[10px] font-bold ${
                      selected ? 'text-amber-900' : 'text-amber-300/90'
                    }`}
                  >
                    +{crop.points}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
