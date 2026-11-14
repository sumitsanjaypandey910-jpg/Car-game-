import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './mathEngine';
import type { MathOperation } from './types';

test('generateQuestion always produces 3 distinct non-negative choices containing the answer', () => {
  const ops: MathOperation[] = ['add', 'sub', 'mul', 'mix'];
  for (const op of ops) {
    for (let q = 0; q < 10; q++) {
      const question = generateQuestion(op, q);
      assert.equal(question.choices.length, 3);
      assert.equal(question.choices[question.correctLane], question.answer);
      const unique = new Set(question.choices);
      assert.equal(unique.size, 3, `Expected 3 unique choices for ${question.prompt}`);
      for (const c of question.choices) {
        assert.ok(Number.isInteger(c) && c >= 0, `Choice ${c} must be non-negative int`);
      }
    }
  }
});

test('subtraction questions never yield negative answers', () => {
  for (let i = 0; i < 40; i++) {
    const q = generateQuestion('sub', i % 10);
    assert.ok(q.answer >= 0, `Subtraction answer should be >= 0: ${q.prompt}`);
  }
});
