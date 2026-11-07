import type { ScoreRow } from "../game/types";

export function ScoreTable({ rows, highlightAt = 0 }: { rows: ScoreRow[]; highlightAt?: number }) {
  if (!rows.length) {
    return <p className="empty-scores">لم تُسجَّل نتائج بعد. كن أول حصاد في المزرعة.</p>;
  }
  return (
    <ol className="score-table">
      {rows.map((row, i) => (
        <li key={`${row.at}-${i}`} className={row.at === highlightAt ? "mine" : ""}>
          <span className={`medal m${i + 1}`}>{i + 1}</span>
          <span className="who">
            <b>{row.name}</b>
            <small>
              اليوم {row.day} · سلسلة {row.combo}
            </small>
          </span>
          <strong>{row.score.toLocaleString("en-US")}</strong>
        </li>
      ))}
    </ol>
  );
}
