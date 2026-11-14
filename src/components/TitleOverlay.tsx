import { Volume2, VolumeX, Play } from 'lucide-react';
import { OPERATION_META, SPEED_CONFIGS } from '../game/raceRules';
import type { MathOperation, SpeedPreset } from '../game/types';

interface TitleOverlayProps {
  operation: MathOperation;
  speedPreset: SpeedPreset;
  bestScore: number;
  muted: boolean;
  onSelectOperation: (op: MathOperation) => void;
  onSelectSpeed: (speed: SpeedPreset) => void;
  onToggleMute: () => void;
  onStart: () => void;
}

const OPERATIONS: MathOperation[] = ['add', 'sub', 'mul', 'mix'];
const SPEEDS: SpeedPreset[] = ['cruise', 'turbo', 'nitro'];

export function TitleOverlay({
  operation,
  speedPreset,
  bestScore,
  muted,
  onSelectOperation,
  onSelectSpeed,
  onToggleMute,
  onStart,
}: TitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
      {/* Top Bar: Best Score + Mute */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/75 border border-white/15 shadow-lg">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Best Score
          </span>
          <span className="font-num text-base font-bold text-amber-400">
            {bestScore}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="pointer-events-auto flex items-center justify-center w-11 h-11 rounded-xl bg-slate-950/75 border border-white/15 text-white hover:bg-slate-900 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Center Card over Live Highway */}
      <div className="w-full max-w-lg mx-auto mt-2 mb-auto pointer-events-auto">
        <div className="rounded-3xl bg-slate-950/88 border border-white/15 p-5 sm:p-6 shadow-2xl">
          {/* Custom SVG Racing Crest & Title Emblem */}
          <div className="flex flex-col items-center text-center mb-6">
            <svg
              viewBox="0 0 120 56"
              className="w-24 h-12 mb-2"
              aria-hidden="true"
            >
              <path
                d="M16 40 L26 20 L94 20 L104 40 Z"
                fill="#dc2626"
                stroke="#f8fafc"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <rect x="53" y="20" width="14" height="20" fill="#f8fafc" />
              <path
                d="M35 20 L42 9 L78 9 L85 20 Z"
                fill="#0f172a"
                stroke="#f8fafc"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <rect x="12" y="15" width="96" height="5" rx="2" fill="#facc15" />
              <circle cx="30" cy="43" r="8" fill="#0f172a" stroke="#94a3b8" strokeWidth="2.5" />
              <circle cx="90" cy="43" r="8" fill="#0f172a" stroke="#94a3b8" strokeWidth="2.5" />
            </svg>

            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Turbo <span className="text-amber-400">Maths Racer</span>
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Steer into the car with the right answer across 10 checkpoints.
            </p>
          </div>

          {/* Operation Picker */}
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Math Mode
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OPERATIONS.map((op) => {
                const meta = OPERATION_META[op];
                const active = op === operation;
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => onSelectOperation(op)}
                    className={`flex flex-col items-center justify-center px-3 py-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-bold shadow-md'
                        : 'bg-slate-900/90 text-slate-200 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-num text-lg leading-none mb-1">
                      {meta.badge}
                    </span>
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speed Picker */}
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Race Speed
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SPEEDS.map((sp) => {
                const cfg = SPEED_CONFIGS[sp];
                const active = sp === speedPreset;
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => onSelectSpeed(sp)}
                    className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-950 border-amber-200 font-bold shadow-md'
                        : 'bg-slate-900/90 text-slate-200 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm font-bold whitespace-nowrap">
                      {cfg.label}
                    </span>
                    <span
                      className={`text-[11px] font-num whitespace-nowrap ${
                        active ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {cfg.baseKmh} km/h
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Play CTA */}
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-display text-xl font-extrabold shadow-lg transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Race</span>
          </button>
        </div>
      </div>

      {/* Bottom Single-Line Control Hint */}
      <div className="mx-auto px-4 py-1.5 rounded-xl bg-slate-950/75 border border-white/10 text-center text-xs sm:text-sm font-medium text-slate-200 shadow-lg">
        ← → or A / D to steer · Tap lane on road · Hold Space to boost · P to pause
      </div>
    </div>
  );
}
