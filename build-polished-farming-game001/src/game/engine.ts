import { Sfx } from "./audio";
import { ASSETS } from "./assets";
import { clamp, lerp, pick, rand } from "./math";
import { renderGame, type DrawModel } from "./render";
import { bestScore, loadScores, saveScore } from "./storage";
import {
  COLS,
  COMBO_WINDOW,
  CROP_MAP,
  CROPS,
  DAY_LEN,
  PLOT_COUNT,
  ROWS,
  SCARE_CD,
  SCARE_TIME,
  farmTitle,
  type Banner,
  type Chicken,
  type CropId,
  type Floater,
  type Flyer,
  type Hud,
  type Particle,
  type Phase,
  type Plot,
  type PType,
  type RunStats,
} from "./types";

export interface EngineHooks {
  onHud: (hud: Hud) => void;
  onPhase: (phase: Phase) => void;
  onOver: (stats: RunStats) => void;
}

interface Diff {
  pestEvery: number;
  weedEvery: number;
  ripeMul: number;
  thirstChance: number;
  thirstWindow: number;
  pestWindow: number;
  maxPests: number;
  maxWeeds: number;
}

const LEAVES = ["#3aaa45", "#7dce46", "#2f7a34", "#c6e86a"];
const CONFETTI = ["#f0b429", "#e23d32", "#3aa0e8", "#7dce46", "#fff6ea", "#ff7ab0"];

function emptyPlot(i: number): Plot {
  return {
    i,
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    state: "empty",
    crop: null,
    growth: 0,
    ripeLeft: 0,
    ripeMax: 1,
    thirsty: false,
    thirstTimer: 0,
    thirstRolled: false,
    pest: false,
    pestTimer: 0,
    pestMax: 1,
    weed: false,
    weedTimer: 0,
    weedHit: false,
    wet: 0,
    punch: 0,
    pop: 1,
    patted: false,
    sparkAcc: 0,
    safeUntil: 0,
    ring: null,
  };
}

