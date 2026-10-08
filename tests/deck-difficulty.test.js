import { describe, expect, it, vi } from 'vitest';
import { deckDifficulty } from '../src/js/difficulty.js';

vi.mock('../src/js/firebase.js', () => ({ friendlyError: (error) => error.message }));
import { deckCard } from '../src/js/ui.js';

describe('catalog difficulty', () => {
  it('calculates a level from card difficulties', () => {
    expect(deckDifficulty([{ difficulty: 'easy' }, { difficulty: 'easy' }, { difficulty: 'medium' }])).toBe('easy');
    expect(deckDifficulty([{ difficulty: 'easy' }, { difficulty: 'hard' }])).toBe('medium');
    expect(deckDifficulty([{ difficulty: 'hard' }, { difficulty: 'hard' }])).toBe('hard');
  });
  it('defaults old or empty decks to medium', () => {
    expect(deckDifficulty([{}, {}])).toBe('medium');
    expect(deckDifficulty([])).toBe('medium');
    expect(deckCard({ id: 'old', title: 'Старая колода' })).toContain('Сложность: средняя');
  });
  it('shows the saved level on catalog cards', () => {
    expect(deckCard({ id: 'new', title: 'Колода', difficulty: 'hard' })).toContain('Сложность: сложная');
  });
});
