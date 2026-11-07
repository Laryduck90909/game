export type CropId = "radish" | "wheat" | "tomato" | "pumpkin";
export type Phase = "play" | "pause" | "over";
export type Ring = "gold" | "blue" | "red" | "brown" | null;
export type PType =
  | "coin"
  | "dirt"
  | "water"
  | "leaf"
  | "spark"
  | "feather"
  | "dust"
  | "heart"
  | "confetti"
  | "star"
  | "butterfly";

export interface CropDef {
  id: CropId;
  name: string;
  en: string;
  cost: number;
  value: number;
  grow: number;
  ripe: number;
  speed: string;
  color: string;
  deep: string;
  leaf: string;
}

export const CROPS: CropDef[] = [
  {
    id: "radish",
    name: "فجل",
    en: "Radish",
    cost: 2,
    value: 10,
    grow: 3.35,
    ripe: 6.6,
    speed: "سريع",
    color: "#ef3d4d",
    deep: "#b81e32",
    leaf: "#2f9a46",
  },
  {
    id: "wheat",
    name: "قمح",
    en: "Wheat",
    cost: 4,
    value: 16,
    grow: 4.25,
    ripe: 6.3,
    speed: "وسط",
    color: "#f0c23a",
    deep: "#c48a14",
    leaf: "#d7a322",
  },
  {
    id: "tomato",
    name: "طماطم",
    en: "Tomato",
    cost: 6,
    value: 24,
    grow: 5.45,
    ripe: 5.7,
    speed: "ثمين",
    color: "#ef4034",
    deep: "#c4251c",
    leaf: "#2f7d38",
  },
  {
    id: "pumpkin",
    name: "يقطين",
    en: "Pumpkin",
    cost: 10,
    value: 44,
    grow: 7.35,
    ripe: 6.8,
    speed: "نادر",
    color: "#f08a1e",
    deep: "#d2650d",
    leaf: "#3a8f34",
  },
];

export const CROP_MAP = Object.fromEntries(CROPS.map((c) => [c.id, c])) as Record<CropId, CropDef>;

export const COLS = 4;
export const ROWS = 3;
export const PLOT_COUNT = COLS * ROWS;
export const DAY_LEN = 32;
export const COMBO_WINDOW = 2.45;
export const SCARE_TIME = 5.6;
export const SCARE_CD = 16;

export interface Plot {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
  state: "empty" | "growing" | "ripe" | "withered";
  crop: CropId | null;
  growth: number;
  ripeLeft: number;
  ripeMax: number;
  thirsty: boolean;
  thirstTimer: number;
  thirstRolled: boolean;
  pest: boolean;
  pestTimer: number;
  pestMax: number;
  weed: boolean;
  weedTimer: number;
  weedHit: boolean;
  wet: number;
  punch: number;
  pop: number;
  patted: boolean;
  sparkAcc: number;
  safeUntil: number;
  ring: Ring;
}

export interface Particle {
  alive: boolean;
  type: PType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  gravity: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface Chicken {
  x: number;
  vx: number;
  bob: number;
  peck: number;
  facing: number;
  wait: number;
}

export interface Flyer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  rot: number;
}

export interface Banner {
  text: string;
  sub?: string;
  life: number;
  max: number;
}

export interface Hud {
  coins: number;
  score: number;
  happiness: number;
  day: number;
  combo: number;
  bestCombo: number;
  selected: CropId;
  hint: string;
  hintEn: string;
  title: string;
  harvested: number;
  phase: Phase;
  brokeTick: number;
  pop: number;
  happyTick: number;
  coach: string | null;
  coachEn: string | null;
  best: number;
  recordLive: boolean;
  shooed: number;
  withered: number;
}

export interface ScoreRow {
  name: string;
  score: number;
  day: number;
  combo: number;
  crops: number;
  at: number;
}

export interface RunStats {
  score: number;
  day: number;
  bestCombo: number;
  harvested: number;
  coins: number;
  title: string;
  isRecord: boolean;
  rank: number;
  shooed: number;
  withered: number;
  scores: ScoreRow[];
  highlightAt: number;
}

export const TITLES: { at: number; name: string }[] = [
  { at: 0, name: "مزرعة ناشئة" },
  { at: 280, name: "مزرعة سعيدة" },
  { at: 900, name: "مزرعة ذهبية" },
  { at: 2000, name: "مزرعة الأحلام" },
  { at: 4500, name: "مزرعة أسطورية" },
];

export function farmTitle(score: number) {
  let name = TITLES[0].name;
  for (const t of TITLES) if (score >= t.at) name = t.name;
  return name;
}
