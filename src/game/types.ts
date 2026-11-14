export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type MathOperation = 'add' | 'sub' | 'mul' | 'mix';

export type SpeedPreset = 'cruise' | 'turbo' | 'nitro';

export interface MathQuestion {
  prompt: string;
  answer: number;
  choices: [number, number, number];
  correctLane: 0 | 1 | 2;
}

export interface HudSnapshot {
  questionIndex: number;
  totalQuestions: number;
  questionPrompt: string;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  shields: number;
  maxShields: number;
  rivalProgress: number;
  playerProgress: number;
}

export interface EndSummary {
  won: boolean;
  placement: 1 | 2;
  stars: 0 | 1 | 2 | 3;
  score: number;
  bestScore: number;
  correctCount: number;
  totalQuestions: number;
  questionsCleared: number;
  bestStreak: number;
  accuracyPercent: number;
  operation: MathOperation;
  speedPreset: SpeedPreset;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingCallout {
  active: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}
