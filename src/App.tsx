import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas, type GameCanvasHandle } from './components/GameCanvas';
import { PlayingHud } from './components/PlayingHud';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { MAX_SHIELDS, TOTAL_QUESTIONS } from './game/raceRules';
import { soundEngine } from './game/sound';
import type {
  EndSummary,
  GameState,
  HudSnapshot,
  MathOperation,
  SpeedPreset,
} from './game/types';

const BEST_SCORE_STORAGE_KEY = 'turbo_maths_racer_best_v1';

function readBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(score));
  } catch {
    // Ignore storage restriction
  }
}

function shouldAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1';
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() =>
    shouldAutostart() ? 'playing' : 'title'
  );
  const [operation, setOperation] = useState<MathOperation>('add');
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>('turbo');
  const [runNonce, setRunNonce] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => readBestScore());
  const [muted, setMuted] = useState(false);
  const [endSummary, setEndSummary] = useState<EndSummary | null>(null);
  const [hud, setHud] = useState<HudSnapshot>({
    questionIndex: 0,
    totalQuestions: TOTAL_QUESTIONS,
    questionPrompt: '1 + 1 = ?',
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    shields: MAX_SHIELDS,
    maxShields: MAX_SHIELDS,
    rivalProgress: 0,
    playerProgress: 0,
  });

  const canvasHandleRef = useRef<GameCanvasHandle | null>(null);
  const speedTextRef = useRef<HTMLSpanElement | null>(null);
  const boostActiveRef = useRef<HTMLButtonElement | null>(null);

  // Sync document.body.dataset.state immediately
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const startRace = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEndSummary(null);
    setRunNonce((n) => n + 1);
    document.body.dataset.state = 'playing';
    setGameState('playing');
  }, []);

  const goTitle = useCallback(() => {
    setEndSummary(null);
    document.body.dataset.state = 'title';
    setGameState('title');
  }, []);

  const togglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'playing') return 'paused';
      if (prev === 'paused') return 'playing';
      return prev;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleGameOver = useCallback((summary: EndSummary) => {
    setEndSummary(summary);
    setBestScore((prev) => {
      const nextBest = Math.max(prev, summary.bestScore);
      saveBestScore(nextBest);
      return nextBest;
    });
    document.body.dataset.state = 'gameover';
    setGameState('gameover');
  }, []);

  // Global keyboard shortcuts (Enter/Space on Title, P/Esc for Pause, M for Mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        if (!e.repeat) toggleMute();
        return;
      }

      if (gameState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startRace();
        }
      } else if (gameState === 'playing' || gameState === 'paused') {
        if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && !e.repeat) {
          e.preventDefault();
          togglePause();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, startRace, togglePause, toggleMute]);

  return (
    <main className="relative w-full h-full overflow-hidden">
      <GameCanvas
        ref={canvasHandleRef}
        gameState={gameState}
        operation={operation}
        speedPreset={speedPreset}
        runNonce={runNonce}
        bestScore={bestScore}
        speedTextRef={speedTextRef}
        boostActiveRef={boostActiveRef}
        onHudUpdate={setHud}
        onGameOver={handleGameOver}
      />

      {gameState === 'title' && (
        <TitleOverlay
          operation={operation}
          speedPreset={speedPreset}
          bestScore={bestScore}
          muted={muted}
          onSelectOperation={setOperation}
          onSelectSpeed={setSpeedPreset}
          onToggleMute={toggleMute}
          onStart={startRace}
        />
      )}

      {(gameState === 'playing' || gameState === 'paused') && (
        <PlayingHud
          hud={hud}
          muted={muted}
          speedTextRef={speedTextRef}
          boostActiveRef={boostActiveRef}
          onGoTitle={goTitle}
          onToggleMute={toggleMute}
          onPause={togglePause}
          onSteerLeft={() => canvasHandleRef.current?.steerBy(-1)}
          onSteerRight={() => canvasHandleRef.current?.steerBy(1)}
          onBoostStart={() => canvasHandleRef.current?.setPointerBoost(true)}
          onBoostEnd={() => canvasHandleRef.current?.setPointerBoost(false)}
        />
      )}

      {(gameState === 'paused' || gameState === 'gameover') && (
        <StatusModal
          mode={gameState}
          summary={endSummary}
          onResume={() => setGameState('playing')}
          onRestart={startRace}
          onTitle={goTitle}
        />
      )}
    </main>
  );
}
