import {
  ANIMAL_CONFIGS,
  CROPS,
  CROW_EAT_TIME,
  GRID_COLS,
  GRID_ROWS,
  RIPE_WITHER_TIME,
} from '../data/farmConfig';
import {
  AnimalId,
  CropId,
  FarmAnimal,
  FarmTile,
  FloatingText,
  FlyingItem,
  Language,
  Particle,
} from '../types/game';

export interface SceneLayout {
  width: number;
  height: number;
  tileW: number;
  tileH: number;
  originX: number; // Top corner of (0,0) tile
  originY: number;
  gridCenterX: number;
  gridCenterY: number;
  animalPositions: Record<AnimalId, { x: number; y: number; radius: number }>;
  hudScoreTarget: { x: number; y: number };
  isCompact: boolean;
}

export function computeSceneLayout(
  width: number,
  height: number,
  lang: Language = 'ar'
): SceneLayout {
  const isCompact = width < 720;
  const topSafe = isCompact
    ? Math.max(112, Math.min(126, height * 0.165))
    : Math.max(82, Math.min(104, height * 0.125));
  const bottomSafe = isCompact
    ? Math.max(84, Math.min(102, height * 0.125))
    : Math.max(92, Math.min(114, height * 0.135));
  const availH = Math.max(240, height - topSafe - bottomSafe);
  const availW = Math.max(280, width - 24);

  let tileW: number;
  let tileH: number;
  let gridCenterX: number;
  let gridCenterY: number;
  let animalPositions: Record<AnimalId, { x: number; y: number; radius: number }>;

  if (!isCompact) {
    // Landscape / Desktop: grid on center-left, animals on right pasture
    tileW = Math.max(68, Math.min(availW / 5.5, availH / 3.15, 144));
    tileH = tileW * 0.52;
    gridCenterX = width * 0.44;
    gridCenterY = topSafe + availH * 0.54;

    const animalRadius = Math.max(28, Math.min(44, tileW * 0.33));
    const rightX = Math.min(width - animalRadius - 24, gridCenterX + tileW * 2.38);
    const startY = gridCenterY - tileH * 1.15;
    const stepY = tileH * 1.25;
    animalPositions = {
      cow: { x: rightX, y: startY, radius: animalRadius },
      hen: { x: rightX + tileW * 0.12, y: startY + stepY, radius: animalRadius },
      hive: { x: rightX - tileW * 0.04, y: startY + stepY * 2, radius: animalRadius },
    };
  } else {
    // Portrait / Compact: upper pasture strip for barn + 3 animals, lower-center for 4x4 farm diamond
    const pastureBandH = Math.max(82, Math.min(104, availH * 0.21));
    const gridBandH = availH - pastureBandH;
    tileW = Math.max(58, Math.min(availW / 4.18, gridBandH / 2.3, 112));
    tileH = tileW * 0.52;
    gridCenterX = width * 0.5;
    gridCenterY = topSafe + pastureBandH + gridBandH * 0.52;

    const animalRadius = Math.max(22, Math.min(31, width * 0.068));
    const rowY = topSafe + pastureBandH * 0.48;
    animalPositions = {
      cow: { x: width * 0.52, y: rowY - 4, radius: animalRadius },
      hen: { x: width * 0.7, y: rowY + 6, radius: animalRadius },
      hive: { x: width * 0.87, y: rowY - 4, radius: animalRadius },
    };
  }

  const gridTotalH = (GRID_ROWS + GRID_COLS) * (tileH * 0.5);
  const originX = gridCenterX;
  const originY = gridCenterY - gridTotalH * 0.5;

  return {
    width,
    height,
    tileW,
    tileH,
    originX,
    originY,
    gridCenterX,
    gridCenterY,
    animalPositions,
    hudScoreTarget: { x: lang === 'ar' ? width * 0.84 : width * 0.16, y: 34 },
    isCompact,
  };
}

export function tileToScreen(
  row: number,
  col: number,
  layout: SceneLayout
): { x: number; y: number } {
  const halfW = layout.tileW * 0.5;
  const halfH = layout.tileH * 0.5;
  const x = layout.originX + (col - row) * halfW;
  const y = layout.originY + (col + row) * halfH + halfH; // center of diamond
  return { x, y };
}

export type HitTarget =
  | { type: 'tile'; row: number; col: number; index: number }
  | { type: 'animal'; animalId: AnimalId }
  | null;

