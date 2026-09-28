import test from 'node:test';
import assert from 'node:assert/strict';
import { clockLabel } from '../src/lib/site-evidence-labels.js';

test('time-clock photo file names read as suite labels', () => {
  assert.equal(clockLabel('infrastructure/time-clock-101.jpg'), '101');
  assert.equal(clockLabel('infrastructure/time-clock-117-5.jpg'), '117.5');
  assert.equal(clockLabel('infrastructure/time-clock-119-5-2.jpg'), '119.5 (2nd photo)');
  assert.equal(clockLabel('infrastructure/time-clock-131-133.jpg'), '131 / 133');
  assert.equal(clockLabel('infrastructure/time-clock-135a.jpg'), '135A');
});
