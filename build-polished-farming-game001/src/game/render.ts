import type { Banner, Chicken, Floater, Flyer, Particle, Plot } from "./types";
import { CROP_MAP } from "./types";

export interface DrawSprites {
  farmer: HTMLImageElement | null;
  sky: HTMLImageElement | null;
  pattern: CanvasPattern | null;
}

export interface DrawModel {
  w: number;
  h: number;
  fxTime: number;
  skyH: number;
  pathTop: number;
  pathH: number;
  plots: Plot[];
  cursor: number;
  suggest: number;
  shake: number;
  particles: Particle[];
  floaters: Floater[];
  flyers: Flyer[];
  chickens: Chicken[];
  farmerX: number;
  farmerBob: number;
  farmerJump: number;
  farmerMoving: boolean;
  happiness: number;
  combo: number;
  rainT: number;
  scareT: number;
  flash: number;
  dayT: number;
  banner: Banner | null;
  showHand: boolean;
  sprites: DrawSprites;
}

const FONT = "Cairo, Tahoma, Segoe UI, sans-serif";

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function renderGame(ctx: CanvasRenderingContext2D, g: DrawModel) {
  const { w, h } = g;
  if (w < 20 || h < 20) return;
  const mag = g.shake;
  const sx = mag ? (Math.random() - 0.5) * mag * 2 : 0;
  const sy = mag ? (Math.random() - 0.5) * mag * 2 : 0;

  ctx.fillStyle = "#7ec8ea";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(sx, sy);
  drawWorld(ctx, g);
  ctx.restore();

  if (g.happiness < 36) {
    const k = 1 - g.happiness / 36;
    const pulse = 0.55 + 0.45 * Math.sin(g.fxTime * 5);
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(150, 24, 18, ${k * 0.38 * pulse})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255, 246, 220, ${g.flash})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawWorld(ctx: CanvasRenderingContext2D, g: DrawModel) {
  drawBackdrop(ctx, g);
  for (const p of g.plots) drawPlot(ctx, g, p);
  drawPath(ctx, g);
  for (const c of g.chickens) drawChicken(ctx, g, c);
  drawFarmer(ctx, g);
  if (g.rainT > 0) drawRain(ctx, g);
  if (g.scareT > 0) drawScareGlow(ctx, g);
  for (const p of g.particles) if (p.alive) drawParticle(ctx, p);
  for (const f of g.flyers) drawFlyer(ctx, f);
  for (const fl of g.floaters) drawFloater(ctx, fl);
  if (g.banner && g.banner.life > 0) drawBanner(ctx, g);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, g: DrawModel) {
  const { w, h, skyH } = g;
  const sky = g.sprites.sky;
  if (sky && sky.complete && sky.naturalWidth) {
    const sh = sky.naturalHeight * 0.62;
    ctx.drawImage(sky, 0, 0, sky.naturalWidth, sh, -24, -16, w + 48, skyH + 52);
  } else {
    const grd = ctx.createLinearGradient(0, 0, 0, skyH + 40);
    grd.addColorStop(0, "#79c7ef");
    grd.addColorStop(1, "#ffe0a8");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, skyH + 40);
  }

  const sunX = 28 + g.dayT * (w - 56);
  const sunY = 10 + Math.sin(g.dayT * Math.PI) * -2 + skyH * 0.28;
  const sunR = Math.max(8, skyH * 0.22);
  const sg = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunR * 2.4);
  sg.addColorStop(0, "rgba(255,244,190,.95)");
  sg.addColorStop(0.4, "rgba(255,196,80,.55)");
  sg.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g.dayT > 0.7 ? "#ffb15a" : "#ffe9a8";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  const grass = ctx.createLinearGradient(0, skyH - 8, 0, h);
  grass.addColorStop(0, "#8ed45f");
  grass.addColorStop(0.45, "#62b347");
  grass.addColorStop(1, "#4e9a3c");
  ctx.fillStyle = grass;
  ctx.beginPath();
  ctx.moveTo(-24, skyH + 8);
  ctx.quadraticCurveTo(w * 0.5, skyH - 16, w + 24, skyH + 8);
  ctx.lineTo(w + 24, h + 24);
  ctx.lineTo(-24, h + 24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.08)";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(0, skyH + 18 + i * 28, w, 2);
  }

  const t = g.fxTime;
  for (let i = 0; i < 22; i++) {
    const fx = ((i * 97) % 100) / 100;
    const fy = 0.16 + ((i * 53) % 70) / 100;
    const x = fx * w;
    const y = skyH + fy * (g.pathTop - skyH);
    const wind = Math.sin(t * 1.4 + i) * 1.4;
    ctx.strokeStyle = i % 2 ? "rgba(40,110,40,.28)" : "rgba(230,255,180,.28)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + wind, y - 5, x + wind * 0.4, y - 8);
    ctx.stroke();
    if (i % 4 === 0) {
      const colors = ["#ff7aa2", "#ffe56a", "#fff6ea", "#ff9a4a"];
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x + 2, y - 1, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff2b0";
      ctx.beginPath();
      ctx.arc(x + 2, y - 1, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawFence(ctx, w, skyH);
}

function drawFence(ctx: CanvasRenderingContext2D, w: number, skyH: number) {
  const y = skyH - 2;
  ctx.strokeStyle = "#8a5a32";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(8, y + 6);
  ctx.lineTo(w - 8, y + 6);
  ctx.moveTo(8, y + 12);
  ctx.lineTo(w - 8, y + 12);
  ctx.stroke();
  ctx.fillStyle = "#6d4324";
  for (let x = 14; x < w - 8; x += 28) {
    roundRect(ctx, x, y - 2, 5, 20, 1.5);
    ctx.fill();
  }
}

function drawPath(ctx: CanvasRenderingContext2D, g: DrawModel) {
  const { w, h, pathTop } = g;
  ctx.save();
  roundRect(ctx, 8, pathTop + 6, w - 16, h - pathTop - 12, 16);
  ctx.clip();
  if (g.sprites.pattern) {
    ctx.fillStyle = g.sprites.pattern;
    ctx.fillRect(0, pathTop, w, h - pathTop);
    ctx.fillStyle = "rgba(150, 96, 42, .28)";
    ctx.fillRect(0, pathTop, w, h - pathTop);
  } else {
    const grd = ctx.createLinearGradient(0, pathTop, 0, h);
    grd.addColorStop(0, "#e0b67a");
    grd.addColorStop(1, "#b8884e");
    ctx.fillStyle = grd;
    ctx.fillRect(0, pathTop, w, h - pathTop);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(92, 52, 24, .45)";
  ctx.lineWidth = 2;
  roundRect(ctx, 8, pathTop + 6, w - 16, h - pathTop - 12, 16);
  ctx.stroke();
}

function drawPlot(ctx: CanvasRenderingContext2D, g: DrawModel, p: Plot) {
  const selected = p.i === g.cursor;
  const t = g.fxTime;
  const punch = 1 + Math.sin(Math.min(1, p.punch) * Math.PI) * 0.045;
  const cx = p.x + p.w / 2;
  if (p.state === "ripe") {
    ctx.fillStyle = `rgba(255, 206, 70, ${0.16 + 0.1 * Math.sin(t * 5 + p.i)})`;
    roundRect(ctx, p.x, p.y, p.w, p.h, 12);
    ctx.fill();
  } else if (p.thirsty) {
    ctx.fillStyle = "rgba(70, 170, 255, .1)";
    roundRect(ctx, p.x, p.y, p.w, p.h, 12);
    ctx.fill();
  }
  const bedH = Math.min(p.h * 0.4, 52);
  const bedY = p.y + p.h - bedH - 3;

  ctx.save();
  ctx.translate(cx, bedY + bedH / 2);
  ctx.scale(punch, punch);
  ctx.translate(-cx, -(bedY + bedH / 2));

  ctx.fillStyle = "rgba(70, 40, 12, .18)";
  roundRect(ctx, p.x + 5, bedY + 5, p.w - 8, bedH, 9);
  ctx.fill();

  const wood = ctx.createLinearGradient(p.x, bedY, p.x, bedY + bedH);
  wood.addColorStop(0, "#d7a36a");
  wood.addColorStop(0.4, "#b57d45");
  wood.addColorStop(1, "#8a5428");
  ctx.fillStyle = wood;
  roundRect(ctx, p.x + 2, bedY, p.w - 4, bedH, 9);
  ctx.fill();
  ctx.strokeStyle = "#5c3418";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 226, 180, .45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x + 10, bedY + 3);
  ctx.lineTo(p.x + p.w - 12, bedY + 3);
  ctx.stroke();

  const sx = p.x + 8;
  const sy = bedY + 6;
  const sw = p.w - 16;
  const sh = bedH - 13;
  const soil = ctx.createLinearGradient(sx, sy, sx, sy + sh);
  if (p.wet > 0) {
    soil.addColorStop(0, "#6d4630");
    soil.addColorStop(1, "#4a2c18");
  } else {
    soil.addColorStop(0, "#d3965c");
    soil.addColorStop(1, "#a56b3a");
  }
  ctx.fillStyle = soil;
  roundRect(ctx, sx, sy, sw, sh, 6);
  ctx.fill();

  ctx.fillStyle = p.wet > 0 ? "rgba(255,255,255,.16)" : "rgba(90,48,18,.18)";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(sx + 8 + ((i * 17 + p.i * 5) % Math.max(8, sw - 12)), sy + 6 + (i % 3) * 6, 1.3, 0, 7);
    ctx.fill();
  }
  if (p.wet > 0) {
    ctx.strokeStyle = "rgba(190, 220, 255, .45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, sy + sh * 0.45, sw * 0.28, 3, 0, 0, Math.PI);
    ctx.stroke();
  }

  const soilTop = sy + 2;
  if (p.weed && p.state === "empty") drawWeed(ctx, cx, soilTop, t, p.i);
  if (p.crop && p.state !== "empty") {
    ctx.save();
    if (p.state === "withered") {
      ctx.filter = "grayscale(.8) brightness(.72)";
      ctx.translate(cx, soilTop);
      ctx.rotate(0.35);
      ctx.translate(-cx, -soilTop);
    }
    const sway = Math.sin(t * 1.7 + p.i) * 0.05 * (p.state === "ripe" ? 1.4 : 1);
    const bob = p.state === "ripe" ? Math.sin(t * 6 + p.i) * 3 : 0;
    ctx.translate(0, bob);
    ctx.translate(cx, soilTop);
    ctx.rotate(sway);
    ctx.scale(p.pop, p.pop);
    ctx.translate(-cx, -soilTop);
    drawCrop(ctx, p, cx, soilTop, t);
    ctx.restore();
  } else if (p.state === "empty" && !p.weed) {
    ctx.strokeStyle = "rgba(90,50,20,.35)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, soilTop - 8, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(90,50,20,.45)";
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+", cx, soilTop - 8);
  }

  ctx.restore();

  if (p.ring) drawRing(ctx, p, t, p.i === g.suggest);
  if (selected) {
    ctx.save();
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(240, 180, 40, .85)";
    ctx.shadowBlur = 8;
    roundRect(ctx, p.x + 1, p.y + 1, p.w - 2, p.h - 2, 12);
    ctx.stroke();
    ctx.restore();
  }
  if (g.showHand && p.i === g.suggest && p.ring) {
    const bob = Math.sin(t * 6) * 5;
    ctx.fillStyle = "#fff8ea";
    ctx.strokeStyle = "#6b3a16";
    ctx.lineWidth = 3;
    ctx.font = `900 18px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.strokeText("▼", cx, p.y + 16 + bob);
    ctx.fillText("▼", cx, p.y + 16 + bob);
  }

  if (p.thirsty) drawDrop(ctx, cx + p.w * 0.28, p.y + 18, 1, t);
  if (p.pest) drawCrow(ctx, cx, p.y + 22, 1.15, t, true);
  if (p.state === "ripe") {
    const frac = Math.max(0, p.ripeLeft / Math.max(0.01, p.ripeMax));
    drawArc(ctx, cx, bedY - 8, Math.min(p.w, p.h) * 0.28, frac, frac < 0.3 ? "#e23d32" : "#f0b429");
    if (p.ripeLeft < 3.4) {
      ctx.font = `800 11px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillStyle = frac < 0.3 ? "#fff" : "#3d2415";
      ctx.fillText(p.ripeLeft.toFixed(1), cx, p.y + 14);
    }
  } else if (p.state === "growing" && p.crop) {
    const bw = p.w - 16;
    ctx.fillStyle = "rgba(40,24,8,.28)";
    roundRect(ctx, p.x + 8, p.y + p.h - 8, bw, 4, 2);
    ctx.fill();
    ctx.fillStyle = p.thirsty ? "#3aa0e8" : "#7dce46";
    roundRect(ctx, p.x + 8, p.y + p.h - 8, bw * Math.max(0.04, Math.min(1, p.growth)), 4, 2);
    ctx.fill();
  }
}

