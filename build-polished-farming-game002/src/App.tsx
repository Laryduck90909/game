import React, { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GameHUD } from './components/GameHUD';
import { GameOverOverlay, PauseOverlay, StartOverlay } from './components/Overlays';
import {
  ANIMAL_CONFIGS,
  CROPS,
  CROP_ORDER,
  CROW_EAT_TIME,
  GRID_COLS,
  GRID_ROWS,
  INITIAL_GAME_TIME,
  RIPE_WITHER_TIME,
  TEXT,
} from './data/farmConfig';
import {
  SceneLayout,
  computeSceneLayout,
  hitTestScene,
  renderFarmScene,
  tileToScreen,
} from './engine/isometricRenderer';
import {
  AnimalId,
  CropId,
  FarmAnimal,
  FarmTile,
  FloatingText,
  FlyingItem,
  GameHUDState,
  GamePhase,
  HighScoreEntry,
  Language,
  MarketOrder,
  Particle,
} from './types/game';
import {
  loadHighScores,
  loadLanguage,
  loadMuted,
  saveHighScore,
  saveLanguage,
  saveMuted,
} from './utils/storage';

function createMarketOrder(orderNumber: number): MarketOrder {
  const pool: CropId[] =
    orderNumber <= 1
      ? ['wheat', 'strawberry', 'corn']
      : ['wheat', 'corn', 'strawberry', 'pumpkin'];

  const firstIdx = Math.floor(Math.random() * pool.length);
  const secondIdx = (firstIdx + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;

  const cropA = pool[firstIdx];
  const cropB = pool[secondIdx];

  const reqA = cropA === 'pumpkin' ? 1 + Math.min(2, Math.floor(orderNumber / 3)) : 2 + Math.min(2, Math.floor(orderNumber / 2));
  const reqB = cropB === 'pumpkin' ? 1 : 2 + Math.min(2, Math.floor(orderNumber / 3));

  return {
    id: orderNumber,
    items: [
      { cropId: cropA, required: reqA, collected: 0 },
      { cropId: cropB, required: reqB, collected: 0 },
    ],
    bonusPoints: 250 + orderNumber * 75,
    bonusTime: 8,
    completedFlash: 0,
  };
}

function createInitialTiles(): FarmTile[] {
  const tiles: FarmTile[] = [];
  // Pre-seed center plots so the first 10 seconds are packed with immediate action!
  const presetRipe: Record<number, CropId> = {
    5: 'wheat',
    6: 'strawberry',
    9: 'corn',
    10: 'wheat',
  };
  const presetGrowing: Record<number, { crop: CropId; progress: number; needsWater: boolean }> = {
    1: { crop: 'wheat', progress: 0.68, needsWater: true },
    4: { crop: 'corn', progress: 0.55, needsWater: false },
    7: { crop: 'strawberry', progress: 0.6, needsWater: true },
    14: { crop: 'pumpkin', progress: 0.48, needsWater: false },
  };

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const index = row * GRID_COLS + col;
      if (presetRipe[index]) {
        tiles.push({
          index,
          row,
          col,
          cropId: presetRipe[index],
          state: 'ripe',
          growthProgress: 1,
          watered: true,
          needsWater: false,
          ripeTimer: 0,
          hasCrow: false,
          crowTimer: 0,
          bounceScale: 1,
          bounceVelocity: 0,
          flashTimer: 0,
        });
      } else if (presetGrowing[index]) {
        const g = presetGrowing[index];
        tiles.push({
          index,
          row,
          col,
          cropId: g.crop,
          state: 'growing',
          growthProgress: g.progress,
          watered: !g.needsWater,
          needsWater: g.needsWater,
          ripeTimer: 0,
          hasCrow: false,
          crowTimer: 0,
          bounceScale: 1,
          bounceVelocity: 0,
          flashTimer: 0,
        });
      } else {
        tiles.push({
          index,
          row,
          col,
          cropId: null,
          state: 'empty',
          growthProgress: 0,
          watered: false,
          needsWater: false,
          ripeTimer: 0,
          hasCrow: false,
          crowTimer: 0,
          bounceScale: 1,
          bounceVelocity: 0,
          flashTimer: 0,
        });
      }
    }
  }
  return tiles;
}

function createInitialAnimals(): Record<AnimalId, FarmAnimal> {
  return {
    cow: {
      id: 'cow',
      ...ANIMAL_CONFIGS.cow,
      progress: ANIMAL_CONFIGS.cow.cooldown * 0.72,
      ready: false,
      bounce: 1,
      bounceVel: 0,
      animPhase: 0,
    },
    hen: {
      id: 'hen',
      ...ANIMAL_CONFIGS.hen,
      progress: ANIMAL_CONFIGS.hen.cooldown,
      ready: true, // Hen starts with a ready golden egg!
      bounce: 1,
      bounceVel: 0,
      animPhase: 1.2,
    },
    hive: {
      id: 'hive',
      ...ANIMAL_CONFIGS.hive,
      progress: ANIMAL_CONFIGS.hive.cooldown * 0.45,
      ready: false,
      bounce: 1,
      bounceVel: 0,
      animPhase: 2.4,
    },
  };
}

