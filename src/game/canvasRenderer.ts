import type { FloatingCallout, MathQuestion, Particle } from './types';

export interface RenderFrameState {
  width: number;
  height: number;
  roadScroll: number;
  playerLanePos: number; // 0..2 smooth
  playerTilt: number; // -1..1
  playerSquashX: number;
  playerSquashY: number;
  playerFlashTimer: number;
  isBoosting: boolean;
  speedKmh: number;
  shakeX: number;
  shakeY: number;
  isPlaying: boolean;
  question: MathQuestion | null;
  waveZ: number; // 1.0 (horizon) -> 0.0 (camera)
  waveColors: [string, string, string];
  rivalProgress: number;
  playerProgress: number;
  questionIndex: number;
  totalQuestions: number;
  particles: Particle[];
  callouts: FloatingCallout[];
  backdropCanvas: HTMLCanvasElement | null;
}

export const LANE_COLORS: string[] = [
  '#0ea5e9', // Sky Blue
  '#f59e0b', // Amber Gold
  '#10b981', // Emerald
  '#ec4899', // Rose
  '#8b5cf6', // Violet
];

const PERSPECTIVE_K = 3.6;
const MIN_PROJ = 1 / (1 + PERSPECTIVE_K);

export function projectDepth(z: number): { p: number; scale: number } {
  const clamped = Math.max(-0.08, Math.min(1.05, z));
  const raw = 1 / (1 + clamped * PERSPECTIVE_K);
  const p = (raw - MIN_PROJ) / (1 - MIN_PROJ);
  return { p, scale: raw };
}

export function getRoadMetrics(width: number, height: number) {
  const horizonY = height * 0.34;
  const roadLen = height - horizonY;
  const centerX = width * 0.5;
  const halfBottom = Math.min(width * 0.41, 410);
  const halfTop = Math.min(width * 0.055, 52);
  return { horizonY, roadLen, centerX, halfBottom, halfTop };
}

export function laneToWorldX(
  lanePos: number, // 0..2
  halfWidth: number,
  centerX: number
): number {
  const offset = (lanePos - 1) * (halfWidth * 0.62);
  return centerX + offset;
}