export function hitTestScene(
  px: number,
  py: number,
  layout: SceneLayout
): HitTarget {
  // 1. Check animals first (generous circular target including floating bubble)
  const animalIds: AnimalId[] = ['cow', 'hen', 'hive'];
  for (const id of animalIds) {
    const pos = layout.animalPositions[id];
    const dx = px - pos.x;
    const dy = py - (pos.y - 6);
    const hitR = pos.radius * 1.25;
    if (dx * dx + dy * dy <= hitR * hitR) {
      return { type: 'animal', animalId: id };
    }
  }

  // 2. Inverse isometric transform for the 4x4 grid (with slight upward tolerance for tall crops)
  const halfW = layout.tileW * 0.5;
  const halfH = layout.tileH * 0.5;

  const testOffsets = [0, 10]; // check exact point first, then slightly lower in case user tapped top of tall crop
  for (const yOff of testOffsets) {
    const dx = px - layout.originX;
    const dy = py + yOff - layout.originY;
    const u = dx / halfW;
    const v = dy / halfH;
    const col = Math.floor((u + v) * 0.5);
    const row = Math.floor((v - u) * 0.5);

    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      return {
        type: 'tile',
        row,
        col,
        index: row * GRID_COLS + col,
      };
    }
  }

  return null;
}

export interface RenderState {
  time: number;
  tiles: FarmTile[];
  animals: Record<AnimalId, FarmAnimal>;
  particles: Particle[];
  flyingItems: FlyingItem[];
  floatingTexts: FloatingText[];
  cursorTarget: { type: 'tile'; index: number } | { type: 'animal'; animalId: AnimalId } | null;
  feverActive: boolean;
  shakeOffset: { x: number; y: number };
  lang: Language;
  isInteractive: boolean;
}

