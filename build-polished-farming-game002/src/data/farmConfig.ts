import { AnimalId, CropDefinition, CropId, HighScoreEntry, Language } from '../types/game';

export const GRID_ROWS = 4;
export const GRID_COLS = 4;
export const INITIAL_GAME_TIME = 90; // seconds
export const RIPE_WITHER_TIME = 12.5; // seconds before ripe crop withers
export const CROW_EAT_TIME = 6.5; // seconds before crow eats crop

export const CROPS: Record<CropId, CropDefinition> = {
  wheat: {
    id: 'wheat',
    nameAr: 'قمح ذهبي',
    nameEn: 'Golden Wheat',
    growDuration: 2.5,
    points: 35,
    coins: 15,
    primaryColor: '#f5b82e',
    secondaryColor: '#ffe07d',
    accentColor: '#7cb518',
    keyHint: '1',
  },
  corn: {
    id: 'corn',
    nameAr: 'ذرة حلوة',
    nameEn: 'Sweet Corn',
    growDuration: 3.3,
    points: 60,
    coins: 25,
    primaryColor: '#ffd12a',
    secondaryColor: '#55a630',
    accentColor: '#f77f00',
    keyHint: '2',
  },
  strawberry: {
    id: 'strawberry',
    nameAr: 'فراولة',
    nameEn: 'Strawberry',
    growDuration: 4.1,
    points: 95,
    coins: 40,
    primaryColor: '#e63946',
    secondaryColor: '#ff758f',
    accentColor: '#40916c',
    keyHint: '3',
  },
  pumpkin: {
    id: 'pumpkin',
    nameAr: 'يقطين ملكي',
    nameEn: 'Royal Pumpkin',
    growDuration: 5.2,
    points: 165,
    coins: 75,
    primaryColor: '#f76c1b',
    secondaryColor: '#ffb703',
    accentColor: '#386641',
    keyHint: '4',
  },
};

export const CROP_ORDER: CropId[] = ['wheat', 'corn', 'strawberry', 'pumpkin'];

export const ANIMAL_CONFIGS: Record<
  AnimalId,
  {
    nameAr: string;
    nameEn: string;
    productAr: string;
    productEn: string;
    cooldown: number;
    points: number;
    bonusTime: number;
    triggersFever?: boolean;
  }
> = {
  cow: {
    nameAr: 'البقرة السعيدة',
    nameEn: 'Happy Cow',
    productAr: 'حليب طازج',
    productEn: 'Fresh Milk',
    cooldown: 11,
    points: 120,
    bonusTime: 4,
  },
  hen: {
    nameAr: 'الدجاجة النشيطة',
    nameEn: 'Busy Hen',
    productAr: 'بيض ذهبي',
    productEn: 'Golden Egg',
    cooldown: 8.5,
    points: 90,
    bonusTime: 3,
  },
  hive: {
    nameAr: 'خلية النحل',
    nameEn: 'Honey Hive',
    productAr: 'عسل صافي',
    productEn: 'Pure Honey',
    cooldown: 15,
    points: 150,
    bonusTime: 5,
    triggersFever: true,
  },
};

export const DEFAULT_HIGH_SCORES: HighScoreEntry[] = [
  {
    id: 'npc-1',
    playerName: 'أبو كريم المزارع',
    score: 4850,
    harvested: 64,
    bestCombo: 14,
    dateLabel: 'بطل الموسم',
  },
  {
    id: 'npc-2',
    playerName: 'سارة والحصاد',
    score: 3620,
    harvested: 49,
    bestCombo: 11,
    dateLabel: 'مزرعة ذهبية',
  },
  {
    id: 'npc-3',
    playerName: 'فارس الحقول',
    score: 2540,
    harvested: 36,
    bestCombo: 8,
    dateLabel: 'نشيط',
  },
  {
    id: 'npc-4',
    playerName: 'نور الريف',
    score: 1680,
    harvested: 25,
    bestCombo: 6,
    dateLabel: 'مبتدئ',
  },
];

