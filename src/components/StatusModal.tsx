import { RotateCcw, Play, Home, Trophy, AlertTriangle } from 'lucide-react';
import type { EndSummary } from '../game/types';

interface StatusModalProps {
  mode: 'paused' | 'gameover';
  summary: EndSummary | null;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export function StatusModal({
  mode,
  summary,
  onResume,
  onRestart,
  onTitle,
}: StatusModalProps) {
  if (mode === 'paused') {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/65">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/15 p-6 shadow-2xl text-center"
        >
          <h2
            id="pause-title"
            className="font-display text-2xl font-extrabold text-white mb-2"
          >
            Race Paused
          </h2>
          <p className="text-sm text-slate-300 mb-6">
            Catch your breath, then jump right back onto the track.
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display text-base font-extrabold cursor-pointer transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-white/10 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart Race</span>
            </button>

            <button
              type="button"
              onClick={onTitle}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-transparent hover:bg-slate-800/70 text-slate-300 font-semibold text-sm cursor-pointer transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Title Screen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-title"
        className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-6 sm:p-7 shadow-2xl text-center"
      >
        {summary.won ? (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 mb-3">
              <Trophy className="w-7 h-7" />
            </div>

            <h2
              id="end-title"
              className="font-display text-3xl font-extrabold text-white"
            >
              {summary.placement === 1 ? '1st Place Finish!' : 'Finish Line Crossed!'}
            </h2>

            {/* Stars Row */}
            <div
              className="flex items-center justify-center gap-2 my-3"
              aria-label={`${summary.stars} out of 3 stars`}
            >
              {[1, 2, 3].map((n) => (
                <svg
                  key={n}
                  viewBox="0 0 24 24"
                  className="w-8 h-8"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9L12 2.5z"
                    fill={n <= summary.stars ? '#facc15' : '#1e293b'}
                    stroke={n <= summary.stars ? '#fef08a' : '#475569'}
                    strokeWidth="1.5"
                  />
                </svg>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2
              id="end-title"
              className="font-display text-3xl font-extrabold text-white mb-2"
            >
              Out of Shields
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              You cleared {summary.questionsCleared} of {summary.totalQuestions} checkpoints.
            </p>
          </>
        )}

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5 my-5">
          <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Score
            </div>
            <div className="font-num text-xl font-bold text-white mt-0.5">
              {summary.score}
            </div>
            <div className="font-num text-[11px] text-amber-400 mt-0.5">
              Best {summary.bestScore}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Accuracy
            </div>
            <div className="font-num text-xl font-bold text-emerald-400 mt-0.5">
              {summary.accuracyPercent}%
            </div>
            <div className="font-num text-[11px] text-slate-400 mt-0.5">
              {summary.correctCount}/{summary.questionsCleared}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Streak
            </div>
            <div className="font-num text-xl font-bold text-amber-300 mt-0.5">
              {summary.bestStreak}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Best row</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display text-base font-extrabold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{summary.won ? 'Play Again' : 'Try Again'}</span>
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-white/10 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Change Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