function drawRing(ctx: CanvasRenderingContext2D, p: Plot, t: number, strong: boolean) {
  const colors: Record<string, string> = {
    gold: "#ffd15a",
    blue: "#49b4ff",
    red: "#ff5a4a",
    brown: "#e0b07a",
  };
  const col = colors[p.ring || "gold"];
  const pulse = 0.45 + 0.55 * Math.sin(t * (p.ring === "red" || (p.state === "ripe" && p.ripeLeft < 2) ? 10 : 5));
  ctx.save();
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.45 + pulse * 0.55;
  ctx.lineWidth = strong ? 3.5 : 2.5;
  ctx.shadowColor = col;
  ctx.shadowBlur = 10;
  roundRect(ctx, p.x - 1, p.y - 1, p.w + 2, p.h + 2, 13);
  ctx.stroke();
  ctx.restore();
}

function drawArc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  frac: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = "rgba(40,24,8,.25)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, frac)));
  ctx.stroke();
  ctx.restore();
}

function drawCrop(ctx: CanvasRenderingContext2D, p: Plot, x: number, y: number, t: number) {
  if (!p.crop) return;
  const def = CROP_MAP[p.crop];
  const g = Math.max(0.08, Math.min(1, p.growth));
  const s = Math.max(0.78, Math.min(1.45, p.w / 88));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (g < 0.22 && p.state !== "ripe") {
    drawSprout(ctx, g / 0.22);
  }
  if (p.crop === "radish") drawRadish(ctx, g, def.color, def.deep);
  else if (p.crop === "wheat") drawWheat(ctx, g, t, p.i);
  else if (p.crop === "tomato") drawTomato(ctx, g, def.color);
  else drawPumpkin(ctx, g, def.color, def.deep);
  if (p.state === "ripe") {
    ctx.fillStyle = "#fff6c8";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(-10, -28, 2.2, 0, 7);
    ctx.arc(12, -18, 1.6, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawSprout(ctx: CanvasRenderingContext2D, k: number) {
  ctx.strokeStyle = "#2f7a34";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -8 * k);
  ctx.stroke();
  ctx.fillStyle = "#5cbf56";
  ctx.beginPath();
  ctx.ellipse(-4 * k, -8 * k, 4 * k, 2.2 * k, -0.6, 0, 7);
  ctx.ellipse(4 * k, -8 * k, 4 * k, 2.2 * k, 0.6, 0, 7);
  ctx.fill();
}

function drawRadish(ctx: CanvasRenderingContext2D, g: number, color: string, deep: string) {
  const leaf = Math.min(1, g / 0.45);
  ctx.fillStyle = "#3aaa48";
  for (const rot of [-0.7, -0.2, 0.35, 0.8]) {
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, -10 * leaf, 4.2 * leaf, 11 * leaf, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#227a32";
  ctx.fillRect(-1.2, -6, 2.4, 8);
  if (g > 0.28) {
    const b = Math.min(1, (g - 0.28) / 0.72);
    const grd = ctx.createRadialGradient(-3, -2, 2, 0, 4, 12);
    grd.addColorStop(0, "#ff8d98");
    grd.addColorStop(0.55, color);
    grd.addColorStop(1, deep);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, 4 - b * 2, 7.5 * b, 9 * b, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.ellipse(-2.5, 1, 2, 3, -0.4, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-1, 8 * b, 2, 4 * b);
  }
}

function drawWheat(ctx: CanvasRenderingContext2D, g: number, t: number, id: number) {
  const h = 8 + g * 28;
  for (let i = -2; i <= 2; i++) {
    const sway = Math.sin(t * 2 + id + i) * 2.2 * g;
    const x = i * 5;
    ctx.strokeStyle = g > 0.55 ? "#e6b322" : "#7dae45";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.quadraticCurveTo(x + sway * 0.3, -h * 0.4, x + sway, -h);
    ctx.stroke();
    if (g > 0.5) {
      ctx.fillStyle = "#f6d35a";
      ctx.beginPath();
      ctx.ellipse(x + sway, -h, 2.4, 6 * Math.min(1, (g - 0.5) / 0.5), sway * 0.05, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#c48a14";
      ctx.fillRect(x + sway - 0.6, -h - 2, 1.2, 4);
    }
  }
}

function drawTomato(ctx: CanvasRenderingContext2D, g: number, color: string) {
  ctx.strokeStyle = "#2c7a34";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.quadraticCurveTo(1, -8, 0, -16 - g * 10);
  ctx.stroke();
  leafBlob(ctx, -8 * g, -6 * g, 0.85 * g, -0.8);
  leafBlob(ctx, 8 * g, -10 * g, 0.75 * g, 0.7);
  if (g > 0.42) {
    const f = Math.min(1, (g - 0.42) / 0.58);
    tomatoBall(ctx, -7, 0, 6.5 * f, color);
    tomatoBall(ctx, 6, 1, 7 * f, color);
    if (g > 0.72) tomatoBall(ctx, 1, -14 * f, 5.5 * f, color);
  }
}

function tomatoBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  if (r < 0.5) return;
  const grd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 1, x, y, r);
  grd.addColorStop(0, "#ff8d78");
  grd.addColorStop(0.6, color);
  grd.addColorStop(1, "#b4231c");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#2f7a34";
  ctx.beginPath();
  ctx.ellipse(x, y - r + 1, r * 0.45, r * 0.22, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.65)";
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.28, Math.max(1, r * 0.22), 0, 7);
  ctx.fill();
}

function drawPumpkin(ctx: CanvasRenderingContext2D, g: number, color: string, deep: string) {
  leafBlob(ctx, -12 * g, -2, g, -0.4);
  leafBlob(ctx, 12 * g, -4, g * 0.9, 0.5);
  if (g > 0.34) {
    const f = Math.min(1, (g - 0.34) / 0.66);
    const r = 11 * f;
    const grd = ctx.createRadialGradient(-4, -4, 2, 0, 2, r + 2);
    grd.addColorStop(0, "#ffc15a");
    grd.addColorStop(0.55, color);
    grd.addColorStop(1, deep);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, 2, r * 1.15, r * 0.92, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(140, 60, 8, .35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 2 - r * 0.8);
    ctx.quadraticCurveTo(-5, 2, -4, 2 + r * 0.75);
    ctx.moveTo(4, 2 - r * 0.75);
    ctx.quadraticCurveTo(5, 2, 3, 2 + r * 0.7);
    ctx.stroke();
    ctx.strokeStyle = "#5c8a32";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 2 - r);
    ctx.quadraticCurveTo(4, -r - 4, 2, -r - 8 * f);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.4)";
    ctx.beginPath();
    ctx.ellipse(-4, -1, 2.4, 3.5, -0.5, 0, 7);
    ctx.fill();
  }
}