export interface TextDictionary {
  title: string;
  subtitle: string;
  playNow: string;
  howToPlant: string;
  howToWater: string;
  howToHarvest: string;
  controlsHintDesktop: string;
  controlsHintTouch: string;
  score: string;
  time: string;
  combo: string;
  marketOrder: string;
  feverMode: string;
  paused: string;
  resume: string;
  restart: string;
  mainMenu: string;
  gameOverTitle: string;
  finalScore: string;
  cropsHarvested: string;
  bestCombo: string;
  ordersDone: string;
  newRecord: string;
  leaderboardTitle: string;
  playAgain: string;
  youLabel: string;
  offlineBadge: string;
  soundOn: string;
  soundOff: string;
  wateredText: string;
  shooCrowText: string;
  orderCompleteText: string;
  feverActivatedText: string;
  witheredText: string;
  bonusTimeUnit: string;
  seedsLabel: string;
}

export const TEXT: Record<Language, TextDictionary> = {
  ar: {
    title: 'المزرعة السعيدة',
    subtitle: 'سباق الحصاد السريع • نسخه ممتعة بدون إنترنت',
    playNow: 'ابدأ الحصاد الآن!',
    howToPlant: 'ازرع البذور',
    howToWater: 'اسقِ واطرد الغربان',
    howToHarvest: 'احصد واجمع الكومبو!',
    controlsHintDesktop: 'الماوس: نقر أو سحب للحصاد والزرع • الكيبورد: الأسهم/WASD + مسافة + أرقام 1-4',
    controlsHintTouch: 'المس أو اسحب إصبعك فوق الحقول والحيوانات للحصاد والزرع السريع!',
    score: 'النقاط',
    time: 'الوقت',
    combo: 'كومبو',
    marketOrder: 'طلب السوق',
    feverMode: 'حمى الشمس ×2',
    paused: 'اللعبة متوقفة',
    resume: 'استمرار اللعب',
    restart: 'إعادة من جديد',
    mainMenu: 'القائمة الرئيسية',
    gameOverTitle: 'انتهى يوم الحصاد!',
    finalScore: 'النتيجة النهائية',
    cropsHarvested: 'المحاصيل المحصودة',
    bestCombo: 'أعلى كومبو',
    ordersDone: 'طلبات السوق',
    newRecord: 'رقم قياسي جديد!',
    leaderboardTitle: 'قائمة أفضل المزارعين (محلياً)',
    playAgain: 'العب مجدداً',
    youLabel: 'أنت (مزارع سعيد)',
    offlineBadge: 'جاهز بدون إنترنت 100%',
    soundOn: 'الصوت مفعل',
    soundOff: 'الصوت مكتوم',
    wateredText: 'سقي سريع!',
    shooCrowText: 'طرد الغراب!',
    orderCompleteText: 'اكتمل طلب السوق!',
    feverActivatedText: 'حمى الحصاد الذهبية ×2!',
    witheredText: 'ذبل المحصول!',
    bonusTimeUnit: 'ث',
    seedsLabel: 'البذور',
  },
  en: {
    title: 'Happy Farm',
    subtitle: 'Fast Harvest Rush • 100% Offline Mini-Game',
    playNow: 'Start Harvesting!',
    howToPlant: 'Plant Seeds',
    howToWater: 'Water & Shoo Crows',
    howToHarvest: 'Swipe Harvest Combos!',
    controlsHintDesktop: 'Mouse: Click or Drag-Sweep tiles • Keyboard: WASD/Arrows + Space + 1-4',
    controlsHintTouch: 'Tap or drag across plots & animals to harvest, water, and plant fast!',
    score: 'Score',
    time: 'Time',
    combo: 'Combo',
    marketOrder: 'Market Order',
    feverMode: 'SUN FEVER ×2',
    paused: 'Game Paused',
    resume: 'Resume Game',
    restart: 'Instant Restart',
    mainMenu: 'Main Menu',
    gameOverTitle: 'Harvest Day Complete!',
    finalScore: 'Final Score',
    cropsHarvested: 'Crops Harvested',
    bestCombo: 'Best Combo',
    ordersDone: 'Orders Filled',
    newRecord: 'NEW HIGH SCORE!',
    leaderboardTitle: 'Local High-Score Table',
    playAgain: 'Play Again',
    youLabel: 'You (Happy Farmer)',
    offlineBadge: '100% Offline Ready',
    soundOn: 'Sound On',
    soundOff: 'Muted',
    wateredText: 'Watered!',
    shooCrowText: 'Crow Shooed!',
    orderCompleteText: 'Order Complete!',
    feverActivatedText: 'GOLDEN SUN FEVER ×2!',
    witheredText: 'Crop Withered!',
    bonusTimeUnit: 's',
    seedsLabel: 'Seeds',
  },
};
