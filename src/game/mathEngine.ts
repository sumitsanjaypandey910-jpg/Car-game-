import type { MathOperation, MathQuestion } from './types';

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function resolveOp(op: MathOperation, rng: () => number): 'add' | 'sub' | 'mul' {
  if (op !== 'mix') return op;
  const ops: Array<'add' | 'sub' | 'mul'> = ['add', 'sub', 'mul'];
  return ops[Math.floor(rng() * ops.length)];
}

export function generateQuestion(
  operation: MathOperation,
  questionIndex: number,
  rng: () => number = Math.random
): MathQuestion {
  const actualOp = resolveOp(operation, rng);
  const tier = Math.min(2, Math.floor(questionIndex / 4));

  let a = 0;
  let b = 0;
  let answer = 0;
  let symbol = '+';

  if (actualOp === 'add') {
    const maxVal = tier === 0 ? 7 : tier === 1 ? 12 : 18;
    a = randInt(1, maxVal, rng);
    b = randInt(1, maxVal, rng);
    answer = a + b;
    symbol = '+';
  } else if (actualOp === 'sub') {
    const maxVal = tier === 0 ? 10 : tier === 1 ? 16 : 24;
    const low = randInt(1, Math.max(2, Math.floor(maxVal * 0.7)), rng);
    const diff = randInt(1, Math.max(2, maxVal - low), rng);
    a = low + diff;
    b = low;
    answer = diff;
    symbol = '−';
  } else {
    const maxFactor = tier === 0 ? 5 : tier === 1 ? 8 : 11;
    a = randInt(2, maxFactor, rng);
    b = randInt(2, maxFactor, rng);
    answer = a * b;
    symbol = '×';
  }

  const distractors = buildDistractors(answer, actualOp, rng);
  const correctLane = Math.floor(rng() * 3) as 0 | 1 | 2;
  const choices: [number, number, number] = [0, 0, 0];
  let dIdx = 0;

  for (let lane = 0; lane < 3; lane++) {
    if (lane === correctLane) {
      choices[lane] = answer;
    } else {
      choices[lane] = distractors[dIdx++];
    }
  }

  return {
    prompt: `${a} ${symbol} ${b} = ?`,
    answer,
    choices,
    correctLane,
  };
}

function buildDistractors(
  answer: number,
  op: 'add' | 'sub' | 'mul',
  rng: () => number
): [number, number] {
  const offsets =
    op === 'mul'
      ? [-4, -3, -2, -1, 1, 2, 3, 4, 5, -5, 6]
      : [-3, -2, -1, 1, 2, 3, 4, -4];

  const candidates = new Set<number>();
  let guard = 0;
  while (candidates.size < 2 && guard < 40) {
    guard++;
    const delta = offsets[Math.floor(rng() * offsets.length)];
    const candidate = answer + delta;
    if (candidate >= 0 && candidate !== answer) {
      candidates.add(candidate);
    }
  }

  let fallback = 1;
  while (candidates.size < 2) {
    const val = answer + fallback;
    if (val !== answer) candidates.add(val);
    fallback++;
  }

  const arr = Array.from(candidates);
  return [arr[0], arr[1]];
}
