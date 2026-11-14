import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  buildStaticBackdrop,
  getRoadMetrics,
  LANE_COLORS,
  renderHighwayFrame,
} from '../game/canvasRenderer';
import { generateQuestion } from '../game/mathEngine';
import {
  buildEndSummary,
  evaluateAnswerHit,
  MAX_SHIELDS,
  SPEED_CONFIGS,
  TOTAL_QUESTIONS,
} from '../game/raceRules';
import { soundEngine } from '../game/sound';
import type {
  EndSummary,
  FloatingCallout,
  GameState,
  HudSnapshot,
  MathOperation,
  MathQuestion,
  Particle,
  SpeedPreset,
} from '../game/types';

export interface GameCanvasHandle {
  steerBy: (delta: -1 | 1) => void;
  setLane: (lane: 0 | 1 | 2) => void;
  setPointerBoost: (active: boolean) => void;
}

interface GameCanvasProps {
  gameState: GameState;
  operation: MathOperation;
  speedPreset: SpeedPreset;
  runNonce: number;
  bestScore: number;
  speedTextRef: React.RefObject<HTMLSpanElement | null>;
  boostActiveRef: React.RefObject<HTMLButtonElement | null>;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (summary: EndSummary) => void;
}

const MAX_PARTICLES = 120;
const MAX_CALLOUTS = 8;
const PLAYER_Z = 0.085;

function createParticlePool(): Particle[] {
  return Array.from({ length: MAX_PARTICLES }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 4,
    life: 0,
    maxLife: 1,
    color: '#ffffff',
  }));
}

function createCalloutPool(): FloatingCallout[] {
  return Array.from({ length: MAX_CALLOUTS }, () => ({
    active: false,
    x: 0,
    y: 0,
    text: '',
    color: '#ffffff',
    life: 0,
    maxLife: 1,
  }));
}

