import { describe, expect, it, vi } from 'vitest';
import { getStarterCards } from '../src/data/starter-decks.js';
import { buildStudyQueue } from '../src/js/leitner.js';

vi.mock('../src/js/firebase.js', () => ({ db: {}, friendlyError: (error) => error.message }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), onSnapshot: vi.fn(), serverTimestamp: vi.fn(),
  setDoc: vi.fn(), updateDoc: vi.fn(), writeBatch: vi.fn(),
  where: vi.fn(), limit: (count) => ({ count }),
  query: (...constraints) => constraints,
  getDocs: async (constraints) => {
    const count = constraints.find((constraint) => constraint?.count)?.count;
    const cards = getStarterCards('starter-english-synonyms');
    const docs = cards.map((card, index) => ({
      id: `progress-${index}`,
      data: () => ({ cardId: card.id, box: 2, dueAt: new Date('2100-01-01') }),
    }));
    return { docs: count ? docs.slice(0, count) : docs };
  },
}));

import { getProgress } from '../src/js/services/study.js';

describe('large starter deck progress', () => {
  it('keeps progress beyond 200 cards so learned cards are not queued again', async () => {
    const cards = getStarterCards('starter-english-synonyms');
    const progress = await getProgress('user', 'starter-english-synonyms');
    expect(progress.size).toBe(cards.length);
    expect(progress.has(cards.at(-1).id)).toBe(true);
    expect(buildStudyQueue(cards, progress)).toEqual([]);
    progress.delete(cards.at(-1).id);
    expect(buildStudyQueue(cards, progress)).toEqual([cards.at(-1).id]);
  });
});
