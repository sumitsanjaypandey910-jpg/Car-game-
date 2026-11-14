import type { EndSummary, MathOperation, SpeedPreset } from './types';

export const TOTAL_QUESTIONS = 10;
export const MAX_SHIELDS = 3;

export interface SpeedConfig {
  label: string;
  subtitle: string;
  baseKmh: number;
  boostKmh: number;
  approachRate: number;
  rivalRate: number;
}

export const SPEED_CONFIGS: Record<SpeedPreset, SpeedConfig> = {
  cruise: {
    label: 'Cruise',
    subtitle: 'Relaxed pace',
    baseKmh: 45,
    boostKmh: 85,
    approachRate: 0.145,
    rivalRate: 0.011,
  },
  turbo: {
    label: 'Turbo',
    subtitle: 'Arcade standard',
    baseKmh: 62,
    boostKmh: 112,
    approachRate: 0.185,
    rivalRate: 0.0145,
  },
  nitro: {
    label: 'Nitro',
    subtitle: 'High velocity',
    baseKmh: 82,
    boostKmh: 145,
    approachRate: 0.235,
    rivalRate: 0.018,
  },
};

export const OPERATION_META: Record<
  MathOperation,
  { label: string; badge: string; example: string }
> = {
  add: { label: 'Add', badge: '+', example: 'e.g. 4 + 5' },
  sub: { label: 'Subtract', badge: '−', example: 'e.g. 9 − 3' },
  mul: { label: 'Multiply', badge: '×', example: 'e.g. 4 × 6' },
  mix: { label: 'Mix', badge: '±×', example: 'All skills' },
};

export interface AnswerOutcome {
  correct: boolean;
  nextScore: number;
  pointsDelta: number;
  nextStreak: number;
  nextBestStreak: number;
  nextCorrectCount: number;
  nextShields: number;
  nextPlayerProgress: number;
  gameOver: boolean;
  won: boolean;
}

export function evaluateAnswerHit(params: {
  isCorrect: boolean;
  isBoosting: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  shields: number;
  questionIndex: number;
  totalQuestions: number;
  playerProgress: number;
}): AnswerOutcome {
  const {
    isCorrect,
    isBoosting,
    score,
    streak,
    bestStreak,
    correctCount,
    shields,
    questionIndex,
    totalQuestions,
    playerProgress,
  } = params;

  if (isCorrect) {
    const nextStreak = streak + 1;
    const nextBestStreak = Math.max(bestStreak, nextStreak);
    const boostBonus = isBoosting ? 25 : 0;
    const pointsDelta = 100 + Math.min(nextStreak - 1, 5) * 25 + boostBonus;
    const nextScore = score + pointsDelta;
    const nextCorrectCount = correctCount + 1;
    const stepAdvance = 1 / totalQuestions + (isBoosting ? 0.015 : 0);
    const nextPlayerProgress = Math.min(1, playerProgress + stepAdvance);
    const isLast = questionIndex + 1 >= totalQuestions;

    return {
      correct: true,
      nextScore,
      pointsDelta,
      nextStreak,
      nextBestStreak,
      nextCorrectCount,
      nextShields: shields,
      nextPlayerProgress: isLast ? 1 : nextPlayerProgress,
      gameOver: isLast,
      won: isLast,
    };
  }

  const nextShields = Math.max(0, shields - 1);
  const nextPlayerProgress = Math.min(
    0.96,
    playerProgress + 0.55 / totalQuestions
  );
  const shieldBroken = nextShields <= 0;
  const isLast = questionIndex + 1 >= totalQuestions;

  return {
    correct: false,
    nextScore: score,
    pointsDelta: 0,
    nextStreak: 0,
    nextBestStreak: bestStreak,
    nextCorrectCount: correctCount,
    nextShields,
    nextPlayerProgress: !shieldBroken && isLast ? 1 : nextPlayerProgress,
    gameOver: shieldBroken || isLast,
    won: !shieldBroken && isLast,
  };
}

export function computeStars(
  won: boolean,
  correctCount: number,
  totalQuestions: number
): 0 | 1 | 2 | 3 {
  if (!won || totalQuestions <= 0) return 0;
  const ratio = correctCount / totalQuestions;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}

export function buildEndSummary(params: {
  won: boolean;
  score: number;
  bestScore: number;
  correctCount: number;
  totalQuestions: number;
  questionsCleared: number;
  bestStreak: number;
  playerProgress: number;
  rivalProgress: number;
  operation: MathOperation;
  speedPreset: SpeedPreset;
}): EndSummary {
  const {
    won,
    score,
    bestScore,
    correctCount,
    totalQuestions,
    questionsCleared,
    bestStreak,
    playerProgress,
    rivalProgress,
    operation,
    speedPreset,
  } = params;

  const stars = computeStars(won, correctCount, totalQuestions);
  const placement: 1 | 2 =
    won && playerProgress >= rivalProgress ? 1 : 2;
  const accuracyPercent =
    questionsCleared > 0
      ? Math.round((correctCount / questionsCleared) * 100)
      : 0;

  return {
    won,
    placement,
    stars,
    score,
    bestScore: Math.max(bestScore, score),
    correctCount,
    totalQuestions,
    questionsCleared,
    bestStreak,
    accuracyPercent,
    operation,
    speedPreset,
  };
}