function pickWaveColors(): [string, string, string] {
  const pool = [...LANE_COLORS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return [pool[0], pool[1], pool[2]];
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function GameCanvas(
    {
      gameState,
      operation,
      speedPreset,
      runNonce,
      bestScore,
      speedTextRef,
      boostActiveRef,
      onHudUpdate,
      onGameOver,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const propsRef = useRef({
      gameState,
      operation,
      speedPreset,
      bestScore,
      onHudUpdate,
      onGameOver,
    });
    propsRef.current = {
      gameState,
      operation,
      speedPreset,
      bestScore,
      onHudUpdate,
      onGameOver,
    };

    const simRef = useRef({
      width: 1280,
      height: 800,
      roadScroll: 0,
      targetLane: 1 as 0 | 1 | 2,
      playerLanePos: 1,
      playerTilt: 0,
      playerSquashX: 1,
      playerSquashY: 1,
      playerFlashTimer: 0,
      speedKmh: 50,
      hitstopTimer: 0,
      trauma: 0,
      pendingFinishTimer: -1,
      pendingSummary: null as EndSummary | null,
      keyBoost: false,
      pointerBoost: false,
      questionIndex: 0,
      question: null as MathQuestion | null,
      waveZ: 0.96,
      waveColors: pickWaveColors(),
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctCount: 0,
      shields: MAX_SHIELDS,
      playerProgress: 0,
      rivalProgress: 0,
      hudSyncAccum: 0,
      particleCursor: 0,
      calloutCursor: 0,
      particles: createParticlePool(),
      callouts: createCalloutPool(),
    });

    const steerLane = (delta: -1 | 1) => {
      const sim = simRef.current;
      if (propsRef.current.gameState !== 'playing' || sim.pendingFinishTimer >= 0) {
        return;
      }
      const next = Math.max(0, Math.min(2, sim.targetLane + delta)) as 0 | 1 | 2;
      if (next !== sim.targetLane) {
        sim.targetLane = next;
        soundEngine.playSteer();
      }
    };

    const setLaneDirect = (lane: 0 | 1 | 2) => {
      const sim = simRef.current;
      if (propsRef.current.gameState !== 'playing' || sim.pendingFinishTimer >= 0) {
        return;
      }
      if (lane !== sim.targetLane) {
        sim.targetLane = lane;
        soundEngine.playSteer();
      }
    };

    useImperativeHandle(ref, () => ({
      steerBy: steerLane,
      setLane: setLaneDirect,
      setPointerBoost: (active: boolean) => {
        simRef.current.pointerBoost = active;
      },
    }));

    // Reset simulation whenever a new run begins
    useEffect(() => {
      const sim = simRef.current;
      const cfg = SPEED_CONFIGS[speedPreset];
      const firstQ = generateQuestion(operation, 0);

      sim.targetLane = 1;
      sim.playerLanePos = 1;
      sim.playerTilt = 0;
      sim.playerSquashX = 1;
      sim.playerSquashY = 1;
      sim.playerFlashTimer = 0;
      sim.speedKmh = cfg.baseKmh;
      sim.hitstopTimer = 0;
      sim.trauma = 0;
      sim.pendingFinishTimer = -1;
      sim.pendingSummary = null;
      sim.keyBoost = false;
      sim.pointerBoost = false;
      sim.questionIndex = 0;
      sim.question = firstQ;
      sim.waveZ = 0.96;
      sim.waveColors = pickWaveColors();
      sim.score = 0;
      sim.streak = 0;
      sim.bestStreak = 0;
      sim.correctCount = 0;
      sim.shields = MAX_SHIELDS;
      sim.playerProgress = 0;
      sim.rivalProgress = 0;
      sim.hudSyncAccum = 0;

      for (let i = 0; i < sim.particles.length; i++) sim.particles[i].active = false;
      for (let i = 0; i < sim.callouts.length; i++) sim.callouts[i].active = false;

      onHudUpdate({
        questionIndex: 0,
        totalQuestions: TOTAL_QUESTIONS,
        questionPrompt: firstQ.prompt,
        score: 0,
        streak: 0,
        bestStreak: 0,
        correctCount: 0,
        shields: MAX_SHIELDS,
        maxShields: MAX_SHIELDS,
        rivalProgress: 0,
        playerProgress: 0,
      });
    }, [runNonce, operation, speedPreset, onHudUpdate]);

    // Clear held inputs on pause / non-playing or blur
    useEffect(() => {
      if (gameState !== 'playing') {
        simRef.current.keyBoost = false;
        simRef.current.pointerBoost = false;
      }
    }, [gameState]);

    useEffect(() => {
      const clearInputs = () => {
        simRef.current.keyBoost = false;
        simRef.current.pointerBoost = false;
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (propsRef.current.gameState !== 'playing') return;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          if (!e.repeat) steerLane(-1);
          e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          if (!e.repeat) steerLane(1);
          e.preventDefault();
        } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          simRef.current.keyBoost = true;
          e.preventDefault();
        }
      };

      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          simRef.current.keyBoost = false;
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', clearInputs);
      document.addEventListener('visibilitychange', clearInputs);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', clearInputs);
        document.removeEventListener('visibilitychange', clearInputs);
      };
    }, []);

    // Main canvas mount, ResizeObserver, and 60fps simulation loop
    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let backdropCanvas: HTMLCanvasElement | null = null;
      let dirtyPausedFrame = true;

      const updateSize = () => {
        const rect = container.getBoundingClientRect();
        const w = Math.max(320, Math.floor(rect.width));
        const h = Math.max(320, Math.floor(rect.height));
        const dpr = w * h > 900_000 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        simRef.current.width = w;
        simRef.current.height = h;
        backdropCanvas = buildStaticBackdrop(w, h, dpr);
        dirtyPausedFrame = true;
      };

      updateSize();
      const ro = new ResizeObserver(updateSize);
      ro.observe(container);

      const spawnBurst = (
        x: number,
        y: number,
        count: number,
        colors: string[],
        speedScale = 1
      ) => {
        const sim = simRef.current;
        for (let i = 0; i < count; i++) {
          const p = sim.particles[sim.particleCursor];
          sim.particleCursor = (sim.particleCursor + 1) % MAX_PARTICLES;
          const angle = Math.random() * Math.PI * 2;
          const spd = (70 + Math.random() * 210) * speedScale;
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = Math.cos(angle) * spd;
          p.vy = Math.sin(angle) * spd - 60;
          p.size = 4 + Math.random() * 5;
          p.maxLife = 0.35 + Math.random() * 0.3;
          p.life = p.maxLife;
          p.color = colors[i % colors.length];
        }
      };

      const spawnCallout = (x: number, y: number, text: string, color: string) => {
        const sim = simRef.current;
        const c = sim.callouts[sim.calloutCursor];
        sim.calloutCursor = (sim.calloutCursor + 1) % MAX_CALLOUTS;
        c.active = true;
        c.x = x;
        c.y = y;
        c.text = text;
        c.color = color;
        c.maxLife = 0.85;
        c.life = 0.85;
      };

      let lastTime = performance.now();
      let rafId = 0;
      let timeoutId = 0;
      let disposed = false;
      let lastSpeedRounded = -1;
      let lastBoostVisual = false;

      const scheduleNext = (renderCostMs: number) => {
        if (disposed) return;
        const delay = Math.max(8, 16 - renderCostMs);
        timeoutId = window.setTimeout(() => {
          if (!disposed) rafId = window.requestAnimationFrame(tick);
        }, delay);
      };

      const tick = (now: number) => {
        const frameStart = performance.now();
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

        const {
          gameState: curState,
          operation: curOp,
          speedPreset: curPreset,
          bestScore: curBest,
          onHudUpdate: pushHud,
          onGameOver: finishGame,
        } = propsRef.current;

        const sim = simRef.current;
        const cfg = SPEED_CONFIGS[curPreset];
        const isBoosting = curState === 'playing' && (sim.keyBoost || sim.pointerBoost);

        // Visual FX timers always tick in real dt
        if (sim.playerFlashTimer > 0) {
          sim.playerFlashTimer = Math.max(0, sim.playerFlashTimer - dt);
        }
        if (sim.trauma > 0) {
          sim.trauma = Math.max(0, sim.trauma - dt * 2.4);
        }
        sim.playerSquashX += (1 - sim.playerSquashX) * Math.min(1, dt * 12);
        sim.playerSquashY += (1 - sim.playerSquashY) * Math.min(1, dt * 12);

        for (let i = 0; i < sim.particles.length; i++) {
          const p = sim.particles[i];
          if (!p.active) continue;
          p.life -= dt;
          if (p.life <= 0) {
            p.active = false;
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 260 * dt;
        }

        for (let i = 0; i < sim.callouts.length; i++) {
          const c = sim.callouts[i];
          if (!c.active) continue;
          c.life -= dt;
          if (c.life <= 0) {
            c.active = false;
            continue;
          }
          c.y -= 52 * dt;
        }

        if (curState === 'title') {
          // Smooth ambient highway cruise on title screen
          sim.roadScroll += dt * 4.2;
          sim.playerLanePos += (1 - sim.playerLanePos) * Math.min(1, dt * 5);
          sim.playerTilt = Math.sin(now * 0.0012) * 0.08;
        } else if (curState === 'playing') {
          if (sim.hitstopTimer > 0) {
            sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
          } else {
            // Speed & road scroll
            const streakBonus = Math.min(sim.streak, 5) * 4;
            const targetSpeed =
              (isBoosting ? cfg.boostKmh : cfg.baseKmh) + streakBonus;
            sim.speedKmh += (targetSpeed - sim.speedKmh) * Math.min(1, dt * 5.5);
            const scrollFactor = sim.speedKmh / 14;
            sim.roadScroll += dt * scrollFactor;

            // Smooth lane interpolation + lean tilt
            const laneDiff = sim.targetLane - sim.playerLanePos;
            sim.playerLanePos += laneDiff * Math.min(1, dt * 14);
            sim.playerTilt +=
              (Math.max(-1, Math.min(1, laneDiff * 1.4)) - sim.playerTilt) *
              Math.min(1, dt * 16);

            // End-of-run beat timer before showing Victory/Defeat modal
            if (sim.pendingFinishTimer >= 0) {
              sim.pendingFinishTimer -= dt;
              if (sim.pendingFinishTimer <= 0 && sim.pendingSummary) {
                const doneSummary = sim.pendingSummary;
                sim.pendingSummary = null;
                sim.pendingFinishTimer = -1;
                finishGame(doneSummary);
              }
            } else if (sim.question) {
              // Rival drives steadily
              sim.rivalProgress = Math.min(
                0.98,
                sim.rivalProgress + cfg.rivalRate * dt
              );

              // Approach rate scales slightly when boosting
              const boostMul = isBoosting ? 1.55 : 1.0;
              sim.waveZ -= cfg.approachRate * boostMul * dt;

              // Check collision plane
              if (sim.waveZ <= PLAYER_Z + 0.025) {
                const hitLane = Math.max(
                  0,
                  Math.min(2, Math.round(sim.playerLanePos))
                ) as 0 | 1 | 2;
                const isCorrect = hitLane === sim.question.correctLane;
                const outcome = evaluateAnswerHit({
                  isCorrect,
                  isBoosting,
                  score: sim.score,
                  streak: sim.streak,
                  bestStreak: sim.bestStreak,
                  correctCount: sim.correctCount,
                  shields: sim.shields,
                  questionIndex: sim.questionIndex,
                  totalQuestions: TOTAL_QUESTIONS,
                  playerProgress: sim.playerProgress,
                });

                sim.score = outcome.nextScore;
                sim.streak = outcome.nextStreak;
                sim.bestStreak = outcome.nextBestStreak;
                sim.correctCount = outcome.nextCorrectCount;
                sim.shields = outcome.nextShields;
                sim.playerProgress = outcome.nextPlayerProgress;

                const { horizonY, roadLen, centerX, halfBottom, halfTop } =
                  getRoadMetrics(sim.width, sim.height);
                const px =
                  centerX +
                  (hitLane - 1) *
                    (halfTop + (halfBottom - halfTop) * 0.72) *
                    0.62;
                const py = horizonY + roadLen * 0.74;

                if (outcome.correct) {
                  soundEngine.playCorrect(sim.streak);
                  sim.hitstopTimer = 0.04;
                  sim.playerSquashX = 1.18;
                  sim.playerSquashY = 0.84;
                  sim.speedKmh += 16;
                  spawnBurst(px, py - 24, 18, ['#22c55e', '#facc15', '#38bdf8']);
                  spawnCallout(
                    px,
                    py - 60,
                    outcome.nextStreak >= 3
                      ? `+${outcome.pointsDelta} STREAK!`
                      : `+${outcome.pointsDelta}`,
                    '#4ade80'
                  );
                } else {
                  soundEngine.playWrong();
                  sim.hitstopTimer = 0.055;
                  sim.trauma = 0.75;
                  sim.playerFlashTimer = 0.25;
                  sim.playerSquashX = 0.82;
                  sim.playerSquashY = 1.18;
                  sim.speedKmh = Math.max(28, sim.speedKmh * 0.65);
                  spawnBurst(px, py - 24, 22, ['#ef4444', '#f97316', '#fde047'], 1.15);
                  spawnCallout(
                    px,
                    py - 60,
                    `Ans: ${sim.question.answer}`,
                    '#fca5a5'
                  );
                }

                if (outcome.gameOver) {
                  const cleared = sim.questionIndex + 1;
                  if (outcome.won) {
                    soundEngine.playVictory();
                  } else {
                    soundEngine.playGameOver();
                  }
                  sim.pendingSummary = buildEndSummary({
                    won: outcome.won,
                    score: sim.score,
                    bestScore: curBest,
                    correctCount: sim.correctCount,
                    totalQuestions: TOTAL_QUESTIONS,
                    questionsCleared: cleared,
                    bestStreak: sim.bestStreak,
                    playerProgress: sim.playerProgress,
                    rivalProgress: sim.rivalProgress,
                    operation: curOp,
                    speedPreset: curPreset,
                  });
                  sim.pendingFinishTimer = 0.45;
                  sim.question = null;
                } else {
                  sim.questionIndex += 1;
                  sim.question = generateQuestion(curOp, sim.questionIndex);
                  sim.waveZ = 0.98;
                  sim.waveColors = pickWaveColors();
                }

                pushHud({
                  questionIndex: sim.questionIndex,
                  totalQuestions: TOTAL_QUESTIONS,
                  questionPrompt: sim.question ? sim.question.prompt : 'Finish!',
                  score: sim.score,
                  streak: sim.streak,
                  bestStreak: sim.bestStreak,
                  correctCount: sim.correctCount,
                  shields: sim.shields,
                  maxShields: MAX_SHIELDS,
                  rivalProgress: sim.rivalProgress,
                  playerProgress: sim.playerProgress,
                });
              }

              // Throttled progress sync (~6 Hz) so mini race bar glides without 60Hz setState
              sim.hudSyncAccum += dt;
              if (sim.hudSyncAccum >= 0.16 && sim.question) {
                sim.hudSyncAccum = 0;
                pushHud({
                  questionIndex: sim.questionIndex,
                  totalQuestions: TOTAL_QUESTIONS,
                  questionPrompt: sim.question.prompt,
                  score: sim.score,
                  streak: sim.streak,
                  bestStreak: sim.bestStreak,
                  correctCount: sim.correctCount,
                  shields: sim.shields,
                  maxShields: MAX_SHIELDS,
                  rivalProgress: sim.rivalProgress,
                  playerProgress: sim.playerProgress,
                });
              }
            }
          }
        }

        // Direct DOM update for 60fps speedometer without React re-render
        const roundedKmh = Math.round(sim.speedKmh);
        if (speedTextRef.current && roundedKmh !== lastSpeedRounded) {
          lastSpeedRounded = roundedKmh;
          speedTextRef.current.textContent = String(roundedKmh);
        }
        if (boostActiveRef.current && isBoosting !== lastBoostVisual) {
          lastBoostVisual = isBoosting;
          boostActiveRef.current.dataset.boosting = isBoosting ? 'true' : 'false';
        }

        if (curState === 'paused' || curState === 'gameover') {
          if (dirtyPausedFrame) {
            dirtyPausedFrame = false;
            renderHighwayFrame(ctx, {
              width: sim.width,
              height: sim.height,
              roadScroll: sim.roadScroll,
              playerLanePos: sim.playerLanePos,
              playerTilt: sim.playerTilt,
              playerSquashX: sim.playerSquashX,
              playerSquashY: sim.playerSquashY,
              playerFlashTimer: sim.playerFlashTimer,
              isBoosting: false,
              speedKmh: sim.speedKmh,
              shakeX: 0,
              shakeY: 0,
              isPlaying: curState === 'paused',
              question: sim.question,
              waveZ: sim.waveZ,
              waveColors: sim.waveColors,
              rivalProgress: sim.rivalProgress,
              playerProgress: sim.playerProgress,
              questionIndex: sim.questionIndex,
              totalQuestions: TOTAL_QUESTIONS,
              particles: sim.particles,
              callouts: sim.callouts,
              backdropCanvas,
            });
          }
          scheduleNext(20);
          return;
        }

        dirtyPausedFrame = true;

        const shakeMag = sim.trauma * sim.trauma * 16;
        const shakeX = shakeMag > 0.1 ? (Math.random() * 2 - 1) * shakeMag : 0;
        const shakeY = shakeMag > 0.1 ? (Math.random() * 2 - 1) * shakeMag : 0;

        renderHighwayFrame(ctx, {
          width: sim.width,
          height: sim.height,
          roadScroll: sim.roadScroll,
          playerLanePos: sim.playerLanePos,
          playerTilt: sim.playerTilt,
          playerSquashX: sim.playerSquashX,
          playerSquashY: sim.playerSquashY,
          playerFlashTimer: sim.playerFlashTimer,
          isBoosting,
          speedKmh: sim.speedKmh,
          shakeX,
          shakeY,
          isPlaying: curState === 'playing',
          question: sim.question,
          waveZ: sim.waveZ,
          waveColors: sim.waveColors,
          rivalProgress: sim.rivalProgress,
          playerProgress: sim.playerProgress,
          questionIndex: sim.questionIndex,
          totalQuestions: TOTAL_QUESTIONS,
          particles: sim.particles,
          callouts: sim.callouts,
          backdropCanvas,
        });

        scheduleNext(performance.now() - frameStart);
      };

      rafId = window.requestAnimationFrame(tick);
      return () => {
        disposed = true;
        window.cancelAnimationFrame(rafId);
        window.clearTimeout(timeoutId);
        ro.disconnect();
      };
    }, [speedTextRef, boostActiveRef]);

    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (propsRef.current.gameState !== 'playing') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
      // Map screen third to lane 0, 1, 2
      if (relX < 0.38) {
        setLaneDirect(0);
      } else if (relX > 0.62) {
        setLaneDirect(2);
      } else {
        setLaneDirect(1);
      }
    };

    return (
      <div
        ref={containerRef}
        className="fixed inset-0 w-full h-full overflow-hidden bg-[#161830]"
      >
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          onPointerDown={handleCanvasPointerDown}
          className="block w-full h-full cursor-pointer touch-none"
        />
      </div>
    );
  }
);