function leafBlob(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  if (s <= 0.05) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = "#3aaa45";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8 * s, 3.4 * s, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(20,80,30,.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6 * s, 0);
  ctx.lineTo(6 * s, 0);
  ctx.stroke();
  ctx.restore();
}

function drawWeed(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, id: number) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = -1; i <= 1; i++) {
    const sway = Math.sin(t * 2 + id + i) * 2;
    ctx.fillStyle = i === 0 ? "#67b34a" : "#3e9a3c";
    ctx.beginPath();
    ctx.ellipse(i * 6, -6, 4, 9, i * 0.4 + sway * 0.02, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = "#f2e27a";
  ctx.beginPath();
  ctx.arc(0, -14, 2.2, 0, 7);
  ctx.fill();
  ctx.restore();
}

function drawDrop(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  const bob = Math.sin(t * 6.5) * 4;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(40, 140, 220, .25)";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#2f9de8";
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.bezierCurveTo(9, -2, 8, 8, 0, 11);
  ctx.bezierCurveTo(-8, 8, -9, -2, 0, -11);
  ctx.fill();
  ctx.fillStyle = "#8fd4ff";
  ctx.beginPath();
  ctx.ellipse(-2.2, -1, 2.2, 3.4, -0.5, 0, 7);
  ctx.fill();
  ctx.restore();
}

export function drawCrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: number,
  perch: boolean,
) {
  const flap = Math.sin(t * (perch ? 10 : 18)) * (perch ? 0.35 : 0.8);
  const bob = perch ? Math.sin(t * 5) * 1.5 : 0;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.beginPath();
  ctx.ellipse(2, 12, 8, 2.4, 0, 0, 7);
  ctx.fill();
  ctx.save();
  ctx.rotate(-0.4 + flap);
  ctx.fillStyle = "#1c2c4e";
  ctx.beginPath();
  ctx.ellipse(7, 0, 10, 4.2, 0, 0, 7);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#24365c";
  ctx.beginPath();
  ctx.ellipse(1, 2, 8.5, 7, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#1a2744";
  ctx.beginPath();
  ctx.arc(-5, -3, 5.2, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-6, -4, 2.3, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(-5.4, -4, 1.15, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#f0c22e";
  ctx.beginPath();
  ctx.moveTo(-9, -3);
  ctx.lineTo(-15, -1.2);
  ctx.lineTo(-9, 0.4);
  ctx.fill();
  if (perch) {
    ctx.strokeStyle = "#3a2a22";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-1, 8);
    ctx.lineTo(-4, 12);
    ctx.moveTo(3, 8);
    ctx.lineTo(5, 12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawChicken(ctx: CanvasRenderingContext2D, g: DrawModel, c: Chicken) {
  const y = g.pathTop + g.pathH * 0.62;
  const peck = c.peck > 0 ? Math.sin((1 - c.peck) * Math.PI) * 5 : 0;
  const bob = Math.sin(c.bob) * (Math.abs(c.vx) > 1 ? 1.6 : 0.4);
  ctx.save();
  ctx.translate(c.x, y + bob);
  ctx.scale(c.facing, 1);
  ctx.fillStyle = "rgba(70,40,10,.18)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 12, 3, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#f3e2c4";
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 9, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#e0b06a";
  ctx.beginPath();
  ctx.ellipse(-2, -1, 8, 6, -0.2, 0, 7);
  ctx.fill();
  ctx.save();
  ctx.translate(10, -6 + peck);
  ctx.fillStyle = "#fff6ea";
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#e23d32";
  ctx.beginPath();
  ctx.ellipse(0, -5, 3, 2.2, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#f0a020";
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(10, 1.5);
  ctx.lineTo(4, 3);
  ctx.fill();
  ctx.fillStyle = "#3d2415";
  ctx.beginPath();
  ctx.arc(1.5, -1, 1.1, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillRect(1.1, -1.4, 0.6, 0.6);
  ctx.restore();
  ctx.strokeStyle = "#e09020";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-3, 8);
  ctx.lineTo(-5, 13);
  ctx.moveTo(2, 8);
  ctx.lineTo(4, 13);
  ctx.stroke();
  ctx.restore();
}

function drawFarmer(ctx: CanvasRenderingContext2D, g: DrawModel) {
  const img = g.sprites.farmer;
  const jump = Math.sin(Math.min(1, g.farmerJump) * Math.PI) * 18;
  const bob = Math.sin(g.farmerBob) * (g.farmerMoving ? 2.4 : 1);
  const feet = g.h - 8;
  const fh = Math.min(g.pathH * 1.08, 132);
  const fw = img && img.naturalWidth ? fh * (img.naturalWidth / img.naturalHeight) : fh * 0.56;
  const x = g.farmerX;
  const y = feet - jump + bob;
  ctx.save();
  ctx.fillStyle = `rgba(70,40,10,${0.22 - Math.min(0.12, jump / 200)})`;
  ctx.beginPath();
  ctx.ellipse(x, feet - 2, fw * 0.32, 4.5, 0, 0, 7);
  ctx.fill();
  if (img && img.complete && img.naturalWidth) {
    ctx.drawImage(img, x - fw / 2, y - fh, fw, fh);
  } else {
    drawFarmerFallback(ctx, x, y, fh);
  }
  ctx.restore();
}

function drawFarmerFallback(ctx: CanvasRenderingContext2D, x: number, feet: number, h: number) {
  const s = h / 80;
  ctx.save();
  ctx.translate(x, feet);
  ctx.scale(s, s);
  ctx.fillStyle = "#6b4424";
  roundRect(ctx, -8, -10, 7, 10, 2);
  roundRect(ctx, 1, -10, 7, 10, 2);
  ctx.fill();
  ctx.fillStyle = "#2f7a45";
  roundRect(ctx, -11, -36, 22, 28, 6);
  ctx.fill();
  ctx.fillStyle = "#f4e2c8";
  ctx.beginPath();
  ctx.arc(0, -46, 9, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#e7b15a";
  ctx.beginPath();
  ctx.ellipse(0, -54, 12, 5, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#3d2415";
  ctx.beginPath();
  ctx.arc(-3, -47, 1, 0, 7);
  ctx.arc(3, -47, 1, 0, 7);
  ctx.fill();
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const k = Math.max(0, p.life / p.max);
  ctx.save();
  ctx.globalAlpha = p.type === "butterfly" ? 0.9 : k;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  if (p.type === "coin") {
    ctx.fillStyle = "#f0b429";
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.86, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "#a56a10";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#fff1b8";
    ctx.font = `800 ${Math.max(7, p.size)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("•", 0, 0.5);
  } else if (p.type === "water") {
    ctx.fillStyle = "#49b4ff";
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, 7);
    ctx.fill();
  } else if (p.type === "leaf") {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, 7);
    ctx.fill();
  } else if (p.type === "feather") {
    ctx.fillStyle = "#2a3a5c";
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.4, p.size, 0, 0, 7);
    ctx.fill();
  } else if (p.type === "spark" || p.type === "star") {
    ctx.fillStyle = p.color;
    star(ctx, 0, 0, p.size, p.size * 0.45);
  } else if (p.type === "heart") {
    ctx.fillStyle = "#ff5a7a";
    heart(ctx, p.size);
  } else if (p.type === "confetti") {
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
  } else if (p.type === "butterfly") {
    const flap = 0.4 + Math.abs(Math.sin(p.life * 12)) * 0.8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(-4, 0, 5 * flap, 3.5, -0.4, 0, 7);
    ctx.ellipse(4, 0, 5 * flap, 3.5, 0.4, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "#5a3a16";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0, 4);
    ctx.stroke();
  } else {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ir: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : ir;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.4, -s, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.4, -s, s, -s * 0.3, 0, s * 0.3);
  ctx.fill();
}

function drawFlyer(ctx: CanvasRenderingContext2D, f: Flyer) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
  drawCrow(ctx, f.x, f.y, 1.1, f.life * 8, false);
  ctx.restore();
}

function drawFloater(ctx: CanvasRenderingContext2D, f: Floater) {
  const k = Math.max(0, f.life / f.max);
  const rise = (1 - k) * 36;
  const scale = k > 0.85 ? (1 - k) / 0.15 : 1;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.4);
  ctx.translate(f.x, f.y - rise);
  ctx.scale(0.75 + scale * 0.25, 0.75 + scale * 0.25);
  ctx.font = `800 ${f.size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(60, 28, 8, .55)";
  ctx.strokeText(f.text, 0, 0);
  ctx.fillStyle = f.color;
  ctx.fillText(f.text, 0, 0);
  ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, g: DrawModel) {
  const b = g.banner;
  if (!b) return;
  const t = b.life / b.max;
  const a = t > 0.82 ? (1 - t) / 0.18 : t < 0.22 ? t / 0.22 : 1;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(g.w / 2, Math.max(36, g.skyH * 0.55));
  ctx.scale(0.86 + a * 0.14, 0.86 + a * 0.14);
  ctx.fillStyle = "#c4472a";
  roundRect(ctx, -118, -20, 236, 40, 12);
  ctx.fill();
  ctx.fillStyle = "#ffe08a";
  roundRect(ctx, -112, -16, 224, 32, 10);
  ctx.fill();
  ctx.fillStyle = "#6b2c12";
  ctx.font = `900 18px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(b.text, 0, b.sub ? -4 : 0);
  if (b.sub) {
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText(b.sub, 0, 10);
  }
  ctx.restore();
}

function drawRain(ctx: CanvasRenderingContext2D, g: DrawModel) {
  ctx.save();
  ctx.strokeStyle = "rgba(210, 230, 255, .55)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 48; i++) {
    const x = ((i * 97 + g.fxTime * 420) % (g.w + 30)) - 15;
    const y = ((i * 61 + g.fxTime * 640) % (g.h + 20)) - 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 7, y + 16);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(80, 140, 200, .08)";
  ctx.fillRect(0, 0, g.w, g.h);
  ctx.restore();
}

function drawScareGlow(ctx: CanvasRenderingContext2D, g: DrawModel) {
  const a = 0.12 + 0.08 * Math.sin(g.fxTime * 9);
  const grd = ctx.createRadialGradient(58, g.h - 36, 8, 70, g.h - 40, g.w * 0.75);
  grd.addColorStop(0, `rgba(255, 214, 90, ${a + 0.18})`);
  grd.addColorStop(1, "rgba(255, 214, 90, 0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, g.w, g.h);
}
