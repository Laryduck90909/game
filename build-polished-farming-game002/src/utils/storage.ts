import { DEFAULT_HIGH_SCORES } from '../data/farmConfig';
import { HighScoreEntry, Language } from '../types/game';

const HIGH_SCORES_KEY = 'happy_farm_offline_highscores_v1';
const LANG_KEY = 'happy_farm_offline_lang_v1';
const MUTE_KEY = 'happy_farm_offline_mute_v1';

let memoryScores: HighScoreEntry[] = [...DEFAULT_HIGH_SCORES];

export function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) {
      window.localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(DEFAULT_HIGH_SCORES));
      return [...DEFAULT_HIGH_SCORES];
    }
    const parsed = JSON.parse(raw) as HighScoreEntry[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryScores = parsed;
      return parsed;
    }
  } catch {
    // Fallback to in-memory scores
  }
  return [...memoryScores];
}

export function saveHighScore(entry: Omit<HighScoreEntry, 'id'>): {
  scores: HighScoreEntry[];
  isNewRecord: boolean;
  savedId: string;
} {
  const existing = loadHighScores().map((s) => ({ ...s, isPlayer: false }));
  const prevBest = existing.length > 0 ? existing[0].score : 0;
  const isNewRecord = entry.score > prevBest && entry.score > 0;

  const savedId = `run-${Date.now()}`;
  const newEntry: HighScoreEntry = {
    ...entry,
    id: savedId,
    isPlayer: true,
  };

  const merged = [...existing, newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  memoryScores = merged;
  try {
    window.localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors
  }

  return { scores: merged, isNewRecord, savedId };
}

export function loadLanguage(): Language {
  try {
    const val = window.localStorage.getItem(LANG_KEY);
    if (val === 'en' || val === 'ar') return val;
  } catch {
    // Ignore
  }
  return 'ar';
}

export function saveLanguage(lang: Language) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Ignore
  }
}

export function loadMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // Ignore
  }
}
