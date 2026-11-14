import { ChevronLeft, ChevronRight, Flame, Home, Pause, Volume2, VolumeX, Zap } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface PlayingHudProps {
  hud: HudSnapshot;
  muted: boolean;
  speedTextRef: React.RefObject<HTMLSpanElement | null>;
  boostActiveRef: React.RefObject<HTMLButtonElement | null>;
  onGoTitle: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onSteerLeft: () => void;
  onSteerRight: () => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
}

export function PlayingHud({
  hud,
  muted,
  speedTextRef,
  boostActiveRef,
  onGoTitle,
  onToggleMute,
  onPause,
  onSteerLeft,
  onSteerRight,
  onBoostStart,
  onBoostEnd,
}: PlayingHudProps) {
  const playerPct = Math.round(hud.playerProgress * 100);
  const rivalPct = Math.round(hud.rivalProgress * 100);

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 pointer-events-none">
      {/* Top Cluster: Navigation + Question Gantry + Utility Controls */}
      <div className="flex flex-col gap-2.5 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Home + Score + Streak + Shields */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Back to title"
              onClick={(e) => {
                e.currentTarget.blur();
                onGoTitle();
              }}
              className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/80 border border-white/15 text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-white/15">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                  Score
                </span>
                <span className="font-num text-base sm:text-lg font-bold text-white leading-tight">
                  {hud.score}
                </span>
              </div>

              <div className="w-px h-6 bg-white/15" />

              <div className="flex items-center gap-1">
                <Flame
                  className={`w-4 h-4 ${
                    hud.streak > 0 ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="font-num text-sm sm:text-base font-bold text-amber-300">
                  {hud.streak}
                </span>
              </div>

              <div className="w-px h-6 bg-white/15" />

              {/* 3 Vitality Shield Sockets */}
              <div
                className="flex items-center gap-1"
                aria-label={`Shields ${hud.shields} of ${hud.maxShields}`}
              >
                {Array.from({ length: hud.maxShields }).map((_, idx) => {
                  const intact = idx < hud.shields;
                  return (
                    <svg
                      key={idx}
                      viewBox="0 0 24 24"
                      className="w-5 h-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 2L4 5.5v6.2c0 5 3.4 9.6 8 10.8 4.6-1.2 8-5.8 8-10.8V5.5L12 2z"
                        fill={intact ? '#10b981' : '#1e293b'}
                        stroke={intact ? '#ecfdf5' : '#475569'}
                        strokeWidth="2"
                      />
                      {!intact && (
                        <path
                          d="M9 8l6 8M15 8l-6 8"
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Mute + Pause */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/80 border border-white/15 text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {muted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause race"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/80 border border-white/15 text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Question Gantry + Race Progress Track */}
        <div className="w-full max-w-md mx-auto rounded-2xl bg-slate-950/85 border border-white/20 px-4 py-2.5 shadow-xl text-center">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
            <span>Question {Math.min(hud.questionIndex + 1, hud.totalQuestions)} of {hud.totalQuestions}</span>
            <span className="font-num text-emerald-300">
              {hud.correctCount} right
            </span>
          </div>

          <div
            data-testid="question-prompt"
            className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-300 leading-none py-1"
          >
            {hud.questionPrompt}
          </div>

          {/* Mini Player vs Rival Track */}
          <div className="mt-2 relative h-2.5 rounded-full bg-slate-800 border border-white/10 overflow-visible">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/80 transition-[width] duration-150"
              style={{ width: `${playerPct}%` }}
            />
            {/* Rival marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-400 border border-white shadow"
              style={{ left: `${rivalPct}%` }}
              title="Rival"
            />
            {/* Player marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow"
              style={{ left: `${playerPct}%` }}
              title="You"
            />
          </div>
        </div>
      </div>

      {/* Bottom Corner Cluster: Speedometer (Left) + Steer/Boost Controls (Right) */}
      <div className="flex items-end justify-between w-full max-w-5xl mx-auto">
        {/* Speedometer */}
        <div className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-white/15 flex items-baseline gap-1.5">
          <span
            ref={speedTextRef}
            className="font-num text-2xl sm:text-3xl font-bold text-white leading-none"
          >
            62
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            km/h
          </span>
        </div>

        {/* Steer Left / Right + Hold to Boost */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Steer left"
            onClick={(e) => {
              e.currentTarget.blur();
              onSteerLeft();
            }}
            className="flex sm:hidden items-center justify-center w-12 h-12 rounded-2xl bg-slate-950/85 border border-white/20 text-white active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            ref={boostActiveRef}
            type="button"
            tabIndex={-1}
            data-boosting="false"
            onPointerDown={(e) => {
              e.currentTarget.blur();
              onBoostStart();
            }}
            onPointerUp={onBoostEnd}
            onPointerLeave={onBoostEnd}
            onPointerCancel={onBoostEnd}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-950/85 data-[boosting=true]:bg-amber-400 data-[boosting=true]:text-slate-950 border border-white/20 text-white font-display text-sm font-bold tracking-wide shadow-lg active:scale-95 transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span className="whitespace-nowrap">Hold = Faster</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Steer right"
            onClick={(e) => {
              e.currentTarget.blur();
              onSteerRight();
            }}
            className="flex sm:hidden items-center justify-center w-12 h-12 rounded-2xl bg-slate-950/85 border border-white/20 text-white active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
