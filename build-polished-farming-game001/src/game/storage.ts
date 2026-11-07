import type { ScoreRow } from "./types";

const SCORE_KEY = "mazraa-saida-scores-v1";
const NAME_KEY = "mazraa-saida-name";
const MUTE_KEY = "mazraa-saida-mute";

export function sanitizeName(raw: string) {
  const t = raw.replace(/\s+/g, " ").trim().slice(0, 14);
  return t.length ? t : "مزارع";
}

export function loadName() {
  try {
    return sanitizeName(localStorage.getItem(NAME_KEY) || "مزارع سعيد");
  } catch {
    return "مزارع سعيد";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, sanitizeName(name));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadMute() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMute(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function valid(row: unknown): row is ScoreRow {
  if (!row || typeof row !== "object") return false;
  const r = row as ScoreRow;
  return typeof r.score === "number" && typeof r.name === "string" && typeof r.at === "number";
}

export function loadScores(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(valid).slice(0, 8);
  } catch {
    return [];
  }
}

export function saveScore(row: ScoreRow): ScoreRow[] {
  const all = [...loadScores(), row].sort((a, b) => b.score - a.score || b.at - a.at).slice(0, 8);
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return all;
}

export function bestScore() {
  return loadScores()[0]?.score ?? 0;
}
