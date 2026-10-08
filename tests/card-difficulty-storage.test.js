import { beforeEach, describe, expect, it, vi } from 'vitest';

const { batch } = vi.hoisted(() => ({ batch: { set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn() } }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(), collection: vi.fn(() => ({})), deleteDoc: vi.fn(), doc: vi.fn(() => ({ id: 'deck-id' })),
  getDoc: vi.fn(async () => ({ data: () => ({ moderationStatus: 'draft' }) })),
  getDocs: vi.fn(async () => ({ docs: [] })), limit: vi.fn(), onSnapshot: vi.fn(), orderBy: vi.fn(),
  query: vi.fn(), serverTimestamp: vi.fn(() => 'timestamp'), setDoc: vi.fn(), startAfter: vi.fn(),
  updateDoc: vi.fn(), where: vi.fn(), writeBatch: vi.fn(() => batch),
}));
vi.mock('../src/js/firebase.js', () => ({ db: {}, requireFirebase: vi.fn(), friendlyError: (error) => error.message }));

import { createDeck, updateDeck } from '../src/js/services/decks.js';

describe('card difficulty storage', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([createDeck, (input, owner) => updateDeck('deck-id', input, owner)])('persists selected and default difficulties', async (save) => {
    await save({ title: 'Колода', description: '', category: 'IT', tags: [], cards: [
      { front: 'Вопрос', back: 'Ответ', difficulty: 'hard' },
      { id: 'old-card', front: 'Старый вопрос', back: 'Ответ' },
    ] }, { uid: 'owner' });
    const cards = batch.set.mock.calls.map((call) => call[1]).filter((data) => data.front);
    expect(cards.map((card) => card.difficulty)).toEqual(['hard', 'medium']);
    expect(batch.commit).toHaveBeenCalledOnce();
    const deck = batch.update.mock.calls[0]?.[1] || batch.set.mock.calls[0][1];
    expect(deck.difficulty).toBe('hard');
  });
});