export function App() {
  const [lang, setLang] = useState<Language>(() => loadLanguage());
  const [muted, setMuted] = useState<boolean>(() => {
    const m = loadMuted();
    soundEngine.setMuted(m);
    return m;
  });
  const [highScores, setHighScores] = useState<HighScoreEntry[]>(() => loadHighScores());
  const [lastSavedScoreId, setLastSavedScoreId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<SceneLayout>(
    computeSceneLayout(window.innerWidth, window.innerHeight, lang)
  );
  const spaceHeldRef = useRef<boolean>(false);

  // Mutable simulation engine state for locked 60fps performance
  const engineRef = useRef({
    phase: 'start' as GamePhase,
    time: 0,
    score: 0,
    coins: 0,
    timeLeft: INITIAL_GAME_TIME,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    feverMeter: 0,
    feverActive: false,
    feverTimeLeft: 0,
    selectedCrop: 'wheat' as CropId,
    harvestedCount: 0,
    ordersCompleted: 0,
    activeOrder: createMarketOrder(1),
    isNewHighScore: false,
    tiles: createInitialTiles(),
    animals: createInitialAnimals(),
    particles: [] as Particle[],
    flyingItems: [] as FlyingItem[],
    floatingTexts: [] as FloatingText[],
    cursorTarget: { type: 'tile', index: 5 } as
      | { type: 'tile'; index: number }
      | { type: 'animal'; animalId: AnimalId }
      | null,
    shakeTrauma: 0,
    crowSpawnCooldown: 9.5,
    gameOverTimestamp: 0,
  });

  const [hud, setHud] = useState<GameHUDState>(() => ({
    phase: 'start',
    score: 0,
    coins: 0,
    timeLeft: INITIAL_GAME_TIME,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    feverMeter: 0,
    feverActive: false,
    feverTimeLeft: 0,
    selectedCrop: 'wheat',
    harvestedCount: 0,
    ordersCompleted: 0,
    activeOrder: engineRef.current.activeOrder,
    isNewHighScore: false,
    highScores,
  }));

  const syncHudNow = useCallback((latestScores?: HighScoreEntry[]) => {
    const e = engineRef.current;
    setHud({
      phase: e.phase,
      score: e.score,
      coins: e.coins,
      timeLeft: e.timeLeft,
      combo: e.combo,
      maxCombo: e.maxCombo,
      comboTimer: Math.max(0, Math.min(1, e.comboTimer / 3.4)),
      feverMeter: e.feverMeter,
      feverActive: e.feverActive,
      feverTimeLeft: e.feverTimeLeft,
      selectedCrop: e.selectedCrop,
      harvestedCount: e.harvestedCount,
      ordersCompleted: e.ordersCompleted,
      activeOrder: {
        ...e.activeOrder,
        items: e.activeOrder.items.map((it) => ({ ...it })),
      },
      isNewHighScore: e.isNewHighScore,
      highScores: latestScores ?? highScores,
    });
  }, [highScores]);

  // Keep HTML dir and lang synced
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const spawnParticles = useCallback(
    (
      x: number,
      y: number,
      count: number,
      colors: string[],
      shape: Particle['shape'] = 'circle',
      speedScale = 1
    ) => {
      const e = engineRef.current;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
        const speed = (45 + Math.random() * 95) * speedScale;
        e.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 45 * speedScale,
          gravity: shape === 'ring' ? 0 : 260,
          size: shape === 'ring' ? 14 : 3.5 + Math.random() * 4,
          color: colors[i % colors.length],
          alpha: 1,
          life: 0,
          maxLife: shape === 'ring' ? 0.36 : 0.42 + Math.random() * 0.3,
          shape,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 8,
        });
      }
    },
    []
  );

  const spawnFloatingText = useCallback(
    (x: number, y: number, text: string, color = '#ffe066', strokeColor = '#4a2508', subText?: string) => {
      engineRef.current.floatingTexts.push({
        x,
        y,
        vy: -52,
        text,
        subText,
        color,
        strokeColor,
        scale: 1.15,
        life: 0,
        maxLife: 0.95,
      });
    },
    []
  );

  const addTrauma = useCallback((amount: number) => {
    engineRef.current.shakeTrauma = Math.min(1, engineRef.current.shakeTrauma + amount);
  }, []);

  const startNewGame = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    soundEngine.startMusic();

    const e = engineRef.current;
    e.phase = 'playing';
    e.score = 0;
    e.coins = 0;
    e.timeLeft = INITIAL_GAME_TIME;
    e.combo = 0;
    e.maxCombo = 0;
    e.comboTimer = 0;
    e.feverMeter = 0;
    e.feverActive = false;
    e.feverTimeLeft = 0;
    e.harvestedCount = 0;
    e.ordersCompleted = 0;
    e.activeOrder = createMarketOrder(1);
    e.isNewHighScore = false;
    e.tiles = createInitialTiles();
    e.animals = createInitialAnimals();
    e.particles = [];
    e.flyingItems = [];
    e.floatingTexts = [];
    e.cursorTarget = { type: 'tile', index: 5 };
    e.shakeTrauma = 0;
    e.crowSpawnCooldown = 10;

    setLastSavedScoreId(null);
    syncHudNow();
  }, [syncHudNow]);

  const finishGame = useCallback(() => {
    const e = engineRef.current;
    if (e.phase === 'gameover') return;
    e.phase = 'gameover';
    e.gameOverTimestamp = performance.now();
    soundEngine.stopMusic();
    soundEngine.playGameOver();

    const dict = TEXT[lang];
    const { scores, isNewRecord, savedId } = saveHighScore({
      playerName: dict.youLabel,
      score: e.score,
      harvested: e.harvestedCount,
      bestCombo: e.maxCombo,
      dateLabel: new Date().toLocaleDateString(),
    });

    e.isNewHighScore = isNewRecord;
    setHighScores(scores);
    setLastSavedScoreId(savedId);
    syncHudNow(scores);
  }, [lang, syncHudNow]);

  const togglePause = useCallback(() => {
    const e = engineRef.current;
    if (e.phase === 'playing') {
      e.phase = 'paused';
      soundEngine.stopMusic();
      soundEngine.playClick();
      syncHudNow();
    } else if (e.phase === 'paused') {
      e.phase = 'playing';
      soundEngine.playClick();
      soundEngine.startMusic();
      syncHudNow();
    }
  }, [syncHudNow]);

  const goToMainMenu = useCallback(() => {
    const e = engineRef.current;
    e.phase = 'start';
    e.tiles = createInitialTiles();
    e.animals = createInitialAnimals();
    soundEngine.stopMusic();
    soundEngine.playClick();
    syncHudNow();
  }, [syncHudNow]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      saveMuted(next);
      if (!next && engineRef.current.phase === 'playing') {
        soundEngine.startMusic();
      }
      return next;
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    soundEngine.playClick();
    setLang((prev) => {
      const next: Language = prev === 'ar' ? 'en' : 'ar';
      saveLanguage(next);
      return next;
    });
  }, []);

  const selectCrop = useCallback(
    (cropId: CropId) => {
      soundEngine.playClick();
      engineRef.current.selectedCrop = cropId;
      syncHudNow();
    },
    [syncHudNow]
  );

  // Core Smart Tile Action: Shoo Crow -> Harvest Ripe -> Clear Withered -> Water Thirsty -> Plant Seed
  const interactWithTile = useCallback(
    (index: number, filterMode?: 'harvest_or_care' | 'plant_only'): boolean => {
      const e = engineRef.current;
      if (e.phase !== 'playing') return false;
      const tile = e.tiles[index];
      if (!tile) return false;

      const layout = layoutRef.current;
      const pos = tileToScreen(tile.row, tile.col, layout);
      const dict = TEXT[lang];

      // 1. Shoo Crow
      if (tile.hasCrow) {
        tile.hasCrow = false;
        tile.crowTimer = 0;
        tile.bounceScale = 1.25;
        tile.flashTimer = 0.25;

        e.combo++;
        e.maxCombo = Math.max(e.maxCombo, e.combo);
        e.comboTimer = 3.4;
        const pts = 75 * (e.feverActive ? 2 : 1);
        e.score += pts;
        e.timeLeft = Math.min(120, e.timeLeft + 2);

        soundEngine.playCrowShoo();
        addTrauma(0.28);
        spawnParticles(pos.x, pos.y - 18, 12, ['#2b2d42', '#ffd166', '#ffffff'], 'star', 1.1);
        spawnFloatingText(
          pos.x,
          pos.y - 28,
          `+${pts}`,
          '#ffd166',
          '#1d1d2e',
          `${dict.shooCrowText} +2${dict.bonusTimeUnit}`
        );
        syncHudNow();
        return true;
      }

      // 2. Harvest Ripe Crop
      if (tile.state === 'ripe' && tile.cropId) {
        const crop = CROPS[tile.cropId];
        const harvestedCropId = tile.cropId;

        e.combo++;
        e.maxCombo = Math.max(e.maxCombo, e.combo);
        e.comboTimer = 3.4;
        e.harvestedCount++;

        const comboMult = 1 + Math.min(4, Math.floor((e.combo - 1) / 2) * 0.5);
        const feverMult = e.feverActive ? 2 : 1;
        const earnedPoints = Math.round(crop.points * comboMult * feverMult);
        const earnedCoins = crop.coins * feverMult;

        e.score += earnedPoints;
        e.coins += earnedCoins;

        // Every 3rd combo gives +1s bonus time!
        let timeBonusMsg = '';
        if (e.combo > 0 && e.combo % 3 === 0) {
          e.timeLeft = Math.min(120, e.timeLeft + 1.5);
          timeBonusMsg = ` • +1.5${dict.bonusTimeUnit}`;
        }

        // Fill Fever Meter
        if (!e.feverActive) {
          e.feverMeter = Math.min(1, e.feverMeter + 0.14);
          if (e.feverMeter >= 1) {
            e.feverActive = true;
            e.feverTimeLeft = 10;
            e.feverMeter = 0;
            soundEngine.playFeverStart();
            addTrauma(0.48);
            spawnFloatingText(
              layout.gridCenterX,
              layout.gridCenterY - 40,
              dict.feverActivatedText,
              '#fff3b0',
              '#b54400'
            );
          }
        }

        // Check Market Order progress
        let orderJustCompleted = false;
        for (const item of e.activeOrder.items) {
          if (item.cropId === harvestedCropId && item.collected < item.required) {
            item.collected++;
            break;
          }
        }

        const allDone = e.activeOrder.items.every((it) => it.collected >= it.required);
        if (allDone) {
          orderJustCompleted = true;
          e.ordersCompleted++;
          e.score += e.activeOrder.bonusPoints;
          e.timeLeft = Math.min(120, e.timeLeft + e.activeOrder.bonusTime);
          soundEngine.playOrderComplete();
          addTrauma(0.5);
          spawnParticles(
            layout.gridCenterX,
            layout.gridCenterY - 20,
            24,
            ['#ffbe0b', '#fb5607', '#ff006e', '#8ac926', '#1982c4'],
            'star',
            1.5
          );
          spawnFloatingText(
            layout.gridCenterX,
            layout.gridCenterY - 70,
            `+${e.activeOrder.bonusPoints}`,
            '#80ff72',
            '#1b4332',
            `${dict.orderCompleteText} +${e.activeOrder.bonusTime}${dict.bonusTimeUnit}`
          );
          e.activeOrder = createMarketOrder(e.ordersCompleted + 1);
          e.activeOrder.completedFlash = 0.6;
        }

        // Reset tile
        tile.cropId = null;
        tile.state = 'empty';
        tile.growthProgress = 0;
        tile.watered = false;
        tile.needsWater = false;
        tile.ripeTimer = 0;
        tile.bounceScale = 1.28;
        tile.flashTimer = 0.25;

        // Juicy visuals & audio
        soundEngine.playHarvest(e.combo);
        addTrauma(harvestedCropId === 'pumpkin' ? 0.35 : 0.16);

        spawnParticles(
          pos.x,
          pos.y - 12,
          12,
          [crop.primaryColor, crop.secondaryColor, '#ffd166', '#ffffff'],
          'star',
          1.05
        );

        // Flying crop & coin to HUD
        e.flyingItems.push({
          startX: pos.x,
          startY: pos.y - 16,
          targetX: layout.hudScoreTarget.x,
          targetY: layout.hudScoreTarget.y,
          progress: 0,
          duration: 0.48,
          cropId: harvestedCropId,
          kind: 'crop',
        });
        e.flyingItems.push({
          startX: pos.x + 10,
          startY: pos.y - 10,
          targetX: layout.hudScoreTarget.x + 30,
          targetY: layout.hudScoreTarget.y,
          progress: 0,
          duration: 0.56,
          kind: 'coin',
        });

        if (!orderJustCompleted) {
          const sub =
            e.combo >= 2
              ? `×${e.combo} ${dict.combo}${timeBonusMsg}`
              : timeBonusMsg || undefined;
          spawnFloatingText(pos.x, pos.y - 26, `+${earnedPoints}`, '#ffe066', '#5c2d0c', sub);
        }

        syncHudNow();
        return true;
      }

      // 3. Clear Withered Crop
      if (tile.state === 'withered') {
        tile.cropId = null;
        tile.state = 'empty';
        tile.growthProgress = 0;
        tile.watered = false;
        tile.needsWater = false;
        tile.ripeTimer = 0;
        tile.bounceScale = 1.18;
        soundEngine.playPlant();
        spawnParticles(pos.x, pos.y - 6, 8, ['#7f5539', '#9c6644', '#a3b18a'], 'square', 0.8);
        return true;
      }

      // 4. Water Thirsty Crop
      if (tile.state === 'growing' && tile.needsWater) {
        tile.watered = true;
        tile.needsWater = false;
        tile.growthProgress = Math.min(0.96, tile.growthProgress + 0.28);
        tile.bounceScale = 1.2;
        tile.flashTimer = 0.2;
        e.score += 15;

        soundEngine.playWater();
        spawnParticles(pos.x, pos.y - 10, 1, ['#48cae4'], 'ring', 1);
        spawnParticles(pos.x, pos.y - 12, 9, ['#00b4d8', '#90e0ef', '#ffffff'], 'drop', 0.85);
        spawnFloatingText(pos.x, pos.y - 24, '+15', '#90e0ef', '#023e8a', dict.wateredText);
        syncHudNow();
        return true;
      }

      // 5. Plant Seed on Empty Tile
      if (tile.state === 'empty' && filterMode !== 'harvest_or_care') {
        const seed = e.selectedCrop;
        tile.cropId = seed;
        tile.state = 'growing';
        tile.growthProgress = 0.06;
        tile.watered = e.feverActive; // Sun fever auto-hydrates!
        tile.needsWater = !e.feverActive && Math.random() < 0.58;
        tile.ripeTimer = 0;
        tile.bounceScale = 1.22;
        tile.flashTimer = 0.15;
        e.score += 10;

        soundEngine.playPlant();
        spawnParticles(pos.x, pos.y - 4, 7, ['#9c6234', '#6b3e1f', '#8ac926'], 'square', 0.72);
        syncHudNow();
        return true;
      }

      return false;
    },
    [addTrauma, lang, spawnFloatingText, spawnParticles, syncHudNow]
  );

  // Collect Product from Happy Cow, Busy Hen, or Honey Beehive
  const interactWithAnimal = useCallback(
    (animalId: AnimalId): boolean => {
      const e = engineRef.current;
      if (e.phase !== 'playing') return false;
      const animal = e.animals[animalId];
      if (!animal || !animal.ready) return false;

      const layout = layoutRef.current;
      const pos = layout.animalPositions[animalId];
      const dict = TEXT[lang];

      animal.ready = false;
      animal.progress = 0;
      animal.bounce = 1.32;

      e.combo++;
      e.maxCombo = Math.max(e.maxCombo, e.combo);
      e.comboTimer = 3.4;

      const pts = animal.points * (e.feverActive ? 2 : 1);
      e.score += pts;
      e.timeLeft = Math.min(120, e.timeLeft + animal.bonusTime);

      if (animal.triggersFever) {
        e.feverActive = true;
        e.feverTimeLeft = 10;
        e.feverMeter = 0;
        soundEngine.playFeverStart();
        addTrauma(0.45);
      } else {
        soundEngine.playAnimal(animalId);
        addTrauma(0.22);
      }

      spawnParticles(pos.x, pos.y - 12, 14, ['#ffd166', '#fff3b0', '#ffffff', '#ff9f1c'], 'star', 1.1);
      e.flyingItems.push({
        startX: pos.x,
        startY: pos.y - 16,
        targetX: layout.hudScoreTarget.x,
        targetY: layout.hudScoreTarget.y,
        progress: 0,
        duration: 0.52,
        kind: animalId === 'cow' ? 'milk' : animalId === 'hen' ? 'egg' : 'honey',
      });

      const productLabel = lang === 'ar' ? animal.productAr : animal.productEn;
      spawnFloatingText(
        pos.x,
        pos.y - 32,
        `+${pts}`,
        '#ffe066',
        '#5c2d0c',
        `${productLabel} • +${animal.bonusTime}${dict.bonusTimeUnit}`
      );

      syncHudNow();
      return true;
    },
    [addTrauma, lang, spawnFloatingText, spawnParticles, syncHudNow]
  );

  // Pointer & Touch Drag-Sweep Input Handling
  const dragStateRef = useRef<{
    active: boolean;
    mode: 'harvest_or_care' | 'plant_only' | null;
    visitedTiles: Set<number>;
  }>({
    active: false,
    mode: null,
    visitedTiles: new Set(),
  });

  const handlePointerDown = useCallback(
    (ev: React.PointerEvent<HTMLCanvasElement>) => {
      const e = engineRef.current;
      if (e.phase !== 'playing') return;

      soundEngine.unlock();
      const rect = ev.currentTarget.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;

      const hit = hitTestScene(px, py, layoutRef.current);
      if (!hit) return;

      if (hit.type === 'animal') {
        e.cursorTarget = { type: 'animal', animalId: hit.animalId };
        interactWithAnimal(hit.animalId);
        dragStateRef.current = { active: true, mode: 'harvest_or_care', visitedTiles: new Set() };
        return;
      }

      e.cursorTarget = { type: 'tile', index: hit.index };
      const tile = e.tiles[hit.index];
      const isEmptyStart = tile.state === 'empty' && !tile.hasCrow;
      const mode = isEmptyStart ? 'plant_only' : 'harvest_or_care';

      dragStateRef.current = {
        active: true,
        mode,
        visitedTiles: new Set([hit.index]),
      };
      interactWithTile(hit.index);
    },
    [interactWithAnimal, interactWithTile]
  );

  const handlePointerMove = useCallback(
    (ev: React.PointerEvent<HTMLCanvasElement>) => {
      const e = engineRef.current;
      if (e.phase !== 'playing') return;

      const rect = ev.currentTarget.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      const hit = hitTestScene(px, py, layoutRef.current);

      if (hit) {
        e.cursorTarget =
          hit.type === 'tile'
            ? { type: 'tile', index: hit.index }
            : { type: 'animal', animalId: hit.animalId };
      }

      if (!dragStateRef.current.active || !hit) return;

      if (hit.type === 'animal') {
        interactWithAnimal(hit.animalId);
      } else if (!dragStateRef.current.visitedTiles.has(hit.index)) {
        dragStateRef.current.visitedTiles.add(hit.index);
        interactWithTile(hit.index, dragStateRef.current.mode ?? undefined);
      }
    },
    [interactWithAnimal, interactWithTile]
  );

  const handlePointerUp = useCallback(() => {
    dragStateRef.current.active = false;
    dragStateRef.current.mode = null;
    dragStateRef.current.visitedTiles.clear();
  }, []);

  // Keyboard Controls: WASD / Arrows + Space/Enter + 1-4 + P/Escape
  useEffect(() => {
    const animalOrder: AnimalId[] = ['cow', 'hen', 'hive'];

    const triggerCursorAction = () => {
      const e = engineRef.current;
      if (!e.cursorTarget) return;
      if (e.cursorTarget.type === 'tile') {
        interactWithTile(e.cursorTarget.index);
      } else {
        interactWithAnimal(e.cursorTarget.animalId);
      }
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      const e = engineRef.current;
      const key = ev.key;

      // Pause / Resume with P or Escape
      if (key === 'Escape' || key === 'p' || key === 'P') {
        if (e.phase === 'playing' || e.phase === 'paused') {
          ev.preventDefault();
          togglePause();
        }
        return;
      }

      // Start or Instant Restart with Space / Enter
      if (e.phase === 'start' && (key === ' ' || key === 'Enter')) {
        ev.preventDefault();
        startNewGame();
        return;
      }
      if (e.phase === 'gameover' && (key === ' ' || key === 'Enter')) {
        if (performance.now() - e.gameOverTimestamp > 500) {
          ev.preventDefault();
          startNewGame();
        }
        return;
      }

      if (e.phase !== 'playing') return;

      // Number keys 1-4 for Crop Selection
      if (key >= '1' && key <= '4') {
        const idx = Number(key) - 1;
        if (CROP_ORDER[idx]) {
          ev.preventDefault();
          selectCrop(CROP_ORDER[idx]);
        }
        return;
      }

      // Space / Enter Action
      if (key === ' ' || key === 'Enter') {
        ev.preventDefault();
        if (key === ' ') spaceHeldRef.current = true;
        triggerCursorAction();
        return;
      }

      // Directional Cursor Movement (WASD or Arrow Keys)
      let dr = 0;
      let dc = 0;
      if (key === 'ArrowUp' || key === 'w' || key === 'W') dr = -1;
      else if (key === 'ArrowDown' || key === 's' || key === 'S') dr = 1;
      else if (key === 'ArrowLeft' || key === 'a' || key === 'A') dc = -1;
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') dc = 1;
      else return;

      ev.preventDefault();

      const cur = e.cursorTarget ?? { type: 'tile', index: 5 };
      if (cur.type === 'animal') {
        const aIdx = animalOrder.indexOf(cur.animalId);
        if (dc < 0) {
          // Step back onto the right column of the farm grid
          const targetRow = Math.min(GRID_ROWS - 1, aIdx);
          e.cursorTarget = { type: 'tile', index: targetRow * GRID_COLS + (GRID_COLS - 1) };
        } else if (dr !== 0) {
          const nextA = (aIdx + dr + animalOrder.length) % animalOrder.length;
          e.cursorTarget = { type: 'animal', animalId: animalOrder[nextA] };
        }
      } else {
        const row = Math.floor(cur.index / GRID_COLS);
        const col = cur.index % GRID_COLS;

        if (col + dc >= GRID_COLS) {
          // Step onto the animals pasture!
          const targetAnimal = animalOrder[Math.min(animalOrder.length - 1, row)];
          e.cursorTarget = { type: 'animal', animalId: targetAnimal };
        } else {
          const nr = (row + dr + GRID_ROWS) % GRID_ROWS;
          const nc = (col + dc + GRID_COLS) % GRID_COLS;
          e.cursorTarget = { type: 'tile', index: nr * GRID_COLS + nc };
        }
      }

      // If Spacebar or Shift is held while moving, tractor-sweep!
      if (spaceHeldRef.current || ev.shiftKey) {
        triggerCursorAction();
      }
    };

    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === ' ') {
        spaceHeldRef.current = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [interactWithAnimal, interactWithTile, selectCrop, startNewGame, togglePause]);

  // Main 60fps Canvas Resize & RequestAnimationFrame Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutRef.current = computeSceneLayout(w, h, lang);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const e = engineRef.current;
      const layout = layoutRef.current;
      const dict = TEXT[lang];

      if (e.phase !== 'paused') {
        e.time += dt;
      }

      // Active Gameplay Simulation
      if (e.phase === 'playing') {
        // Countdown Clock
        e.timeLeft -= dt;
        if (e.timeLeft <= 0) {
          e.timeLeft = 0;
          finishGame();
        }

        // Fever Timer
        if (e.feverActive) {
          e.feverTimeLeft -= dt;
          if (e.feverTimeLeft <= 0) {
            e.feverActive = false;
            e.feverTimeLeft = 0;
          }
        }

        // Combo Decay Timer
        if (e.combo > 0) {
          e.comboTimer -= dt;
          if (e.comboTimer <= 0) {
            e.combo = 0;
            e.comboTimer = 0;
          }
        }

        // Market Order Flash Decay
        if (e.activeOrder.completedFlash > 0) {
          e.activeOrder.completedFlash = Math.max(0, e.activeOrder.completedFlash - dt);
        }

        // Occasional Mischievous Crow Spawner
        e.crowSpawnCooldown -= dt;
        if (e.crowSpawnCooldown <= 0) {
          e.crowSpawnCooldown = 8.5 + Math.random() * 5;
          const candidates = e.tiles.filter(
            (t) => (t.state === 'growing' || t.state === 'ripe') && !t.hasCrow
          );
          if (candidates.length > 0) {
            const victim = candidates[Math.floor(Math.random() * candidates.length)];
            victim.hasCrow = true;
            victim.crowTimer = 0;
            victim.bounceScale = 1.15;
          }
        }

        // Update All 16 Farm Tiles
        for (const tile of e.tiles) {
          // Spring physics for tile bounce
          const displacement = 1 - tile.bounceScale;
          tile.bounceVelocity += displacement * 190 * dt;
          tile.bounceVelocity *= Math.pow(0.08, dt);
          tile.bounceScale += tile.bounceVelocity * dt;

          if (tile.flashTimer > 0) {
            tile.flashTimer = Math.max(0, tile.flashTimer - dt);
          }

          // Crow eating timer
          if (tile.hasCrow) {
            tile.crowTimer += dt;
            if (tile.crowTimer >= CROW_EAT_TIME) {
              tile.hasCrow = false;
              tile.crowTimer = 0;
              tile.cropId = null;
              tile.state = 'empty';
              tile.growthProgress = 0;
              tile.watered = false;
              tile.needsWater = false;
              tile.bounceScale = 0.85;
              soundEngine.playWither();
              const pos = tileToScreen(tile.row, tile.col, layout);
              spawnParticles(pos.x, pos.y - 10, 8, ['#2b2d42', '#7f5539'], 'square', 0.8);
            }
            continue;
          }

          // Crop Growth
          if (tile.state === 'growing' && tile.cropId) {
            const cropDef = CROPS[tile.cropId];
            const waterSpeed = tile.watered ? 1.55 : tile.needsWater ? 0.65 : 1.0;
            const feverSpeed = e.feverActive ? 2.0 : 1.0;
            tile.growthProgress += (dt / cropDef.growDuration) * waterSpeed * feverSpeed;

            if (tile.growthProgress >= 1) {
              tile.growthProgress = 1;
              tile.state = 'ripe';
              tile.needsWater = false;
              tile.ripeTimer = 0;
              tile.bounceScale = 1.24;
              const pos = tileToScreen(tile.row, tile.col, layout);
              spawnParticles(pos.x, pos.y - 16, 6, ['#ffe066', '#ffffff'], 'star', 0.65);
            }
          } else if (tile.state === 'ripe') {
            tile.ripeTimer += dt;
            if (tile.ripeTimer >= RIPE_WITHER_TIME) {
              tile.state = 'withered';
              tile.ripeTimer = 0;
              tile.bounceScale = 0.86;
              e.combo = 0;
              e.comboTimer = 0;
              soundEngine.playWither();
              const pos = tileToScreen(tile.row, tile.col, layout);
              spawnFloatingText(pos.x, pos.y - 20, dict.witheredText, '#ff8fa3', '#590d22');
            }
          }
        }

        // Update Farm Animals
        (['cow', 'hen', 'hive'] as AnimalId[]).forEach((id) => {
          const animal = e.animals[id];
          const disp = 1 - animal.bounce;
          animal.bounceVel += disp * 180 * dt;
          animal.bounceVel *= Math.pow(0.08, dt);
          animal.bounce += animal.bounceVel * dt;

          if (!animal.ready) {
            animal.progress += dt * (e.feverActive ? 1.75 : 1);
            if (animal.progress >= animal.cooldown) {
              animal.progress = animal.cooldown;
              animal.ready = true;
              animal.bounce = 1.25;
            }
          }
        });
      } else if (e.phase === 'start') {
        // Gentle live diorama animation on start screen
        for (const tile of e.tiles) {
          if (tile.state === 'growing' && tile.cropId) {
            tile.growthProgress += dt * 0.14;
            if (tile.growthProgress >= 1) {
              tile.growthProgress = 0.15;
            }
          }
        }
      }

      // Update Particles, Flying Items, Floating Texts & Camera Shake (active in playing & gameover)
      if (e.phase !== 'paused') {
        for (let i = e.particles.length - 1; i >= 0; i--) {
          const p = e.particles[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            e.particles.splice(i, 1);
            continue;
          }
          p.vy += p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rotation += p.vRot * dt;
          if (p.shape === 'ring') {
            p.size += 55 * dt;
          }
          p.alpha = 1 - p.life / p.maxLife;
        }

        for (let i = e.flyingItems.length - 1; i >= 0; i--) {
          const item = e.flyingItems[i];
          item.progress += dt / item.duration;
          if (item.progress >= 1) {
            e.flyingItems.splice(i, 1);
          }
        }

        for (let i = e.floatingTexts.length - 1; i >= 0; i--) {
          const ft = e.floatingTexts[i];
          ft.life += dt;
          if (ft.life >= ft.maxLife) {
            e.floatingTexts.splice(i, 1);
            continue;
          }
          ft.y += ft.vy * dt;
          ft.vy *= Math.pow(0.25, dt);
          ft.scale = 1 + Math.sin(Math.min(1, ft.life * 5) * Math.PI) * 0.16;
        }

        e.shakeTrauma = Math.max(0, e.shakeTrauma - dt * 2.4);
      }

      const shakeMag = e.shakeTrauma * e.shakeTrauma * 14;
      const shakeOffset = {
        x: (Math.random() * 2 - 1) * shakeMag,
        y: (Math.random() * 2 - 1) * shakeMag,
      };

      // Render 60fps Isometric Farm Canvas
      renderFarmScene(ctx, layout, {
        time: e.time,
        tiles: e.tiles,
        animals: e.animals,
        particles: e.particles,
        flyingItems: e.flyingItems,
        floatingTexts: e.floatingTexts,
        cursorTarget: e.cursorTarget,
        feverActive: e.feverActive,
        shakeOffset,
        lang,
        isInteractive: e.phase === 'playing',
      });

      // Throttled HUD sync for smooth countdown timer & progress bars
      if (e.phase === 'playing') {
        hudSyncAccum += dt;
        if (hudSyncAccum >= 0.08) {
          hudSyncAccum = 0;
          syncHudNow();
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [finishGame, lang, spawnFloatingText, spawnParticles, syncHudNow]);

  // Stop music on unmount
  useEffect(() => {
    return () => {
      soundEngine.stopMusic();
    };
  }, []);

  return (
    <main className="relative h-full w-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="block h-full w-full cursor-pointer touch-none"
      />

      {hud.phase === 'playing' && (
        <GameHUD
          hud={hud}
          lang={lang}
          muted={muted}
          onSelectCrop={selectCrop}
          onTogglePause={togglePause}
          onToggleMute={toggleMute}
        />
      )}

      {hud.phase === 'start' && (
        <StartOverlay
          lang={lang}
          muted={muted}
          highScores={highScores}
          onStart={startNewGame}
          onToggleLang={toggleLanguage}
          onToggleMute={toggleMute}
        />
      )}

      {hud.phase === 'paused' && (
        <PauseOverlay
          lang={lang}
          muted={muted}
          onResume={togglePause}
          onRestart={startNewGame}
          onMainMenu={goToMainMenu}
          onToggleMute={toggleMute}
        />
      )}

      {hud.phase === 'gameover' && (
        <GameOverOverlay
          hud={hud}
          lang={lang}
          lastSavedId={lastSavedScoreId}
          onRestart={startNewGame}
          onMainMenu={goToMainMenu}
        />
      )}
    </main>
  );
}

export default App;
