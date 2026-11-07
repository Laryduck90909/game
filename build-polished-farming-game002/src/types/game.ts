export type Language = 'ar' | 'en';

export type GamePhase = 'start' | 'playing' | 'paused' | 'gameover';

export type CropId = 'wheat' | 'corn' | 'strawberry' | 'pumpkin';

export type AnimalId = 'cow' | 'hen' | 'hive';

export interface CropDefinition {
  id: CropId;
  nameAr: string;
  nameEn: string;
  growDuration: number; // seconds when watered (base)
  points: number;
  coins: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  keyHint: string;
}

export type TileCropState = 'empty' | 'growing' | 'ripe' | 'withered';

export interface FarmTile {
  index: number;
  row: number;
  col: number;
  cropId: CropId | null;
  state: TileCropState;
  growthProgress: number; // 0 to 1
  watered: boolean;
  needsWater: boolean;
  ripeTimer: number; // seconds spent ripe before wilting warning/wither
  hasCrow: boolean;
  crowTimer: number; // time before crow eats the crop
  bounceScale: number; // 1.0 normal, >1 or <1 spring animation
  bounceVelocity: number;
  flashTimer: number;
}

export interface FarmAnimal {
  id: AnimalId;
  nameAr: string;
  nameEn: string;
  productAr: string;
  productEn: string;
  cooldown: number; // seconds to produce
  progress: number; // 0 to cooldown
  ready: boolean;
  points: number;
  bonusTime: number;
  triggersFever?: boolean;
  bounce: number;
  bounceVel: number;
  animPhase: number;
}

export interface MarketOrderItem {
  cropId: CropId;
  required: number;
  collected: number;
}

export interface MarketOrder {
  id: number;
  items: MarketOrderItem[];
  bonusPoints: number;
  bonusTime: number;
  completedFlash: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'square' | 'drop' | 'star' | 'leaf' | 'ring';
  rotation: number;
  vRot: number;
}

export interface FlyingItem {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  duration: number;
  cropId?: CropId;
  kind: 'crop' | 'coin' | 'milk' | 'egg' | 'honey';
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  subText?: string;
  color: string;
  strokeColor: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface HighScoreEntry {
  id: string;
  playerName: string;
  score: number;
  harvested: number;
  bestCombo: number;
  dateLabel: string;
  isPlayer?: boolean;
}

export interface GameHUDState {
  phase: GamePhase;
  score: number;
  coins: number;
  timeLeft: number;
  combo: number;
  maxCombo: number;
  comboTimer: number; // 0 to 1
  feverMeter: number; // 0 to 1
  feverActive: boolean;
  feverTimeLeft: number;
  selectedCrop: CropId;
  harvestedCount: number;
  ordersCompleted: number;
  activeOrder: MarketOrder;
  isNewHighScore: boolean;
  highScores: HighScoreEntry[];
}