export function buildStaticBackdrop(
  w: number,
  h: number,
  dpr: number
): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = Math.floor(w * dpr);
  off.height = Math.floor(h * dpr);
  const ctx = off.getContext('2d');
  if (!ctx) return off;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { horizonY, centerX, halfBottom, halfTop } = getRoadMetrics(w, h);

  // 1. Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 12);
  skyGrad.addColorStop(0, '#3b82f6');
  skyGrad.addColorStop(0.6, '#7dd3fc');
  skyGrad.addColorStop(1, '#dbeafe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY + 12);

  // 2. Soft Clouds
  drawCloud(ctx, w * 0.2, horizonY * 0.36, Math.min(w * 0.07, 68));
  drawCloud(ctx, w * 0.76, horizonY * 0.25, Math.min(w * 0.085, 82));

  // 3. Distant City Skyline
  drawCitySkyline(ctx, w, horizonY);

  // 4. Roadside Ground (Slate City Verge)
  const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
  groundGrad.addColorStop(0, '#64748b');
  groundGrad.addColorStop(1, '#475569');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Park strips alongside sidewalks
  ctx.fillStyle = '#3f6212';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(centerX - halfTop * 1.45, horizonY);
  ctx.lineTo(centerX - halfBottom * 1.32, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w, horizonY);
  ctx.lineTo(centerX + halfTop * 1.45, horizonY);
  ctx.lineTo(centerX + halfBottom * 1.32, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // 5. Road Asphalt Surface
  ctx.fillStyle = '#2b3040';
  ctx.beginPath();
  ctx.moveTo(centerX - halfTop, horizonY);
  ctx.lineTo(centerX + halfTop, horizonY);
  ctx.lineTo(centerX + halfBottom, h);
  ctx.lineTo(centerX - halfBottom, h);
  ctx.closePath();
  ctx.fill();

  return off;
}

export function renderHighwayFrame(
  ctx: CanvasRenderingContext2D,
  state: RenderFrameState
): void {
  const { width: w, height: h } = state;
  if (w <= 0 || h <= 0) return;

  const { horizonY, roadLen, centerX, halfBottom, halfTop } = getRoadMetrics(
    w,
    h
  );

  ctx.save();
  if (state.shakeX !== 0 || state.shakeY !== 0) {
    ctx.fillStyle = '#161830';
    ctx.fillRect(0, 0, w, h);
    ctx.translate(state.shakeX, state.shakeY);
  }

  // 1-5. Cached Static Sky, City Skyline & Asphalt Base
  if (state.backdropCanvas) {
    ctx.drawImage(state.backdropCanvas, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#2b3040';
    ctx.fillRect(0, 0, w, h);
  }

  // 6. Scrolling Curbs & Road Markings
  const stripeCount = 14;
  const scrollPhase = state.roadScroll % 1;

  for (let i = stripeCount - 1; i >= 0; i--) {
    const zNear = (i - scrollPhase) / stripeCount;
    const zFar = (i + 1 - scrollPhase) / stripeCount;
    if (zFar < 0 || zNear > 1) continue;

    const pNear = projectDepth(Math.max(0, zNear)).p;
    const pFar = projectDepth(Math.min(1, zFar)).p;
    const yNear = horizonY + pNear * roadLen;
    const yFar = horizonY + pFar * roadLen;
    const hwNear = halfTop + (halfBottom - halfTop) * pNear;
    const hwFar = halfTop + (halfBottom - halfTop) * pFar;

    const isAlt = (i + Math.floor(state.roadScroll)) % 2 === 0;

    // Alternating Red/White Outer Curbs
    const curbNear = hwNear * 0.055;
    const curbFar = hwFar * 0.055;
    ctx.fillStyle = isAlt ? '#ef4444' : '#f8fafc';

    ctx.beginPath();
    ctx.moveTo(centerX - hwFar - curbFar, yFar);
    ctx.lineTo(centerX - hwFar, yFar);
    ctx.lineTo(centerX - hwNear, yNear);
    ctx.lineTo(centerX - hwNear - curbNear, yNear);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX + hwFar, yFar);
    ctx.lineTo(centerX + hwFar + curbFar, yFar);
    ctx.lineTo(centerX + hwNear + curbNear, yNear);
    ctx.lineTo(centerX + hwNear, yNear);
    ctx.closePath();
    ctx.fill();

    // Dashed Lane Dividers
    if (isAlt) {
      const dashWNear = Math.max(2, hwNear * 0.022);
      const dashWFar = Math.max(1, hwFar * 0.022);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';

      for (const sign of [-1, 1]) {
        const xNear = centerX + sign * hwNear * 0.31;
        const xFar = centerX + sign * hwFar * 0.31;
        ctx.beginPath();
        ctx.moveTo(xFar - dashWFar, yFar);
        ctx.lineTo(xFar + dashWFar, yFar);
        ctx.lineTo(xNear + dashWNear, yNear);
        ctx.lineTo(xNear - dashWNear, yNear);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Yellow Inner Shoulder Lines
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = Math.max(2, w * 0.0025);
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(centerX + sign * halfTop * 0.94, horizonY);
    ctx.lineTo(centerX + sign * halfBottom * 0.94, h);
    ctx.stroke();
  }

  // Active player lane guide subtle highlight when playing
  if (state.isPlaying) {
    const activeLane = Math.max(0, Math.min(2, Math.round(state.playerLanePos)));
    const laneNorm = (activeLane - 1) * 0.62;
    const laneHalf = 0.28;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.beginPath();
    ctx.moveTo(centerX + (laneNorm - laneHalf) * halfTop, horizonY);
    ctx.lineTo(centerX + (laneNorm + laneHalf) * halfTop, horizonY);
    ctx.lineTo(centerX + (laneNorm + laneHalf) * halfBottom, h);
    ctx.lineTo(centerX + (laneNorm - laneHalf) * halfBottom, h);
    ctx.closePath();
    ctx.fill();
  }

  // 7. Roadside Buildings, Trees & Lamps
  const propCount = 7;
  const propOffset = (state.roadScroll * 0.5) % 1;
  for (let i = propCount - 1; i >= 0; i--) {
    const z = (i + (1 - propOffset)) / propCount;
    if (z <= 0.02 || z > 1.0) continue;
    const { p, scale } = projectDepth(z);
    const y = horizonY + p * roadLen;
    const hw = halfTop + (halfBottom - halfTop) * p;

    const slot = (i + Math.floor(state.roadScroll * 0.5)) % 4;
    drawRoadsideProp(ctx, centerX - hw * 1.48, y, scale, slot, true);
    drawRoadsideProp(ctx, centerX + hw * 1.48, y, scale, (slot + 2) % 4, false);
  }

  // 8. Finish Line Banner when on final question & wave close
  if (
    state.isPlaying &&
    state.questionIndex === state.totalQuestions - 1 &&
    state.waveZ < 0.85
  ) {
    const { p, scale } = projectDepth(Math.max(0.02, state.waveZ - 0.08));
    const y = horizonY + p * roadLen;
    const hw = halfTop + (halfBottom - halfTop) * p;
    drawFinishBanner(ctx, centerX, y, hw, scale);
  }

  // 9. Rival Car (Zoom) on shoulder/track edge when playing
  if (state.isPlaying) {
    const gap = state.rivalProgress - state.playerProgress;
    const rivalZ = Math.max(0.06, Math.min(0.68, 0.24 - gap * 0.9));
    const { p, scale } = projectDepth(rivalZ);
    const ry = horizonY + p * roadLen;
    const rhw = halfTop + (halfBottom - halfTop) * p;
    const rx = centerX + rhw * 1.12;
    drawRivalCar(ctx, rx, ry, scale * Math.min(w, 1000) * 0.105);
  }

  // 10. Approaching Answer Cars
  if (state.isPlaying && state.question && state.waveZ > -0.04) {
    const { p, scale } = projectDepth(state.waveZ);
    const wy = horizonY + p * roadLen;
    const whw = halfTop + (halfBottom - halfTop) * p;
    const carSize = scale * Math.min(w * 0.145, 118);
    const laneSpacing = whw * 0.62;

    for (let lane = 0; lane < 3; lane++) {
      const lx = laneToWorldX(lane, whw, centerX);
      const choiceVal = state.question.choices[lane];
      const carColor = state.waveColors[lane];
      drawAnswerCar(ctx, lx, wy, carSize, carColor, choiceVal, scale, laneSpacing);
    }
  }

  // 11. Boost Speed Lines when boosting
  if (state.isBoosting && state.isPlaying) {
    drawBoostSpeedLines(ctx, w, h, state.roadScroll);
  }

  // 12. Player Sports Car
  const playerZ = 0.085;
  const { p: pp, scale: pScale } = projectDepth(playerZ);
  const py = horizonY + pp * roadLen;
  const phw = halfTop + (halfBottom - halfTop) * pp;
  const px = laneToWorldX(state.playerLanePos, phw, centerX);
  const playerCarSize = pScale * Math.min(w * 0.16, 128);

  drawPlayerCar(
    ctx,
    px,
    py,
    playerCarSize,
    state.playerTilt,
    state.playerSquashX,
    state.playerSquashY,
    state.isBoosting,
    state.playerFlashTimer > 0
  );

  // 13. Pooled Particles
  for (let i = 0; i < state.particles.length; i++) {
    const pt = state.particles[i];
    if (!pt.active) continue;
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 14. Floating Callouts
  for (let i = 0; i < state.callouts.length; i++) {
    const c = state.callouts[i];
    if (!c.active) continue;
    const alpha = Math.min(1, (c.life / c.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${Math.round(Math.min(w * 0.032, 26))}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0f172a';
    ctx.strokeText(c.text, c.x, c.y);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y);
    ctx.restore();
  }

  ctx.restore();
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.45, y + r * 0.06, r * 0.6, r * 0.3, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.5, y + r * 0.08, r * 0.55, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCitySkyline(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number
): void {
  const towers = [
    { x: 0.02, bw: 0.055, bh: 0.28 },
    { x: 0.08, bw: 0.045, bh: 0.44 },
    { x: 0.13, bw: 0.06, bh: 0.34 },
    { x: 0.2, bw: 0.05, bh: 0.52 },
    { x: 0.26, bw: 0.055, bh: 0.31 },
    { x: 0.33, bw: 0.04, bh: 0.22 },
    { x: 0.63, bw: 0.045, bh: 0.24 },
    { x: 0.69, bw: 0.055, bh: 0.38 },
    { x: 0.76, bw: 0.05, bh: 0.55 },
    { x: 0.82, bw: 0.06, bh: 0.33 },
    { x: 0.89, bw: 0.048, bh: 0.46 },
    { x: 0.945, bw: 0.055, bh: 0.27 },
  ];
  ctx.fillStyle = '#94a3b8';
  for (const t of towers) {
    const bx = t.x * w;
    const bw = t.bw * w;
    const bh = t.bh * horizonY;
    ctx.fillRect(bx, horizonY - bh, bw, bh + 2);
  }
}

function drawRoadsideProp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  kind: number,
  isLeft: boolean
): void {
  if (kind === 0 || kind === 2) {
    const bw = 96 * scale;
    const bh = (kind === 0 ? 132 : 108) * scale;
    const bx = isLeft ? x - bw * 0.9 : x - bw * 0.1;
    const by = y - bh;

    ctx.fillStyle = kind === 0 ? '#ea580c' : '#2563eb';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = kind === 0 ? '#c2410c' : '#1d4ed8';
    ctx.fillRect(bx + bw * 0.72, by, bw * 0.28, bh);

    ctx.fillStyle = '#fde68a';
    const winW = bw * 0.14;
    const winH = bh * 0.1;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(
          bx + bw * (0.12 + c * 0.2),
          by + bh * (0.16 + r * 0.24),
          winW,
          winH
        );
      }
    }
  } else if (kind === 1) {
    const poleH = 86 * scale;
    const poleW = Math.max(2, 5 * scale);
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - poleW * 0.5, y - poleH, poleW, poleH);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(x + (isLeft ? 10 : -10) * scale, y - poleH, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const trunkH = 26 * scale;
    const trunkW = Math.max(2, 8 * scale);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - trunkW * 0.5, y - trunkH, trunkW, trunkH);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x, y - trunkH - 18 * scale, 24 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFinishBanner(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  halfWidth: number,
  scale: number
): void {
  const cols = 10;
  const barH = Math.max(8, 22 * scale);
  const segW = (halfWidth * 2) / cols;
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#0f172a';
    ctx.fillRect(centerX - halfWidth + i * segW, y - barH * 0.5, segW + 0.5, barH);
  }
}

function drawRivalCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const w = size * 0.85;
  const h = size * 0.62;
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.12, w * 0.52, h * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  roundRect(ctx, -w * 0.46, -h * 0.52, w * 0.92, h * 0.56, 8);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-w * 0.08, -h * 0.52, w * 0.16, h * 0.56);

  ctx.fillStyle = '#0f172a';
  roundRect(ctx, -w * 0.3, -h * 0.76, w * 0.6, h * 0.28, 5);
  ctx.fill();

  if (size > 26) {
    ctx.font = `700 ${Math.max(10, Math.round(size * 0.18))}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('RIVAL', 0, -h * 0.92);
  }

  ctx.restore();
}

function drawAnswerCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  value: number,
  scale: number,
  laneSpacing: number
): void {
  const w = size * 0.96;
  const h = size * 0.68;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.1, w * 0.54, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  roundRect(ctx, -w * 0.48, -h * 0.22, w * 0.16, h * 0.3, 4);
  ctx.fill();
  roundRect(ctx, w * 0.32, -h * 0.22, w * 0.16, h * 0.3, 4);
  ctx.fill();

  ctx.fillStyle = color;
  roundRect(ctx, -w * 0.45, -h * 0.58, w * 0.9, h * 0.54, Math.max(4, size * 0.1));
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  roundRect(ctx, -w * 0.3, -h * 0.84, w * 0.6, h * 0.32, Math.max(3, size * 0.08));
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-w * 0.38, -h * 0.35, w * 0.14, h * 0.12);
  ctx.fillRect(w * 0.24, -h * 0.35, w * 0.14, h * 0.12);

  const badgeW = Math.min(laneSpacing * 0.84, Math.max(24, size * 0.62));
  const badgeH = Math.max(20, Math.min(size * 0.46, badgeW * 0.78));
  const badgeY = -h * 1.44;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = Math.max(1.5, 3 * scale);
  roundRect(ctx, -badgeW * 0.5, badgeY, badgeW, badgeH, Math.max(5, badgeH * 0.25));
  ctx.fill();
  ctx.stroke();

  const fontSize = Math.max(11, Math.round(badgeH * 0.64));
  ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), 0, badgeY + badgeH * 0.53);

  ctx.restore();
}

function drawPlayerCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tilt: number,
  squashX: number,
  squashY: number,
  isBoosting: boolean,
  isFlashing: boolean
): void {
  const w = size * 1.05;
  const h = size * 0.72;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt * 0.14);
  ctx.scale(squashX, squashY);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.14, w * 0.56, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isBoosting) {
    const flicker = 0.85 + Math.random() * 0.35;
    for (const ex of [-w * 0.2, w * 0.2]) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(ex - w * 0.08, h * 0.02);
      ctx.lineTo(ex + w * 0.08, h * 0.02);
      ctx.lineTo(ex, h * 0.42 * flicker);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(ex - w * 0.04, h * 0.02);
      ctx.lineTo(ex + w * 0.04, h * 0.02);
      ctx.lineTo(ex, h * 0.25 * flicker);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.fillStyle = '#090d16';
  roundRect(ctx, -w * 0.5, -h * 0.25, w * 0.18, h * 0.34, 5);
  ctx.fill();
  roundRect(ctx, w * 0.32, -h * 0.25, w * 0.18, h * 0.34, 5);
  ctx.fill();

  ctx.fillStyle = isFlashing ? '#ffffff' : '#dc2626';
  roundRect(ctx, -w * 0.46, -h * 0.62, w * 0.92, h * 0.6, 12);
  ctx.fill();

  ctx.fillStyle = isFlashing ? '#fecaca' : '#f8fafc';
  ctx.fillRect(-w * 0.09, -h * 0.62, w * 0.18, h * 0.6);

  ctx.fillStyle = '#0f172a';
  roundRect(ctx, -w * 0.3, -h * 0.88, w * 0.6, h * 0.3, 7);
  ctx.fill();

  ctx.fillStyle = '#111827';
  roundRect(ctx, -w * 0.52, -h * 0.72, w * 1.04, h * 0.12, 3);
  ctx.fill();

  ctx.fillStyle = '#fca5a5';
  roundRect(ctx, -w * 0.41, -h * 0.34, w * 0.17, h * 0.13, 3);
  ctx.fill();
  roundRect(ctx, w * 0.24, -h * 0.34, w * 0.17, h * 0.13, 3);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(-w * 0.2, -h * 0.07, w * 0.045, 0, Math.PI * 2);
  ctx.arc(w * 0.2, -h * 0.07, w * 0.045, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBoostSpeedLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scroll: number
): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 2;
  const cx = w * 0.5;
  const cy = h * 0.34;
  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const angle = side * (0.38 + i * 0.07);
    const phase = (scroll * 1.8 + i * 0.27) % 1;
    const r0 = w * (0.22 + phase * 0.35);
    const r1 = r0 + w * 0.11;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.abs(Math.sin(angle)) * r0 * 0.7);
    ctx.lineTo(cx + Math.cos(angle) * r1, cy + Math.abs(Math.sin(angle)) * r1 * 0.7);
    ctx.stroke();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
