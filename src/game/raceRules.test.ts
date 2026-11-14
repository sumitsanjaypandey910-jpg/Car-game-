import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEndSummary,
  computeStars,
  evaluateAnswerHit,
  MAX_SHIELDS,
  TOTAL_QUESTIONS,
} from './raceRules';

test('correct hit increments score, streak, and wins on final question', () => {
  const step1 = evaluateAnswerHit({
    isCorrect: true,
    isBoosting: false,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    shields: MAX_SHIELDS,
    questionIndex: 0,
    totalQuestions: TOTAL_QUESTIONS,
    playerProgress: 0,
  });

  assert.equal(step1.correct, true);
  assert.equal(step1.nextScore, 100);
  assert.equal(step1.nextStreak, 1);
  assert.equal(step1.gameOver, false);

  const boosted = evaluateAnswerHit({
    isCorrect: true,
    isBoosting: true,
    score: step1.nextScore,
    streak: step1.nextStreak,
    bestStreak: step1.nextBestStreak,
    correctCount: step1.nextCorrectCount,
    shields: step1.nextShields,
    questionIndex: 9,
    totalQuestions: TOTAL_QUESTIONS,
    playerProgress: 0.9,
  });

  assert.equal(boosted.nextStreak, 2);
  assert.equal(boosted.pointsDelta, 150);
  assert.equal(boosted.gameOver, true);
  assert.equal(boosted.won, true);
});

test('wrong hits drain shields and trigger defeat at 0 shields', () => {
  const miss = evaluateAnswerHit({
    isCorrect: false,
    isBoosting: false,
    score: 200,
    streak: 2,
    bestStreak: 2,
    correctCount: 2,
    shields: 1,
    questionIndex: 3,
    totalQuestions: TOTAL_QUESTIONS,
    playerProgress: 0.3,
  });

  assert.equal(miss.correct, false);
  assert.equal(miss.nextStreak, 0);
  assert.equal(miss.nextShields, 0);
  assert.equal(miss.gameOver, true);
  assert.equal(miss.won, false);
});

test('star rating and end summary placement reflect performance', () => {
  assert.equal(computeStars(false, 10, 10), 0);
  assert.equal(computeStars(true, 9, 10), 3);
  assert.equal(computeStars(true, 7, 10), 2);
  assert.equal(computeStars(true, 5, 10), 1);

  const summary = buildEndSummary({
    won: true,
    score: 1200,
    bestScore: 900,
    correctCount: 9,
    totalQuestions: 10,
    questionsCleared: 10,
    bestStreak: 5,
    playerProgress: 1,
    rivalProgress: 0.88,
    operation: 'add',
    speedPreset: 'turbo',
  });

  assert.equal(summary.placement, 1);
  assert.equal(summary.stars, 3);
  assert.equal(summary.bestScore, 1200);
  assert.equal(summary.accuracyPercent, 90);
});