export class FarmGame {
  w = 360;
  h = 560;
  dpr = 1;
  skyH = 48;
  pathTop = 460;
  pathH = 100;
  fxTime = 0;
  phase: Phase = "play";
  plots: Plot[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  flyers: Flyer[] = [];
  chickens: Chicken[] = [];
  cursor = 1;
  suggest = 1;
  showHand = true;
  selected: CropId = "radish";
  coins = 22;
  score = 0;
  happiness = 100;
  day = 1;
  dayTimer = 0;
  combo = 0;
  comboTimer = 0;
  bestCombo = 0;
  harvested = 0;
  shooed = 0;
  withered = 0;
  best = 0;
  shake = 0;
  flash = 0;
  rainT = 0;
  rainEvery = 30;
  scareT = 0;
  scareCd = 0;
  banner: Banner | null = null;
  farmerX = 80;
  farmerBob = 0;
  farmerJump = 0;
  farmerMoving = false;
  farmerTarget = 80;
  sprites = {
    farmer: null as HTMLImageElement | null,
    sky: null as HTMLImageElement | null,
    pattern: null as CanvasPattern | null,
  };

  private pestEvery = 11;
  private weedEvery = 15;
  private pity = 0;
  private chirp = 5;
  private holdDelay = 0;
  private keys = new Set<string>();
  private finished = false;
  private titleRank = 0;
  private recordAnnounced = false;
  private brokeTick = 0;
  private pop = 0;
  private happyTick = 0;
  private coach: string | null = "اضغط المحصول الذهبي";
  private coachEn: string | null = "Tap the gold crop";
  private lastHud = "";
  private woodReady = false;
  private woodImg: HTMLImageElement | null = null;
  private nickname: string;
  private destroyed = false;

  constructor(
    private hooks: EngineHooks,
    private sfx: Sfx,
    nickname: string,
  ) {
    this.nickname = nickname || "مزارع";
    this.best = bestScore();
    this.plots = Array.from({ length: PLOT_COUNT }, (_, i) => emptyPlot(i));
    this.chickens = [
      { x: 70, vx: 26, bob: 0, peck: 0, facing: 1, wait: 1.2 },
      { x: 220, vx: -20, bob: 1.4, peck: 0, facing: -1, wait: 2.4 },
    ];
    this.particles = Array.from({ length: 240 }, () => this.blankParticle());
    this.loadSprites();
    this.reset(false);
  }

  destroy() {
    this.destroyed = true;
  }

  private loadSprites() {
    const farmer = new Image();
    farmer.src = ASSETS.farmer;
    this.sprites.farmer = farmer;
    const sky = new Image();
    sky.src = ASSETS.sky;
    this.sprites.sky = sky;
    const wood = new Image();
    wood.src = ASSETS.wood;
    wood.onload = () => {
      this.woodReady = false;
    };
    this.woodImg = wood;
  }

  private ensurePattern(ctx: CanvasRenderingContext2D) {
    if (this.sprites.pattern || this.woodReady) return;
    const wood = this.woodImg;
    if (!wood || !wood.complete || !wood.naturalWidth) return;
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 130;
    const g = c.getContext("2d");
    if (!g) return;
    g.drawImage(wood, 0, 0, 200, 130);
    this.sprites.pattern = ctx.createPattern(c, "repeat");
    this.woodReady = true;
  }

  setViewport(w: number, h: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.skyH = clamp(h * 0.09, h < 460 ? 18 : 28, 62);
    this.pathH = clamp(h * 0.2, h < 460 ? 72 : 96, 136);
    this.pathTop = h - this.pathH;
    const padX = clamp(w * 0.028, 8, 16);
    const gapX = clamp(w * 0.016, 6, 10);
    const gapY = clamp(h * 0.01, 5, 8);
    const top = this.skyH + 6;
    const availW = w - padX * 2 - gapX * (COLS - 1);
    const availH = this.pathTop - top - 8 - gapY * (ROWS - 1);
    const plotW = availW / COLS;
    const plotH = Math.max(36, availH / ROWS);
    for (let i = 0; i < PLOT_COUNT; i++) {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const p = this.plots[i];
      p.x = padX + c * (plotW + gapX);
      p.y = top + r * (plotH + gapY);
      p.w = plotW;
      p.h = plotH;
    }
    this.aimFarmer(this.plots[this.cursor]);
    if (Math.abs(this.farmerX - this.farmerTarget) > 200) this.farmerX = this.farmerTarget;
    this.seedButterflies();
  }

  reset(announce = true) {
    this.finished = false;
    this.phase = "play";
    this.fxTime = 0;
    this.coins = 22;
    this.score = 0;
    this.happiness = 100;
    this.day = 1;
    this.dayTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.harvested = 0;
    this.shooed = 0;
    this.withered = 0;
    this.selected = "radish";
    this.cursor = 1;
    this.shake = 0;
    this.flash = announce ? 0.35 : 0;
    this.rainT = 0;
    this.rainEvery = 28 + Math.random() * 8;
    this.scareT = 0;
    this.scareCd = 12;
    this.banner = null;
    this.pestEvery = 10.5;
    this.weedEvery = 14;
    this.pity = 0;
    this.chirp = 4;
    this.titleRank = 0;
    this.recordAnnounced = false;
    this.brokeTick = 0;
    this.pop = 0;
    this.happyTick = 0;
    this.farmerJump = 0;
    this.best = bestScore();
    for (const p of this.particles) p.alive = false;
    this.floaters.length = 0;
    this.flyers.length = 0;
    for (let i = 0; i < PLOT_COUNT; i++) {
      const keep = { x: this.plots[i].x, y: this.plots[i].y, w: this.plots[i].w, h: this.plots[i].h };
      this.plots[i] = { ...emptyPlot(i), ...keep };
    }
    this.seedRipe(1, "radish", 9.5);
    this.seedRipe(2, "tomato", 11.5);
    this.seedGrow(5, "wheat", 0.88);
    this.seedGrow(6, "radish", 0.5);
    this.plots[6].thirsty = true;
    this.plots[6].thirstRolled = true;
    this.plots[6].thirstTimer = 9;
    this.coach = "اضغط المحصول الذهبي";
    this.coachEn = "Tap the gold crop";
    if (this.plots[1].w > 2) this.aimFarmer(this.plots[1]);
    if (this.w > 20) this.seedButterflies();
    if (announce) {
      this.hooks.onPhase("play");
      this.sfx.click();
    }
    this.emit(true);
  }

  private seedRipe(i: number, id: CropId, left: number) {
    const p = this.plots[i];
    p.state = "ripe";
    p.crop = id;
    p.growth = 1;
    p.ripeMax = left;
    p.ripeLeft = left;
    p.thirstRolled = true;
    p.pop = 1;
    p.ring = "gold";
  }

  private seedGrow(i: number, id: CropId, growth: number) {
    const p = this.plots[i];
    p.state = "growing";
    p.crop = id;
    p.growth = growth;
    p.thirstRolled = growth >= 0.5;
    p.pop = 1;
  }

  pointer(x: number, y: number) {
    if (this.phase !== "play") return;
    for (let i = this.plots.length - 1; i >= 0; i--) {
      const p = this.plots[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
        this.cursor = i;
        this.act(i);
        return;
      }
    }
  }

  keyDown(code: string, repeat = false) {
    if (repeat) return;
    this.keys.add(code);
    if (this.phase === "pause") {
      if (code === "Space" || code === "Enter" || code === "Escape" || code === "KeyP") this.resume();
      if (code === "KeyR") this.restart();
      return;
    }
    if (this.phase === "over") {
      if (code === "Space" || code === "Enter" || code === "KeyR") this.restart();
      return;
    }
    if (code === "Space" || code === "Enter") this.act(this.cursor);
    else if (code === "Digit1") this.select("radish");
    else if (code === "Digit2") this.select("wheat");
    else if (code === "Digit3") this.select("tomato");
    else if (code === "Digit4") this.select("pumpkin");
    else if (code === "KeyQ" || code === "BracketLeft") this.cycle(-1);
    else if (code === "KeyE" || code === "BracketRight") this.cycle(1);
    else if (code === "KeyF") this.scarecrow();
    else if (code === "KeyP" || code === "Escape") this.pause();
    else if (this.isDir(code)) {
      this.nudgeCursor();
      this.holdDelay = 0.18;
    }
  }

  keyUp(code: string) {
    this.keys.delete(code);
  }

  select(id: CropId) {
    if (this.phase !== "play") return;
    if (this.selected !== id) {
      this.selected = id;
      this.sfx.click();
      this.emit(true);
    }
  }

  cycle(dir: number) {
    const i = CROPS.findIndex((c) => c.id === this.selected);
    const n = (i + dir + CROPS.length) % CROPS.length;
    this.select(CROPS[n].id);
  }

  pause() {
    if (this.phase !== "play") return;
    this.phase = "pause";
    this.hooks.onPhase("pause");
    this.emit(true);
  }

  resume() {
    if (this.phase !== "pause") return;
    this.phase = "play";
    this.hooks.onPhase("play");
    this.sfx.click();
    this.emit(true);
  }

  restart() {
    this.reset(true);
  }

  scarecrow() {
    if (this.phase !== "play") return;
    if (this.scareCd > 0 || this.scareT > 0) {
      this.sfx.error();
      this.floatCenter("ليست جاهزة", "#ffd0c8");
      return;
    }
    this.scareT = SCARE_TIME;
    this.scareCd = SCARE_CD;
    this.sfx.power();
    this.addShake(9);
    this.flash = Math.max(this.flash, 0.18);
    this.banner = { text: "الفزّاعة!", sub: "الغربان تفر", life: 1.15, max: 1.15 };
    for (const p of this.plots) if (p.pest) this.shoo(p, true);
    this.burstAt(this.w * 0.5, this.pathTop, "spark", 16, "#ffe08a");
    this.buzz(18);
    this.emit(true);
  }

  update(dt: number) {
    if (this.destroyed) return;
    if (this.phase === "pause") return;
    const step = Math.min(0.034, Math.max(0, dt));
    this.fxTime += step;
    this.flash = Math.max(0, this.flash - step * 1.6);
    this.shake = Math.max(0, this.shake - step * 34);
    if (this.farmerJump > 0) this.farmerJump = Math.max(0, this.farmerJump - step * 2.4);
    this.updateMotion(step);
    this.updateParticles(step);
    this.updateFloaters(step);
    this.updateFlyers(step);
    if (this.banner) {
      this.banner.life -= step;
      if (this.banner.life <= 0) this.banner = null;
    }
    if (this.phase === "over") return;

    this.dayTimer += step;
    if (this.dayTimer >= DAY_LEN) this.nextDay();
    if (this.comboTimer > 0) {
      this.comboTimer -= step;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }
    if (this.scareT > 0) this.scareT = Math.max(0, this.scareT - step);
    else if (this.scareCd > 0) this.scareCd = Math.max(0, this.scareCd - step);

    const diff = this.difficulty();
    this.pestEvery -= step;
    this.weedEvery -= step;
    this.rainEvery -= step;
    if (this.pestEvery <= 0) this.spawnPest(diff);
    if (this.weedEvery <= 0) this.spawnWeed(diff);
    if (this.rainEvery <= 0) this.startRain();
    if (this.rainT > 0) this.rainT = Math.max(0, this.rainT - step);

    for (const p of this.plots) {
      if (this.phase !== "play") break;
      this.updatePlot(p, step, diff);
    }
    this.updateRings();
    this.updateCoach();
    this.updateHold(step);
    this.updatePity(step);
    this.chirp -= step;
    if (this.chirp <= 0) {
      this.chirp = rand(7, 13);
      this.sfx.chirp();
    }
    const moving = Math.abs(this.farmerTarget - this.farmerX) > 1.2;
    this.farmerMoving = moving;
    this.farmerX = lerp(this.farmerX, this.farmerTarget, Math.min(1, step * 10));
    this.farmerBob += step * (moving ? 12 : 3);
    this.emit(false);
  }

  render(ctx: CanvasRenderingContext2D) {
    this.ensurePattern(ctx);
    const model: DrawModel = {
      w: this.w,
      h: this.h,
      fxTime: this.fxTime,
      skyH: this.skyH,
      pathTop: this.pathTop,
      pathH: this.pathH,
      plots: this.plots,
      cursor: this.cursor,
      suggest: this.suggest,
      shake: this.shake,
      particles: this.particles,
      floaters: this.floaters,
      flyers: this.flyers,
      chickens: this.chickens,
      farmerX: this.farmerX,
      farmerBob: this.farmerBob,
      farmerJump: this.farmerJump,
      farmerMoving: this.farmerMoving,
      happiness: this.happiness,
      combo: this.combo,
      rainT: this.rainT,
      scareT: this.scareT,
      flash: this.flash,
      dayT: this.dayTimer / DAY_LEN,
      banner: this.banner,
      showHand: this.showHand,
      sprites: this.sprites,
    };
    renderGame(ctx, model);
  }

  private difficulty(): Diff {
    const k = clamp((this.fxTime - 6) / 150, 0, 1);
    return {
      pestEvery: lerp(8.2, 2.7, k),
      weedEvery: lerp(13, 6.2, k),
      ripeMul: lerp(1, 0.7, k),
      thirstChance: lerp(0.5, 0.8, k),
      thirstWindow: lerp(4.5, 2.55, k),
      pestWindow: lerp(4.1, 2.25, k),
      maxPests: this.fxTime < 22 ? 1 : this.fxTime < 60 ? 2 : 3,
      maxWeeds: this.fxTime < 28 ? 2 : 3,
    };
  }

  private act(i: number) {
    const p = this.plots[i];
    if (!p) return;
    this.cursor = i;
    this.aimFarmer(p);
    if (p.pest) {
      const ripe = p.state === "ripe";
      this.shoo(p, false);
      if (ripe && p.state === "ripe") this.harvest(p);
      this.afterAct();
      return;
    }
    if (p.state === "withered") {
      this.clearToEmpty(p);
      this.tryPlant(p);
      this.afterAct();
      return;
    }
    if (p.weed && p.state === "empty") {
      this.clearWeed(p);
      this.tryPlant(p);
      this.afterAct();
      return;
    }
    if (p.thirsty && p.state === "growing") {
      this.water(p);
      this.afterAct();
      return;
    }
    if (p.state === "ripe") {
      this.harvest(p);
      this.afterAct();
      return;
    }
    if (p.state === "growing") {
      this.pat(p);
      this.afterAct();
      return;
    }
    this.tryPlant(p);
    this.afterAct();
  }

  private afterAct() {
    this.updateRings();
    if (this.fxTime < 22 || this.harvested < 3) {
      const s = this.plots[this.suggest];
      if (s && s.ring && s.i !== this.cursor) {
        this.cursor = s.i;
        this.aimFarmer(s);
      }
    }
    this.emit(true);
  }

  private tryPlant(p: Plot) {
    if (p.state !== "empty" || p.weed) return;
    const crop = CROP_MAP[this.selected];
    if (this.coins < crop.cost) {
      this.brokeTick++;
      this.sfx.error();
      this.floatAt(p, "عملات غير كافية", "#ffd0c8", 15);
      this.addShake(2.4);
      this.buzz(10);
      p.punch = 1;
      return;
    }
    this.coins -= crop.cost;
    p.state = "growing";
    p.crop = crop.id;
    p.growth = 0.08;
    p.thirsty = false;
    p.thirstRolled = false;
    p.thirstTimer = 0;
    p.patted = false;
    p.ripeLeft = 0;
    p.wet = 0.55;
    p.pop = 1.45;
    p.punch = 1;
    p.pest = false;
    p.safeUntil = this.fxTime + 1.15;
    this.sfx.plant();
    this.burst(p, "dirt", 9);
    this.floatAt(p, crop.name, "#e7ffc8", 16);
    this.buzz(6);
  }

  private water(p: Plot, quiet = false) {
    if (!p.thirsty) return;
    p.thirsty = false;
    p.wet = 1.35;
    p.growth = Math.min(0.97, p.growth + 0.08);
    p.punch = 1;
    p.pop = 1.18;
    this.burst(p, "water", 12);
    if (!quiet) {
      this.happiness = Math.min(100, this.happiness + 1);
      this.sfx.water();
      this.floatAt(p, "سُقي!", "#c9ecff", 16);
      this.buzz(8);
    }
  }

  private pat(p: Plot) {
    p.punch = 1;
    if (!p.patted) {
      p.patted = true;
      p.growth = Math.min(0.9, p.growth + 0.13);
      p.pop = 1.2;
      this.sfx.click();
      this.burst(p, "leaf", 5);
      this.floatAt(p, "تشجيع!", "#e7ffc8", 15);
    } else {
      this.floatAt(p, "ينمو…", "#fff6ea", 14);
    }
  }

  private harvest(p: Plot) {
    if (p.state !== "ripe" || !p.crop) return;
    const crop = CROP_MAP[p.crop];
    if (this.comboTimer > 0) this.combo += 1;
    else this.combo = 1;
    this.comboTimer = COMBO_WINDOW;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = Math.min(4, 1 + (this.combo - 1) * 0.5);
    const perfect = p.ripeLeft > p.ripeMax * 0.62;
    let gained = Math.round(crop.value * mult);
    if (perfect) gained += Math.max(1, Math.round(crop.value * 0.25));
    const first = this.harvested === 0;
    this.coins += gained;
    this.score += gained;
    this.harvested += 1;
    this.happiness = Math.min(100, this.happiness + 5 + (perfect ? 2 : 0));
    this.pop++;
    this.farmerJump = 1;
    this.addShake(first ? 10 : this.combo >= 5 ? 12 : this.combo >= 3 ? 8 : 5.5);
    this.sfx.harvest(this.combo);
    this.buzz(this.combo >= 3 ? 16 : 10);
    this.burst(p, "coin", (first ? 16 : 9) + Math.min(6, this.combo));
    this.burst(p, "leaf", 8);
    this.burst(p, "spark", first ? 10 : 6);
    if (this.combo >= 4) this.burst(p, "heart", 3);
    this.floatAt(p, this.combo >= 2 ? `+${gained}  ×${this.combo}` : `+${gained}`, "#ffe08a", this.combo >= 3 ? 20 : 17);
    if (perfect) this.floatAt(p, "في الوقت!", "#fff", 13, -16);
    if (this.combo === 3) this.banner = { text: "رائع!", life: 0.85, max: 0.85 };
    if (this.combo === 5) this.banner = { text: "حمّى الحصاد!", life: 1.05, max: 1.05 };
    if (this.combo === 8) this.banner = { text: "أسطوري!", life: 1.15, max: 1.15 };
    this.checkTitle();
    this.checkRecord();
    p.state = "empty";
    p.crop = null;
    p.growth = 0;
    p.pest = false;
    p.thirsty = false;
    p.punch = 1;
    p.safeUntil = this.fxTime + 0.25;
    p.ring = null;
  }

  private shoo(p: Plot, fromScare: boolean) {
    if (!p.pest) return;
    p.pest = false;
    this.shooed += 1;
    const bonus = fromScare ? 3 : 5;
    this.coins += bonus;
    this.score += bonus;
    this.happiness = Math.min(100, this.happiness + (fromScare ? 1 : 3));
    this.pop++;
    if (!fromScare) this.sfx.shoo();
    this.burst(p, "feather", 8);
    this.flyers.push({
      x: p.x + p.w / 2,
      y: p.y + 18,
      vx: rand(-40, 40),
      vy: rand(-160, -90),
      life: 0.9,
      rot: rand(-0.4, 0.4),
    });
    this.floatAt(p, `+${bonus}`, "#d7e4ff", 15);
    this.addShake(fromScare ? 2 : 4);
    if (!fromScare) this.buzz(8);
    p.punch = 1;
  }

  private clearWeed(p: Plot) {
    p.weed = false;
    p.weedHit = false;
    this.coins += 2;
    this.score += 2;
    this.pop++;
    this.sfx.plant();
    this.burst(p, "leaf", 6);
    this.floatAt(p, "+2", "#e7ffc8", 14);
    p.punch = 1;
    p.safeUntil = this.fxTime + 0.4;
  }

  private clearToEmpty(p: Plot) {
    p.state = "empty";
    p.crop = null;
    p.growth = 0;
    p.thirsty = false;
    p.pest = false;
    p.weed = false;
    p.punch = 1;
    p.pop = 1;
    p.safeUntil = this.fxTime + 0.3;
    this.burst(p, "dust", 6);
  }

  private wither(p: Plot) {
    p.state = "withered";
    p.thirsty = false;
    p.pest = false;
    p.punch = 1;
    this.withered += 1;
    this.hurt(16, p, "ذبل!");
  }

  private pestEat(p: Plot) {
    p.pest = false;
    p.state = "empty";
    p.crop = null;
    p.growth = 0;
    p.thirsty = false;
    p.punch = 1;
    this.hurt(14, p, "الغراب أكل الزرعة");
    this.flyers.push({
      x: p.x + p.w / 2,
      y: p.y + 16,
      vx: 80,
      vy: -40,
      life: 0.7,
      rot: 0.2,
    });
  }

  private hurt(amount: number, p: Plot, text: string) {
    if (this.phase !== "play") return;
    this.happiness = Math.max(0, this.happiness - amount);
    this.happyTick++;
    this.addShake(7);
    this.sfx.wither();
    this.buzz(22);
    this.floatAt(p, text, "#ffb4a8", 15);
    this.burst(p, "dust", 10);
    if (this.happiness <= 0) this.finish();
  }

  private updatePlot(p: Plot, dt: number, diff: Diff) {
    p.punch = Math.max(0, p.punch - dt * 3.1);
    p.pop += (1 - p.pop) * Math.min(1, dt * 12);
    p.wet = Math.max(0, p.wet - dt);
    p.sparkAcc += dt;
    if (p.pest) {
      p.pestTimer -= dt;
      if (p.pestTimer <= 0) {
        this.pestEat(p);
        return;
      }
    }
    if (p.weed && p.state === "empty" && !p.weedHit) {
      p.weedTimer -= dt;
      if (p.weedTimer <= 0) {
        p.weedHit = true;
        this.hurt(8, p, "عشب ضار");
      }
    }
    if (p.state === "growing" && p.crop) {
      if (p.thirsty) {
        p.thirstTimer -= dt;
        if (p.thirstTimer <= 0) {
          this.wither(p);
          return;
        }
      } else {
        p.growth += dt / CROP_MAP[p.crop].grow;
        if (!p.thirstRolled && p.growth >= 0.5) {
          p.thirstRolled = true;
          if (Math.random() < diff.thirstChance) {
            p.thirsty = true;
            p.thirstTimer = diff.thirstWindow;
            this.sfx.thirst();
          }
        }
        if (p.growth >= 1) {
          p.growth = 1;
          p.state = "ripe";
          p.ripeMax = CROP_MAP[p.crop].ripe * diff.ripeMul;
          p.ripeLeft = p.ripeMax;
          p.thirsty = false;
          p.pop = 1.32;
          p.punch = 1;
          this.sfx.ripe();
          this.burst(p, "spark", 8);
          this.floatAt(p, "ناضج!", "#ffe08a", 15);
        }
      }
    } else if (p.state === "ripe") {
      p.ripeLeft -= dt;
      if (p.sparkAcc > 0.42) {
        p.sparkAcc = 0;
        this.burst(p, "spark", 1);
      }
      if (p.ripeLeft <= 0) this.wither(p);
    }
  }

  private spawnPest(diff: Diff) {
    this.pestEvery = diff.pestEvery * rand(0.82, 1.15);
    if (this.scareT > 0) return;
    const pests = this.plots.filter((p) => p.pest).length;
    if (pests >= diff.maxPests) return;
    const pool = this.plots.filter(
      (p) =>
        (p.state === "growing" || p.state === "ripe") &&
        !p.pest &&
        this.fxTime >= p.safeUntil,
    );
    if (!pool.length) return;
    const p = pick(pool);
    p.pest = true;
    p.pestMax = diff.pestWindow;
    p.pestTimer = diff.pestWindow;
    p.punch = 1;
    this.sfx.shoo();
    this.floatAt(p, "غراب!", "#ffd0c8", 14);
  }

  private spawnWeed(diff: Diff) {
    this.weedEvery = diff.weedEvery * rand(0.85, 1.2);
    const weeds = this.plots.filter((p) => p.weed).length;
    if (weeds >= diff.maxWeeds) return;
    const pool = this.plots.filter((p) => p.state === "empty" && !p.weed && this.fxTime >= p.safeUntil);
    if (!pool.length) return;
    const p = pick(pool);
    p.weed = true;
    p.weedTimer = 7.5;
    p.weedHit = false;
    p.punch = 1;
  }

  private startRain() {
    this.rainEvery = rand(36, 52);
    this.rainT = 3.5;
    this.sfx.rain();
    this.happiness = Math.min(100, this.happiness + 4);
    this.banner = { text: "مطر خير", sub: "+4 سعادة", life: 1.3, max: 1.3 };
    this.flash = Math.max(this.flash, 0.12);
    for (const p of this.plots) {
      if (p.thirsty) this.water(p, true);
      if (p.state === "growing") p.growth = Math.min(0.98, p.growth + 0.06);
      if (p.state !== "empty") this.burst(p, "water", 4);
    }
  }

  private nextDay() {
    this.day += 1;
    this.dayTimer = 0;
    this.happiness = Math.min(100, this.happiness + 5);
    this.banner = { text: `يوم ${this.day}`, sub: "صمدت المزرعة", life: 1.35, max: 1.35 };
    this.sfx.day();
    this.addShake(3.5);
    this.flash = Math.max(this.flash, 0.22);
    this.floatCenter(`+5 سعادة`, "#fff6ea");
  }

  private updateRings() {
    let best = -1;
    let bestScore = -1;
    for (const p of this.plots) {
      if (p.pest) p.ring = "red";
      else if (p.state === "ripe") p.ring = "gold";
      else if (p.thirsty) p.ring = "blue";
      else if (p.state === "withered" || (p.weed && p.weedTimer < 4)) p.ring = "brown";
      else p.ring = null;
      const u = this.urgency(p);
      if (u > bestScore) {
        bestScore = u;
        best = p.i;
      }
    }
    this.suggest = best < 0 ? this.cursor : best;
    const urgent = this.plots.some((p) => p.ring === "gold" || p.ring === "red" || p.ring === "blue");
    this.showHand = this.harvested < 1 || (this.fxTime < 18 && urgent);
  }

  private urgency(p: Plot) {
    if (p.pest) return 1000 - p.pestTimer;
    if (p.state === "ripe") return 800 - p.ripeLeft;
    if (p.thirsty) return 600 - p.thirstTimer;
    if (p.state === "withered") return 420;
    if (p.weed) return 300 - Math.min(8, p.weedTimer);
    if (p.state === "empty") return 120;
    if (p.state === "growing") return 40 + p.growth * 50;
    return 0;
  }

  private updateCoach() {
    if (this.fxTime > 20 && this.harvested >= 2) {
      this.coach = null;
      this.coachEn = null;
      return;
    }
    const p = this.plots[this.suggest];
    if (!p) return;
    if (p.state === "ripe") {
      this.coach = this.harvested < 1 ? "اضغط المحصول الذهبي" : "احصد التالي للسلسلة";
      this.coachEn = this.harvested < 1 ? "Tap the gold crop" : "Harvest again to combo";
    } else if (p.pest) {
      this.coach = "اطرد الغراب بسرعة";
      this.coachEn = "Shoo the crow";
    } else if (p.thirsty) {
      this.coach = "اسقِ القطرة الزرقاء";
      this.coachEn = "Water the blue drop";
    } else if (p.state === "empty" && !p.weed) {
      this.coach = "اختر بذرة وازرع";
      this.coachEn = "Pick a seed and plant";
    } else if (p.state === "withered" || p.weed) {
      this.coach = "نظّف الأرض وازرع";
      this.coachEn = "Clear the soil and plant";
    } else {
      this.coach = null;
      this.coachEn = null;
    }
  }

  private updatePity(dt: number) {
    const busy = this.plots.some((p) => p.state === "growing" || p.state === "ripe");
    if (this.coins < 2 && !busy) {
      this.pity += dt;
      if (this.pity >= 5.5) {
        this.pity = 0;
        this.coins += 3;
        this.floatCenter("هدية الجار +3", "#ffe08a");
        this.sfx.click();
      }
    } else this.pity = 0;
  }

  private updateHold(dt: number) {
    const dir = this.readDir();
    if (!dir) {
      this.holdDelay = 0;
      return;
    }
    this.holdDelay -= dt;
    if (this.holdDelay <= 0) {
      this.nudgeCursor();
      this.holdDelay = 0.07;
    }
  }

  private readDir() {
    let dc = 0;
    let dr = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) dc -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) dc += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) dr -= 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) dr += 1;
    if (!dc && !dr) return null;
    return { dc, dr };
  }

  private isDir(code: string) {
    return (
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "KeyA" ||
      code === "KeyD" ||
      code === "KeyW" ||
      code === "KeyS"
    );
  }

  private nudgeCursor() {
    const dir = this.readDir();
    if (!dir) return;
    const c = clamp((this.cursor % COLS) + dir.dc, 0, COLS - 1);
    const r = clamp(Math.floor(this.cursor / COLS) + dir.dr, 0, ROWS - 1);
    this.cursor = r * COLS + c;
    this.aimFarmer(this.plots[this.cursor]);
  }

  private aimFarmer(p: Plot) {
    this.farmerTarget = clamp(p.x + p.w / 2, 78, Math.max(80, this.w - 36));
  }

  private checkTitle() {
    const order = [0, 280, 900, 2000, 4500];
    while (this.titleRank + 1 < order.length && this.score >= order[this.titleRank + 1]) {
      this.titleRank += 1;
      this.banner = { text: farmTitle(this.score), sub: "مستوى جديد", life: 1.4, max: 1.4 };
      this.happiness = Math.min(100, this.happiness + 3);
      this.sfx.day();
      this.burstAt(this.w / 2, this.skyH + 20, "star", 12, "#ffe08a");
    }
  }

  private checkRecord() {
    if (this.recordAnnounced || this.best <= 0 || this.score <= this.best) return;
    this.recordAnnounced = true;
    this.banner = { text: "رقم قياسي!", life: 1.3, max: 1.3 };
    this.sfx.record();
    this.addShake(6);
    this.burstAt(this.w / 2, this.h * 0.35, "confetti", 18, "#fff");
  }

  private finish() {
    if (this.phase !== "play" || this.finished || this.destroyed) return;
    this.finished = true;
    this.phase = "over";
    this.happiness = 0;
    this.sfx.gameOver();
    this.addShake(11);
    this.burstConfetti();
    this.buzz(30);
    const at = Date.now();
    let scores = loadScores();
    let rank = 0;
    if (this.score > 0) {
      scores = saveScore({
        name: this.nickname,
        score: this.score,
        day: this.day,
        combo: this.bestCombo,
        crops: this.harvested,
        at,
      });
      rank = scores.findIndex((s) => s.at === at) + 1;
    }
    const isRecord = rank === 1 && this.score > 0;
    if (isRecord) this.sfx.record();
    const stats: RunStats = {
      score: this.score,
      day: this.day,
      bestCombo: this.bestCombo,
      harvested: this.harvested,
      coins: this.coins,
      title: farmTitle(this.score),
      isRecord,
      rank,
      shooed: this.shooed,
      withered: this.withered,
      scores,
      highlightAt: this.score > 0 ? at : 0,
    };
    this.hooks.onOver(stats);
    this.hooks.onPhase("over");
    this.emit(true);
  }

  private burstConfetti() {
    for (let i = 0; i < 46; i++) {
      this.spawnParticle({
        type: "confetti",
        x: rand(20, this.w - 20),
        y: rand(this.skyH, this.h * 0.45),
        vx: rand(-80, 80),
        vy: rand(-220, -40),
        life: rand(0.8, 1.5),
        max: 1.5,
        size: rand(5, 9),
        rot: rand(0, 6),
        vr: rand(-6, 6),
        color: pick(CONFETTI),
        gravity: 280,
      });
    }
  }

  private addShake(n: number) {
    this.shake = Math.max(this.shake, n);
  }

  private buzz(ms: number) {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* ignore */
    }
  }

  private aimCenter(p: Plot) {
    return { x: p.x + p.w / 2, y: p.y + p.h * 0.42 };
  }

  private floatAt(p: Plot, text: string, color: string, size = 16, yOff = 0) {
    const c = this.aimCenter(p);
    this.floaters.push({
      x: c.x + rand(-8, 8),
      y: c.y - 16 + yOff,
      text,
      life: 0.95,
      max: 0.95,
      color,
      size,
    });
    if (this.floaters.length > 14) this.floaters.shift();
  }

  private floatCenter(text: string, color: string) {
    this.floaters.push({
      x: this.w / 2,
      y: this.skyH + 28,
      text,
      life: 1.1,
      max: 1.1,
      color,
      size: 16,
    });
  }

  private burst(p: Plot, type: PType, n: number) {
    const c = this.aimCenter(p);
    this.burstAt(c.x, c.y, type, n);
  }

  private burstAt(x: number, y: number, type: PType, n: number, color?: string) {
    for (let i = 0; i < n; i++) this.spawnTyped(x, y, type, color);
  }

  private spawnTyped(x: number, y: number, type: PType, color?: string) {
    if (type === "coin") {
      this.spawnParticle({
        type,
        x,
        y,
        vx: rand(-110, 110),
        vy: rand(-280, -150),
        life: rand(0.55, 0.9),
        max: 0.9,
        size: rand(4.5, 7),
        rot: rand(0, 3),
        vr: rand(-4, 4),
        color: "#f0b429",
        gravity: 760,
      });
    } else if (type === "water") {
      this.spawnParticle({
        type,
        x: x + rand(-8, 8),
        y: y - 10,
        vx: rand(-30, 30),
        vy: rand(-40, 40),
        life: rand(0.35, 0.6),
        max: 0.6,
        size: rand(3, 5),
        rot: 0,
        vr: 0,
        color: "#49b4ff",
        gravity: 420,
      });
    } else if (type === "dirt") {
      this.spawnParticle({
        type,
        x,
        y,
        vx: rand(-80, 80),
        vy: rand(-160, -40),
        life: rand(0.35, 0.6),
        max: 0.6,
        size: rand(2.5, 4.5),
        rot: 0,
        vr: rand(-5, 5),
        color: pick(["#8a5428", "#c4844a", "#5c3418"]),
        gravity: 700,
      });
    } else if (type === "leaf") {
      this.spawnParticle({
        type,
        x,
        y,
        vx: rand(-70, 70),
        vy: rand(-140, -30),
        life: rand(0.5, 0.85),
        max: 0.85,
        size: rand(4, 7),
        rot: rand(0, 4),
        vr: rand(-5, 5),
        color: pick(LEAVES),
        gravity: 180,
      });
    } else if (type === "feather") {
      this.spawnParticle({
        type,
        x,
        y,
        vx: rand(-90, 90),
        vy: rand(-120, -20),
        life: rand(0.45, 0.8),
        max: 0.8,
        size: rand(4, 7),
        rot: rand(0, 3),
        vr: rand(-3, 3),
        color: "#24365c",
        gravity: 40,
      });
    } else if (type === "spark" || type === "star") {
      this.spawnParticle({
        type,
        x: x + rand(-10, 10),
        y: y + rand(-12, 6),
        vx: rand(-30, 30),
        vy: rand(-50, -10),
        life: rand(0.3, 0.6),
        max: 0.6,
        size: rand(3, 6),
        rot: 0,
        vr: rand(-2, 2),
        color: color || pick(["#fff6c2", "#ffe08a", "#fff"]),
        gravity: 20,
      });
    } else if (type === "heart") {
      this.spawnParticle({
        type,
        x,
        y,
        vx: rand(-40, 40),
        vy: rand(-90, -40),
        life: 0.7,
        max: 0.7,
        size: rand(4, 6),
        rot: 0,
        vr: 0,
        color: "#ff5a7a",
        gravity: 40,
      });
    } else if (type === "dust") {
      this.spawnParticle({
        type,
        x,
        y,
        vx: rand(-50, 50),
        vy: rand(-70, -10),
        life: rand(0.4, 0.7),
        max: 0.7,
        size: rand(3, 6),
        rot: 0,
        vr: 0,
        color: pick(["#c8b8a4", "#8d7d6c", "#e7d8c8"]),
        gravity: 80,
      });
    } else {
      this.spawnParticle({
        type: "confetti",
        x,
        y,
        vx: rand(-100, 100),
        vy: rand(-180, -40),
        life: rand(0.6, 1),
        max: 1,
        size: rand(4, 7),
        rot: rand(0, 3),
        vr: rand(-6, 6),
        color: color || pick(CONFETTI),
        gravity: 260,
      });
    }
  }

  private blankParticle(): Particle {
    return {
      alive: false,
      type: "spark",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 3,
      rot: 0,
      vr: 0,
      color: "#fff",
      gravity: 0,
    };
  }

  private spawnParticle(partial: Omit<Particle, "alive">) {
    let slot = this.particles.find((p) => !p.alive);
    if (!slot) slot = this.particles.reduce((a, b) => (a.life < b.life ? a : b));
    Object.assign(slot, partial, { alive: true });
  }

  private seedButterflies() {
    const alive = this.particles.filter((p) => p.alive && p.type === "butterfly").length;
    for (let i = alive; i < 4; i++) {
      this.spawnParticle({
        type: "butterfly",
        x: rand(10, Math.max(20, this.w - 10)),
        y: rand(this.skyH + 10, Math.max(this.skyH + 20, this.pathTop - 20)),
        vx: rand(-12, 12),
        vy: 0,
        life: 99,
        max: 99,
        size: 3,
        rot: rand(0, 6),
        vr: 0,
        color: pick(["#ffb15a", "#ff7aa2", "#fff", "#ffe08a"]),
        gravity: 0,
      });
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      if (!p.alive) continue;
      if (p.type === "butterfly") {
        p.x += Math.sin(this.fxTime * 2.2 + p.rot) * 22 * dt + p.vx * dt;
        p.y += Math.cos(this.fxTime * 1.5 + p.rot) * 14 * dt;
        if (p.x < -8) p.x = this.w + 4;
        if (p.x > this.w + 8) p.x = -4;
        if (p.y < this.skyH) p.y = this.skyH + 6;
        if (p.y > this.pathTop - 8) p.y = this.skyH + 18;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  private updateFloaters(dt: number) {
    for (const f of this.floaters) f.life -= dt;
    if (this.floaters.some((f) => f.life <= 0)) this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  private updateFlyers(dt: number) {
    for (const f of this.flyers) {
      f.life -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 40 * dt;
      f.rot += dt * 2;
    }
    if (this.flyers.some((f) => f.life <= 0)) this.flyers = this.flyers.filter((f) => f.life > 0);
  }

  private updateMotion(dt: number) {
    const left = 20;
    const right = Math.max(40, this.w - 20);
    for (const c of this.chickens) {
      c.bob += dt * (c.wait > 0 ? 2 : 9);
      if (c.wait > 0) {
        c.wait -= dt;
        if (c.peck > 0) c.peck = Math.max(0, c.peck - dt);
        continue;
      }
      if (c.peck > 0) {
        c.peck -= dt;
        continue;
      }
      c.x += c.vx * dt;
      if (c.x < left || c.x > right) {
        c.vx *= -1;
        c.facing = c.vx >= 0 ? 1 : -1;
        c.x = clamp(c.x, left, right);
      }
      if (Math.random() < dt * 0.35) {
        c.peck = 0.45;
        c.wait = rand(0.2, 0.8);
      }
    }
  }

  private hintFor(p: Plot) {
    const crop = CROP_MAP[this.selected];
    if (p.pest) return { ar: "اطرد الغراب", en: "Shoo the crow" };
    if (p.weed && p.state === "empty") return { ar: "أزل العشب", en: "Pull the weed" };
    if (p.state === "withered") return { ar: "نظّف وأعد الزراعة", en: "Clear and replant" };
    if (p.thirsty) return { ar: "اسقِ الزرعة", en: "Water the crop" };
    if (p.state === "ripe") return { ar: "احصد الآن", en: "Harvest now" };
    if (p.state === "growing") return { ar: "ينمو — شجّعه", en: "Growing — cheer it" };
    if (this.coins < crop.cost) return { ar: "عملات غير كافية", en: "Not enough coins" };
    return { ar: `ازرع ${crop.name}`, en: `Plant ${crop.en}` };
  }

  private emit(force: boolean) {
    if (this.destroyed) return;
    const p = this.plots[this.cursor] ?? this.plots[0];
    const hint = p ? this.hintFor(p) : { ar: "", en: "" };
    const hud: Hud = {
      coins: this.coins,
      score: this.score,
      happiness: this.happiness,
      day: this.day,
      combo: this.combo,
      bestCombo: this.bestCombo,
      selected: this.selected,
      hint: hint.ar,
      hintEn: hint.en,
      title: farmTitle(this.score),
      harvested: this.harvested,
      phase: this.phase,
      brokeTick: this.brokeTick,
      pop: this.pop,
      happyTick: this.happyTick,
      coach: this.coach,
      coachEn: this.coachEn,
      best: this.best,
      recordLive: this.best > 0 && this.score > this.best,
      shooed: this.shooed,
      withered: this.withered,
    };
    const key = JSON.stringify(hud);
    if (!force && key === this.lastHud) return;
    this.lastHud = key;
    this.hooks.onHud(hud);
  }
}
