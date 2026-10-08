import { describe, expect, it } from 'vitest';
import { validateCard, validateDeck } from '../src/js/validators.js';
import { cardDifficultyLabel } from '../src/js/difficulty.js';

const valid = { title: 'Математика', description: '', category: 'точные науки', tags: [], cards: [{ front: '1+1', back: '2' }] };
describe('deck validation', () => {
  it('accepts a valid deck', () => expect(validateDeck(valid).valid).toBe(true));
  it('rejects invalid boundaries', () => { expect(validateDeck({ ...valid, title: 'x' }).valid).toBe(false); expect(validateDeck({ ...valid, cards: [] }).valid).toBe(false); });
  it.each(['easy', 'medium', 'hard'])('accepts difficulty %s', (difficulty) => {
    const card = { ...valid.cards[0], difficulty };
    expect(validateCard(card)).toBe(true);
    expect(validateDeck({ ...valid, cards: [card] }).valid).toBe(true);
  });
  it.each(['unknown', '', null, 'constructor'])('rejects unsupported difficulty %s', (difficulty) => {
    const card = { ...valid.cards[0], difficulty };
    expect(validateCard(card)).toBe(false);
    expect(validateDeck({ ...valid, cards: [card] }).valid).toBe(false);
  });
  it('supports old cards without difficulty', () => {
    expect(validateCard(valid.cards[0])).toBe(true);
    expect(cardDifficultyLabel(undefined)).toBe('Сложность: средняя');
    expect(cardDifficultyLabel('hard')).toBe('Сложность: сложная');
  });
});
