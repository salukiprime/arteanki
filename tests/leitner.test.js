import { describe, expect, it } from 'vitest';
import { applyAnswer, buildStudyQueue, INTERVALS_DAYS } from '../src/js/leitner.js';

describe('Leitner', () => {
  it('starts a new card at box one', () => expect(applyAnswer({ box: 1, rating: 'again' }).box).toBe(1));
  it('keeps level on hard and uses current interval', () => { const result = applyAnswer({ box: 3, rating: 'hard' }); expect(result.box).toBe(3); expect(result.dueAt.getTime() - Date.now()).toBeGreaterThan(INTERVALS_DAYS[3] * 86400000 - 2000); });
  it('promotes know but never beyond level five', () => { expect(applyAnswer({ box: 4, rating: 'know' }).box).toBe(5); expect(applyAnswer({ box: 5, rating: 'know' }).box).toBe(5); });
});

describe('study queue', () => {
  const cards = [{ id: 'first' }, { id: 'second' }, { id: 'third' }];

  it('puts the selected card first', () => {
    expect(buildStudyQueue(cards, new Map(), { startCardId: 'second', random: () => 0 })).toEqual(['second', 'third', 'first']);
  });

  it('allows explicitly selected cards that are not due yet', () => {
    const progress = new Map(cards.map((card) => [card.id, { dueAt: new Date('2999-01-01') }]));
    expect(buildStudyQueue(cards, progress, { startCardId: 'third' })).toEqual(['third']);
  });

  it('does not duplicate the selected card', () => {
    const queue = buildStudyQueue(cards, new Map(), { startCardId: 'first', random: () => 0.5 });
    expect(queue.filter((id) => id === 'first')).toHaveLength(1);
  });
});
