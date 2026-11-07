import { useState } from "react";
import { ASSETS } from "../game/assets";
import { loadScores } from "../game/storage";
import { HelpPanel } from "./HelpPanel";
import { ScoreTable } from "./ScoreTable";
import { SpeakerIcon } from "./glyphs";

export function StartScreen({
  name,
  muted,
  onName,
  onToggleMute,
  onPlay,
}: {
  name: string;
  muted: boolean;
  onName: (name: string) => void;
  onToggleMute: () => void;
  onPlay: () => void;
}) {
  const [sheet, setSheet] = useState<"help" | "scores" | null>(null);
  const scores = loadScores();
  const best = scores[0]?.score ?? 0;

  return (
    <div className="start">
      <img className="start-bg" src={ASSETS.hero} alt="" />
      <div className="start-scrim" />
      <div className="start-layout">
        <div className="start-copy">
          <div className="brand-row">
            <div className="medallion">
              <img src={ASSETS.farmer} alt="" />
            </div>
            <div>
              <div className="eyebrow">Happy Farm Rush</div>
              <h1>المزرعة السعيدة</h1>
            </div>
          </div>
          <p className="tag">ازرع، اسقِ، واحصد قبل الذبول — واطرد الغربان قبل أن تسرق فرحتك.</p>
          <ul className="quick">
            <li><i className="dot gold" /> حصاد ذهبي من أول لمسة</li>
            <li><i className="dot blue" /> سلاسل نقاط وفزّاعة</li>
            <li><i className="dot red" /> أرقام قياسية على جهازك</li>
          </ul>
        </div>

        <div className="start-panel">
          <div className="panel-head">
            <img src={ASSETS.basket} alt="" className="blend" />
            <div>
              <strong>موسم جديد</strong>
              <span>{best > 0 ? `أفضل نتيجة ${best.toLocaleString("en-US")}` : "المزرعة بانتظارك"}</span>
            </div>
          </div>
          <label className="name-field">
            اسم المزارع
            <input
              value={name}
              maxLength={14}
              dir="auto"
              autoComplete="nickname"
              onChange={(e) => onName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onPlay();
              }}
            />
          </label>
          <button className="play-btn" onClick={onPlay}>
            ابدأ الحصاد
          </button>
          <div className="start-actions">
            <button onClick={() => setSheet("help")}>كيف تلعب</button>
            <button onClick={() => setSheet("scores")}>الأرقام</button>
            <button onClick={onToggleMute} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}>
              <SpeakerIcon muted={muted} />
            </button>
          </div>
          <p className="controls-mini">لمس: اضغط الأرض · أسهم + مسافة · 1–4 بذور · F فزّاعة</p>
        </div>
      </div>

      {sheet && (
        <div className="modal-back" onClick={() => setSheet(null)}>
          <div className="sheet modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="sheet-head">
              <h2>{sheet === "help" ? "كيف تلعب" : "الأرقام القياسية"}</h2>
              <button className="icon-btn" onClick={() => setSheet(null)} aria-label="إغلاق">
                ×
              </button>
            </header>
            {sheet === "help" ? <HelpPanel /> : <ScoreTable rows={scores} />}
            <button className="play-btn" onClick={onPlay}>
              ابدأ الحصاد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
