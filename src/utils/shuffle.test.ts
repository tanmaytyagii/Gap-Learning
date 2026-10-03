import { describe, expect, it } from 'vitest';
import { seededShuffle } from './shuffle';

describe('seededShuffle', () => {
  const options = ['A', 'B', 'C', 'D'];

  it('returns a permutation and is stable for a seed', () => {
    const shuffled = seededShuffle(options, 'session-1:q1');
    expect([...shuffled].sort()).toEqual(options);
    expect(seededShuffle(options, 'session-1:q1')).toEqual(shuffled);
    expect(options).toEqual(['A', 'B', 'C', 'D']);
  });

  it('spreads the first option evenly across positions', () => {
    // The curated bank lists the correct answer first in most questions, so display order must
    // not preserve that position.
    const counts = [0, 0, 0, 0];
    for (let seed = 0; seed < 4000; seed += 1) counts[seededShuffle(options, `s${seed}`).indexOf('A')] += 1;
    counts.forEach((count) => expect(count).toBeGreaterThan(850));
    counts.forEach((count) => expect(count).toBeLessThan(1150));
  });
});