export function renderFarmScene(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  state: RenderState
) {
  const { width, height, tileW, tileH } = layout;
  const t = state.time;

  ctx.save();

  // 1. Sky Background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.65);
  if (state.feverActive) {
    skyGrad.addColorStop(0, '#ff9e2c');
    skyGrad.addColorStop(0.45, '#ffe074');
    skyGrad.addColorStop(1, '#e6f9c5');
  } else {
    skyGrad.addColorStop(0, '#49b6eb');
    skyGrad.addColorStop(0.55, '#9ee2ff');
    skyGrad.addColorStop(1, '#dff7c8');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Sun & Fever Sunbeams
  const sunX = width * 0.86;
  const sunY = Math.max(78, height * 0.14);
  if (state.feverActive) {
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(t * 0.35);
    ctx.fillStyle = 'rgba(255, 240, 140, 0.22)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-28, -width);
      ctx.lineTo(28, -width);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Glowing Sun
  ctx.save();
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 64);
  sunGlow.addColorStop(0, '#fffbe0');
  sunGlow.addColorStop(0.4, '#ffd43b');
  sunGlow.addColorStop(1, 'rgba(255, 212, 59, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 64, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 24 + Math.sin(t * 2.5) * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Drifting Fluffy Clouds
  drawCloud(ctx, ((t * 14) % (width + 220)) - 110, Math.max(66, height * 0.11), 0.95);
  drawCloud(ctx, ((t * 9 + width * 0.48) % (width + 240)) - 120, Math.max(94, height * 0.17), 0.72);

  // Apply Camera Shake for Ground & Farm World
  ctx.translate(state.shakeOffset.x, state.shakeOffset.y);

  // 2. Rolling Green Hills & Meadow Base
  const horizonY = Math.min(layout.originY + tileH * 0.4, height * 0.34);

  // Far hill
  ctx.fillStyle = '#73c247';
  ctx.beginPath();
  ctx.moveTo(-40, height);
  ctx.lineTo(-40, horizonY + 24);
  ctx.quadraticCurveTo(width * 0.28, horizonY - 34, width * 0.62, horizonY + 12);
  ctx.quadraticCurveTo(width * 0.85, horizonY + 34, width + 40, horizonY - 10);
  ctx.lineTo(width + 40, height);
  ctx.closePath();
  ctx.fill();

  // Main meadow ground
  const meadowGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  meadowGrad.addColorStop(0, '#62b638');
  meadowGrad.addColorStop(0.5, '#4d9b28');
  meadowGrad.addColorStop(1, '#397a1b');
  ctx.fillStyle = meadowGrad;
  ctx.beginPath();
  ctx.moveTo(-40, height + 40);
  ctx.lineTo(-40, horizonY + 36);
  ctx.quadraticCurveTo(width * 0.45, horizonY - 8, width + 40, horizonY + 28);
  ctx.lineTo(width + 40, height + 40);
  ctx.closePath();
  ctx.fill();

  // Subtle decorative grass tufts
  ctx.strokeStyle = 'rgba(162, 232, 102, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const tuftSeeds = [
    [0.08, 0.48],
    [0.14, 0.78],
    [0.88, 0.82],
    [0.92, 0.42],
    [0.24, 0.88],
    [0.76, 0.9],
  ];
  for (const [rx, ry] of tuftSeeds) {
    const gx = width * rx;
    const gy = height * ry;
    const sway = Math.sin(t * 2.2 + gx) * 2.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 5 + sway, gy - 9);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 1 + sway, gy - 11);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 6 + sway, gy - 8);
    ctx.stroke();
  }

  // 3. Classic Red Barn & Spinning Windmill in the Upper-Left Background
  const barnScale = layout.isCompact
    ? Math.max(0.54, Math.min(0.76, width / 560))
    : Math.max(0.65, Math.min(1.05, tileW / 118));
  const barnX = layout.isCompact
    ? Math.max(54, width * 0.17)
    : Math.max(88, layout.originX - tileW * 2.15);
  const barnY = layout.isCompact
    ? layout.animalPositions.cow.y + 8
    : Math.max(118, layout.originY - tileH * 0.22);

  drawWindmill(ctx, barnX + 58 * barnScale, barnY - 6 * barnScale, barnScale * 0.92, t);
  drawRedBarn(ctx, barnX, barnY, barnScale);

  // Cute trees framing the upper edges
  drawStylizedTree(
    ctx,
    Math.max(30, barnX - 58 * barnScale),
    barnY + 14 * barnScale,
    barnScale * 0.85,
    t
  );
  if (!layout.isCompact) {
    drawStylizedTree(
      ctx,
      Math.min(width - 36, layout.animalPositions.cow.x + 54),
      layout.animalPositions.cow.y - 36,
      barnScale * 0.82,
      t + 1.5
    );
  }

  // 4. Raised Isometric Farm Field Base Platform
  drawFieldPlatform(ctx, layout);

  // 5. Render 4x4 Isometric Tiles Back-to-Front (Painter's Algorithm: row + col ascending)
  for (let sum = 0; sum <= GRID_ROWS + GRID_COLS - 2; sum++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const col = sum - row;
      if (col < 0 || col >= GRID_COLS) continue;
      const tile = state.tiles[row * GRID_COLS + col];
      const isSelected =
        state.isInteractive &&
        state.cursorTarget?.type === 'tile' &&
        state.cursorTarget.index === tile.index;
      drawIsometricTile(ctx, tile, layout, t, isSelected, state.feverActive);
    }
  }

  // 6. Render Animated Farm Animals (Cow, Hen, Beehive)
  const animalOrder: AnimalId[] = ['cow', 'hen', 'hive'];
  for (const id of animalOrder) {
    const animal = state.animals[id];
    const pos = layout.animalPositions[id];
    const isSelected =
      state.isInteractive &&
      state.cursorTarget?.type === 'animal' &&
      state.cursorTarget.animalId === id;
    drawFarmAnimal(ctx, animal, pos.x, pos.y, pos.radius, t, isSelected, state.lang);
  }

  // 7. Render Particles (Water droplets, Soil clods, Gold stars, Rings)
  drawParticles(ctx, state.particles);

  // 8. Render Flying Harvested Crops & Coins arcing to HUD
  drawFlyingItems(ctx, state.flyingItems);

  // 9. Render Floating Score & Combo Popups
  drawFloatingTexts(ctx, state.floatingTexts);

  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.arc(20, -6, 24, 0, Math.PI * 2);
  ctx.arc(44, -2, 19, 0, Math.PI * 2);
  ctx.arc(22, 8, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStylizedTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  t: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Shadow
  ctx.fillStyle = 'rgba(24, 58, 12, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.fillStyle = '#6f4222';
  roundRectPath(ctx, -6, -12, 12, 26, 4);
  ctx.fill();

  const sway = Math.sin(t * 1.8 + x * 0.05) * 2;
  // Foliage layers
  ctx.fillStyle = '#2f7d22';
  ctx.beginPath();
  ctx.arc(sway, -24, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#47a32f';
  ctx.beginPath();
  ctx.arc(-10 + sway, -18, 17, 0, Math.PI * 2);
  ctx.arc(11 + sway, -18, 16, 0, Math.PI * 2);
  ctx.arc(sway, -32, 18, 0, Math.PI * 2);
  ctx.fill();

  // Cute apples/blossoms
  ctx.fillStyle = '#ff595e';
  ctx.beginPath();
  ctx.arc(-8 + sway, -24, 3, 0, Math.PI * 2);
  ctx.arc(9 + sway, -19, 3, 0, Math.PI * 2);
  ctx.arc(2 + sway, -33, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRedBarn(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Ground shadow
  ctx.fillStyle = 'rgba(20, 48, 10, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 52, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main Barn Front Wall
  ctx.fillStyle = '#d63626';
  ctx.strokeStyle = '#6e140b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-36, 18);
  ctx.lineTo(-36, -22);
  ctx.lineTo(0, -48);
  ctx.lineTo(36, -22);
  ctx.lineTo(36, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gambrel Roof
  ctx.fillStyle = '#593016';
  ctx.beginPath();
  ctx.moveTo(-43, -19);
  ctx.lineTo(-26, -42);
  ctx.lineTo(0, -54);
  ctx.lineTo(26, -42);
  ctx.lineTo(43, -19);
  ctx.lineTo(36, -15);
  ctx.lineTo(0, -44);
  ctx.lineTo(-36, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White Roof Trim
  ctx.strokeStyle = '#fff8e7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-41, -19);
  ctx.lineTo(-25, -41);
  ctx.lineTo(0, -52);
  ctx.lineTo(25, -41);
  ctx.lineTo(41, -19);
  ctx.stroke();

  // Hayloft Window
  ctx.fillStyle = '#47240d';
  ctx.fillRect(-10, -35, 20, 14);
  ctx.fillStyle = '#f5b82e';
  ctx.fillRect(-8, -28, 16, 7);
  ctx.strokeStyle = '#fff8e7';
  ctx.lineWidth = 2;
  ctx.strokeRect(-10, -35, 20, 14);

  // Double Barn Doors with White X-Trim
  ctx.fillStyle = '#b52619';
  ctx.fillRect(-20, -14, 40, 32);
  ctx.strokeStyle = '#fff8e7';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-20, -14, 40, 32);
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 18);
  // Left X
  ctx.moveTo(-20, -14);
  ctx.lineTo(0, 18);
  ctx.moveTo(0, -14);
  ctx.lineTo(-20, 18);
  // Right X
  ctx.moveTo(0, -14);
  ctx.lineTo(20, 18);
  ctx.moveTo(20, -14);
  ctx.lineTo(0, 18);
  ctx.stroke();

  ctx.restore();
}

function drawWindmill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  t: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Tower
  ctx.fillStyle = '#e8d2a6';
  ctx.strokeStyle = '#6b4220';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.lineTo(-9, -36);
  ctx.lineTo(9, -36);
  ctx.lineTo(14, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wooden cross beams
  ctx.strokeStyle = '#8c552b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.lineTo(11, -10);
  ctx.moveTo(12, 8);
  ctx.lineTo(-11, -10);
  ctx.stroke();

  // Roof cap
  ctx.fillStyle = '#c93b2b';
  ctx.beginPath();
  ctx.moveTo(-12, -35);
  ctx.lineTo(0, -50);
  ctx.lineTo(12, -35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Spinning Sails
  ctx.save();
  ctx.translate(0, -36);
  ctx.rotate(t * 1.15);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI * 0.5);
    ctx.strokeStyle = '#5c3317';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -34);
    ctx.stroke();

    // Sail cloth
    ctx.fillStyle = 'rgba(255, 250, 235, 0.92)';
    ctx.strokeStyle = '#a47148';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.rect(2, -32, 9, 23);
    ctx.fill();
    ctx.stroke();
  }
  // Hub
  ctx.fillStyle = '#6b4220';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawFieldPlatform(ctx: CanvasRenderingContext2D, layout: SceneLayout) {
  const halfW = layout.tileW * 0.5;
  const halfH = layout.tileH * 0.5;
  const pad = 10;

  const top = { x: layout.originX, y: layout.originY - pad * 0.6 };
  const right = {
    x: layout.originX + GRID_COLS * halfW + pad,
    y: layout.originY + GRID_COLS * halfH,
  };
  const bottom = {
    x: layout.originX + (GRID_COLS - GRID_ROWS) * halfW,
    y: layout.originY + (GRID_COLS + GRID_ROWS) * halfH + pad * 0.7,
  };
  const left = {
    x: layout.originX - GRID_ROWS * halfW - pad,
    y: layout.originY + GRID_ROWS * halfH,
  };

  const depth = 16;

  // Soft drop shadow under whole farm board
  ctx.fillStyle = 'rgba(18, 42, 8, 0.34)';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y + depth + 8);
  ctx.lineTo(right.x + 6, right.y + depth + 8);
  ctx.lineTo(bottom.x, bottom.y + depth + 12);
  ctx.lineTo(left.x - 6, left.y + depth + 8);
  ctx.closePath();
  ctx.fill();

  // Left earthen border wall
  ctx.fillStyle = '#4e7d24';
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(bottom.x, bottom.y + depth);
  ctx.lineTo(left.x, left.y + depth);
  ctx.closePath();
  ctx.fill();

  // Right earthen border wall
  ctx.fillStyle = '#3c631a';
  ctx.beginPath();
  ctx.moveTo(bottom.x, bottom.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(right.x, right.y + depth);
  ctx.lineTo(bottom.x, bottom.y + depth);
  ctx.closePath();
  ctx.fill();

  // Grass top rim
  ctx.fillStyle = '#73c247';
  ctx.strokeStyle = '#3b6619';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawIsometricTile(
  ctx: CanvasRenderingContext2D,
  tile: FarmTile,
  layout: SceneLayout,
  t: number,
  isSelected: boolean,
  feverActive: boolean
) {
  const center = tileToScreen(tile.row, tile.col, layout);
  const scale = tile.bounceScale;
  const halfW = layout.tileW * 0.475 * scale;
  const halfH = layout.tileH * 0.475 * scale;
  const depth = Math.max(7, layout.tileH * 0.22);

  ctx.save();
  ctx.translate(center.x, center.y);

  // Tile 3D Soil Block
  const topY = -halfH;
  const botY = halfH;
  const leftX = -halfW;
  const rightX = halfW;

  // Left soil depth wall
  ctx.fillStyle = tile.watered ? '#4a2912' : '#6b3e1f';
  ctx.beginPath();
  ctx.moveTo(leftX, 0);
  ctx.lineTo(0, botY);
  ctx.lineTo(0, botY + depth);
  ctx.lineTo(leftX, depth);
  ctx.closePath();
  ctx.fill();

  // Right soil depth wall
  ctx.fillStyle = tile.watered ? '#381e0c' : '#542f16';
  ctx.beginPath();
  ctx.moveTo(0, botY);
  ctx.lineTo(rightX, 0);
  ctx.lineTo(rightX, depth);
  ctx.lineTo(0, botY + depth);
  ctx.closePath();
  ctx.fill();

  // Top soil diamond
  let topColor = tile.watered ? '#6b3e1e' : '#9c6234';
  if (tile.state === 'withered') {
    topColor = '#5e4b43';
  }
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(rightX, 0);
  ctx.lineTo(0, botY);
  ctx.lineTo(leftX, 0);
  ctx.closePath();
  ctx.fill();

  // Tilled soil furrow lines
  ctx.strokeStyle = tile.watered ? 'rgba(36, 18, 6, 0.42)' : 'rgba(92, 50, 20, 0.32)';
  ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    const offset = i * 0.26;
    ctx.beginPath();
    ctx.moveTo(leftX * 0.55 + offset * halfW, -halfH * 0.45 + offset * halfH);
    ctx.lineTo(rightX * 0.55 + offset * halfW, halfH * 0.45 + offset * halfH);
    ctx.stroke();
  }

  // Ripe Golden Glow Aura on the soil
  if (tile.state === 'ripe') {
    const wiltRatio = tile.ripeTimer / RIPE_WITHER_TIME;
    const isUrgent = wiltRatio > 0.65;
    const pulse = 0.45 + Math.sin(t * (isUrgent ? 14 : 6) + tile.index) * 0.25;
    ctx.fillStyle = isUrgent
      ? `rgba(255, 85, 51, ${pulse * 0.5})`
      : `rgba(255, 224, 102, ${pulse * 0.45})`;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(rightX, 0);
    ctx.lineTo(0, botY);
    ctx.lineTo(leftX, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Action Flash Overlay
  if (tile.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.65, tile.flashTimer * 2.5)})`;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(rightX, 0);
    ctx.lineTo(0, botY);
    ctx.lineTo(leftX, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Tile Border
  ctx.strokeStyle =
    tile.state === 'ripe'
      ? '#ffe066'
      : feverActive
        ? 'rgba(255, 230, 128, 0.65)'
        : 'rgba(255, 240, 210, 0.35)';
  ctx.lineWidth = tile.state === 'ripe' ? 2.2 : 1.3;
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(rightX, 0);
  ctx.lineTo(0, botY);
  ctx.lineTo(leftX, 0);
  ctx.closePath();
  ctx.stroke();

  // Selection Cursor Highlight
  if (isSelected) {
    const cursorPulse = 1 + Math.sin(t * 9) * 0.03;
    ctx.save();
    ctx.scale(cursorPulse, cursorPulse);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, topY - 2);
    ctx.lineTo(rightX + 3, 0);
    ctx.lineTo(0, botY + 2);
    ctx.lineTo(leftX - 3, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = '#ffbe0b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Draw Crop on Tile
  const cropScale = Math.max(0.62, layout.tileW / 108);
  if (tile.cropId && tile.state !== 'empty') {
    drawCropOnTile(ctx, tile, cropScale, t);
  }

  // Draw Crow if present
  if (tile.hasCrow) {
    drawCrow(ctx, tile, cropScale, t);
  }

  // Draw Water Droplet Badge if thirsty
  if (tile.state === 'growing' && tile.needsWater && !tile.hasCrow) {
    const bob = Math.sin(t * 7 + tile.index) * 3;
    drawWaterBadge(ctx, 0, -28 * cropScale + bob, cropScale);
  }

  // Draw Ready-to-Harvest Sparkle or Urgent Wilt Warning
  if (tile.state === 'ripe' && !tile.hasCrow) {
    const wiltRatio = tile.ripeTimer / RIPE_WITHER_TIME;
    if (wiltRatio > 0.65) {
      const shakeX = Math.sin(t * 28) * 2.5;
      drawWarningBadge(ctx, shakeX, -38 * cropScale, cropScale, 1 - wiltRatio);
    } else {
      const sparkleY = -34 * cropScale + Math.sin(t * 5 + tile.index) * 3;
      drawStarSparkle(ctx, 12 * cropScale, sparkleY, 6 * cropScale, '#fff3b0');
    }
  }

  ctx.restore();
}

function drawCropOnTile(
  ctx: CanvasRenderingContext2D,
  tile: FarmTile,
  scale: number,
  t: number
) {
  const cropId = tile.cropId!;
  const sway = Math.sin(t * 3.2 + tile.row * 1.1 + tile.col * 0.9) * (tile.state === 'ripe' ? 3.2 : 1.4);

  ctx.save();
  ctx.scale(scale, scale);

  if (tile.state === 'withered') {
    // Wilted brown-purple plant
    ctx.strokeStyle = '#6c584c';
    ctx.fillStyle = '#7f5539';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-8, -10, -14, -4);
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(8, -12, 13, -3);
    ctx.stroke();

    // Small X mark
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-5, -20);
    ctx.lineTo(5, -10);
    ctx.moveTo(5, -20);
    ctx.lineTo(-5, -10);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const p = tile.state === 'ripe' ? 1 : tile.growthProgress;

  if (p < 0.42) {
    // Stage 1: Cute Twin Green Sprout
    const s = 0.65 + (p / 0.42) * 0.45;
    ctx.scale(s, s);
    ctx.strokeStyle = '#4c9a2a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.quadraticCurveTo(sway * 0.4, -8, sway * 0.6, -14);
    ctx.stroke();

    ctx.fillStyle = '#70e000';
    ctx.beginPath();
    ctx.ellipse(-6 + sway * 0.5, -12, 6, 3.5, -0.45, 0, Math.PI * 2);
    ctx.ellipse(6 + sway * 0.5, -13, 6, 3.5, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (p < 1) {
    // Stage 2: Leafy Growing Bush / Stalk
    const s = 0.78 + ((p - 0.42) / 0.58) * 0.25;
    ctx.scale(s, s);
    ctx.fillStyle = '#38b000';
    ctx.strokeStyle = '#247300';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 8 + sway * 0.7, -14 - (1 - Math.abs(i)) * 4, 7, 12, i * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Stage 3: RIPE ICONIC CROP!
  drawRipeCropIllustration(ctx, cropId, sway);
  ctx.restore();
}

function drawRipeCropIllustration(
  ctx: CanvasRenderingContext2D,
  cropId: CropId,
  sway: number
) {
  if (cropId === 'wheat') {
    const stalks = [-11, -4, 4, 11];
    stalks.forEach((bx, idx) => {
      const tipX = bx + sway * 1.15;
      const tipY = -28 - (idx % 2) * 4;
      ctx.strokeStyle = '#99c221';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx * 0.6, 4);
      ctx.quadraticCurveTo(bx, -12, tipX, tipY);
      ctx.stroke();

      // Golden wheat ear
      ctx.fillStyle = '#ffbe0b';
      ctx.strokeStyle = '#b5651d';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(tipX, tipY - 3, 4.2, 8.5, sway * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  } else if (cropId === 'corn') {
    // Tall green leaves
    ctx.fillStyle = '#38b000';
    ctx.strokeStyle = '#1f6300';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(-9 + sway * 0.6, -14, 6, 15, -0.35, 0, Math.PI * 2);
    ctx.ellipse(9 + sway * 0.6, -14, 6, 15, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Two bright golden corn cobs
    const cobs = [
      { x: -6 + sway * 0.9, y: -22, rot: -0.15 },
      { x: 6 + sway * 0.9, y: -25, rot: 0.15 },
    ];
    for (const c of cobs) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = '#ffd60a';
      ctx.strokeStyle = '#c97a00';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (cropId === 'strawberry') {
    // Lush leaves base
    ctx.fillStyle = '#2d9336';
    ctx.beginPath();
    ctx.ellipse(-10, -7, 9, 5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(10, -7, 9, 5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(0, -11, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3 plump ruby strawberries
    const berries = [
      { x: -9 + sway * 0.5, y: -13, r: 7.5 },
      { x: 9 + sway * 0.5, y: -12, r: 7.2 },
      { x: sway * 0.7, y: -21, r: 8.8 },
    ];
    for (const b of berries) {
      ctx.fillStyle = '#e63946';
      ctx.strokeStyle = '#8d0801';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy highlight & seeds
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(b.x - 2.2, b.y - 1.5, 1.1, 0, Math.PI * 2);
      ctx.arc(b.x + 2.2, b.y + 1, 1.1, 0, Math.PI * 2);
      ctx.arc(b.x, b.y + 3, 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Green calyx cap
      ctx.fillStyle = '#55a630';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - b.r + 1.5, 4.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (cropId === 'pumpkin') {
    // Vine leaves
    ctx.fillStyle = '#386641';
    ctx.beginPath();
    ctx.ellipse(-14, -6, 8, 4.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(14, -6, 8, 4.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const px = sway * 0.5;
    const py = -14;

    // Ribbed Royal Pumpkin
    ctx.fillStyle = '#f76c1b';
    ctx.strokeStyle = '#9c3800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px - 6, py, 9, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(px + 6, py, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff8826';
    ctx.beginPath();
    ctx.ellipse(px, py, 8.5, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Curly Stem
    ctx.strokeStyle = '#4f772d';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, py - 12);
    ctx.quadraticCurveTo(px + 3, py - 20, px + 7, py - 18);
    ctx.stroke();
  }
}

function drawCrow(
  ctx: CanvasRenderingContext2D,
  tile: FarmTile,
  scale: number,
  t: number
) {
  ctx.save();
  ctx.scale(scale, scale);
  const flap = Math.sin(t * 18 + tile.index) * 7;
  const hoverY = -22 + Math.sin(t * 9) * 3;

  // Red danger ring
  const dangerRatio = tile.crowTimer / CROW_EAT_TIME;
  ctx.strokeStyle = '#ff3b30';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, hoverY, 17, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * (1 - dangerRatio));
  ctx.stroke();

  // Crow wings
  ctx.fillStyle = '#22223b';
  ctx.beginPath();
  ctx.moveTo(-4, hoverY);
  ctx.lineTo(-18, hoverY - 8 + flap);
  ctx.lineTo(-10, hoverY + 5);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(4, hoverY);
  ctx.lineTo(18, hoverY - 8 + flap);
  ctx.lineTo(10, hoverY + 5);
  ctx.closePath();
  ctx.fill();

  // Crow body & head
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.ellipse(0, hoverY + 2, 7.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, hoverY - 7, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Yellow beak
  ctx.fillStyle = '#ffb703';
  ctx.beginPath();
  ctx.moveTo(-2, hoverY - 7);
  ctx.lineTo(2, hoverY - 7);
  ctx.lineTo(0, hoverY - 2);
  ctx.closePath();
  ctx.fill();

  // Angry white eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-2, hoverY - 8, 1.5, 0, Math.PI * 2);
  ctx.arc(2, hoverY - 8, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawWaterBadge(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // White circle backing
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.strokeStyle = '#0096c7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Blue droplet
  ctx.fillStyle = '#00b4d8';
  ctx.beginPath();
  ctx.moveTo(0, -6.5);
  ctx.quadraticCurveTo(5.5, 0, 4.5, 3.5);
  ctx.arc(0, 2.5, 4.5, 0.2, Math.PI - 0.2);
  ctx.quadraticCurveTo(-5.5, 0, 0, -6.5);
  ctx.fill();

  ctx.restore();
}

function drawWarningBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  remainingRatio: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ff4d4d';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Progress arc
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 13.5, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * Math.max(0, remainingRatio));
  ctx.stroke();

  // Exclamation mark
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 0, 1);

  ctx.restore();
}

function drawStarSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fill();
  ctx.restore();
}

function drawFarmAnimal(
  ctx: CanvasRenderingContext2D,
  animal: FarmAnimal,
  x: number,
  y: number,
  radius: number,
  t: number,
  isSelected: boolean,
  lang: Language
) {
  const s = (radius / 34) * animal.bounce;
  const progressRatio = Math.min(1, animal.progress / animal.cooldown);

  ctx.save();
  ctx.translate(x, y);

  // Pasture wooden ring pad
  ctx.fillStyle = 'rgba(32, 66, 16, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.58, radius * 0.95, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#89c956';
  ctx.strokeStyle = '#4c8c24';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.5, radius * 0.9, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Selection Halo if keyboard/pointer targeted
  if (isSelected) {
    ctx.strokeStyle = '#ffbe0b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.scale(s, s);

  if (animal.id === 'cow') {
    const chew = Math.sin(t * 5) * 1.2;
    // Body
    ctx.fillStyle = '#fffdf9';
    ctx.strokeStyle = '#4a3525';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Brown cow spots
    ctx.fillStyle = '#6f4528';
    ctx.beginPath();
    ctx.arc(-7, 2, 5.5, 0, Math.PI * 2);
    ctx.arc(8, 6, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fffdf9';
    ctx.beginPath();
    ctx.arc(-13, -6, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pink snout
    ctx.fillStyle = '#ffb5c2';
    ctx.beginPath();
    ctx.ellipse(-15, -2 + chew * 0.4, 7.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Horns
    ctx.fillStyle = '#f4d35e';
    ctx.beginPath();
    ctx.arc(-19, -15, 3, 0, Math.PI * 2);
    ctx.arc(-7, -15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Cute eye
    ctx.fillStyle = '#2b1d12';
    ctx.beginPath();
    ctx.arc(-15, -9, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (animal.id === 'hen') {
    const peck = Math.sin(t * 7) * 1.5;
    // Plump body
    ctx.fillStyle = '#ff9f1c';
    ctx.strokeStyle = '#7c3f00';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 5, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wing
    ctx.fillStyle = '#ffbf69';
    ctx.beginPath();
    ctx.ellipse(3, 6, 9, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.arc(-10, -7 + peck, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Red Comb
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(-11, -16 + peck, 4, 0, Math.PI * 2);
    ctx.arc(-7, -15 + peck, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(-18, -8 + peck);
    ctx.lineTo(-23, -5 + peck);
    ctx.lineTo(-17, -4 + peck);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.arc(-12, -8 + peck, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Beehive Skep
    ctx.fillStyle = '#f4a226';
    ctx.strokeStyle = '#7f4900';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 8, 16, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(0, 0, 14, 7.5, 0, 0, Math.PI * 2);
    ctx.ellipse(0, -8, 10, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hive entrance
    ctx.fillStyle = '#3d1e00';
    ctx.beginPath();
    ctx.arc(0, 7, 4, Math.PI, 0);
    ctx.fill();

    // 2 Orbiting Bees
    for (let b = 0; b < 2; b++) {
      const ang = t * 4.5 + b * Math.PI;
      const bx = Math.cos(ang) * 19;
      const by = Math.sin(ang) * 9 - 6;
      ctx.fillStyle = '#ffd60a';
      ctx.strokeStyle = '#1d1d1d';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(bx, by, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();

  // Product Status / Collection Bubble above Animal
  const bubbleY = -radius * 0.92 + (animal.ready ? Math.sin(t * 7) * 3.5 : 0);
  const bubbleR = Math.max(13, radius * 0.42);

  ctx.save();
  ctx.translate(0, bubbleY);

  // Bubble circle
  ctx.fillStyle = animal.ready ? '#fffbe6' : 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = animal.ready ? '#ff9f1c' : '#8d99ae';
  ctx.lineWidth = animal.ready ? 2.6 : 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, bubbleR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cooldown progress ring when not ready
  if (!animal.ready) {
    ctx.strokeStyle = '#52b788';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bubbleR + 2, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * progressRatio);
    ctx.stroke();
  }

  // Product Icon inside Bubble
  ctx.globalAlpha = animal.ready ? 1 : 0.48;
  if (animal.id === 'cow') {
    // Milk bottle
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2b2d42';
    ctx.lineWidth = 1.6;
    roundRectPath(ctx, -5, -4, 10, 11, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(-4, -7, 8, 3);
  } else if (animal.id === 'hen') {
    // Golden Egg
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#b5651d';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Honey Pot
    ctx.fillStyle = '#ff9f1c';
    ctx.strokeStyle = '#7f4900';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 1, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(-4.5, -6, 9, 2.5);
  }

  ctx.restore();

  // Small label under animal
  const cfg = ANIMAL_CONFIGS[animal.id];
  const label = animal.ready
    ? lang === 'ar'
      ? 'جاهز!'
      : 'READY!'
    : lang === 'ar'
      ? cfg.nameAr.split(' ')[0]
      : cfg.nameEn.split(' ')[1];

  ctx.font = `bold ${Math.max(10, Math.round(radius * 0.34))}px Cairo, Tajawal, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(24, 48, 10, 0.85)';
  ctx.strokeText(label, 0, radius * 0.88);
  ctx.fillStyle = animal.ready ? '#ffe066' : '#ffffff';
  ctx.fillText(label, 0, radius * 0.88);

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.shape === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.shape === 'drop') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'star') {
      drawStarSparkle(ctx, 0, 0, p.size * 1.35, p.color);
    } else if (p.shape === 'square') {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawFlyingItems(ctx: CanvasRenderingContext2D, items: FlyingItem[]) {
  for (const item of items) {
    const t = item.progress;
    const ease = 1 - Math.pow(1 - t, 2);
    const x = item.startX + (item.targetX - item.startX) * ease;
    const arcHeight = Math.sin(t * Math.PI) * 75;
    const y = item.startY + (item.targetY - item.startY) * ease - arcHeight;
    const scale = 1 - t * 0.35;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (item.kind === 'coin') {
      ctx.fillStyle = '#ffd60a';
      ctx.strokeStyle = '#b5651d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (item.cropId) {
      const def = CROPS[item.cropId];
      ctx.fillStyle = def.primaryColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff3b0';
      ctx.strokeStyle = '#e09f3e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (const ft of texts) {
    const ratio = 1 - ft.life / ft.maxLife;
    const alpha = ratio < 0.25 ? ratio / 0.25 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(ft.x, ft.y);
    ctx.scale(ft.scale, ft.scale);

    ctx.font = '900 20px Cairo, Tajawal, Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = ft.strokeColor;
    ctx.strokeText(ft.text, 0, 0);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);

    if (ft.subText) {
      ctx.font = '800 13px Cairo, Tajawal, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.subText, 0, 18);
      ctx.fillStyle = '#fffbe6';
      ctx.fillText(ft.subText, 0, 18);
    }

    ctx.restore();
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
