import { describe, expect, it } from 'vitest';
import { getStarterCards, listStarterDecks, STARTER_DECKS } from '../src/data/starter-decks.js';
import { validateDeck } from '../src/js/validators.js';

describe('starter decks', () => {
  it('contain unique, valid decks and cards', () => {
    expect(new Set(STARTER_DECKS.map((deck) => deck.id)).size).toBe(STARTER_DECKS.length);
    STARTER_DECKS.forEach((deck) => {
      // Built-in decks can exceed the editor's 200-card limit. Validate all cards in batches.
      expect(deck.cards.length, deck.id).toBeGreaterThan(0);
      for (let offset = 0; offset < deck.cards.length; offset += 200) {
        const input = { ...deck, cards: deck.cards.slice(offset, offset + 200).map(([front, back]) => ({ front, back })) };
        expect(validateDeck(input), deck.id).toEqual({ valid: true, errors: {} });
      }
    });
    const records = listStarterDecks();
    const cardIds = records.flatMap((deck) => getStarterCards(deck.id).map((card) => card.id));
    expect(records.every((deck) => deck.visibility === 'public'
      && deck.cardCount === getStarterCards(deck.id).length)).toBe(true);
    expect(new Set(cardIds).size).toBe(cardIds.length);
  });

  it('includes all unique synonym headwords and merges answers without duplicates', () => {
    const cards = getStarterCards('starter-english-synonyms');
    expect(cards).toHaveLength(878);
    const normalize = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim();
    expect(new Set(cards.map((card) => normalize(card.front))).size).toBe(cards.length);
    for (const card of cards) {
      const answers = card.back.split(',').map(normalize);
      expect(new Set(answers).size, card.front).toBe(answers.length);
      expect(answers, card.front).not.toContain(normalize(card.front));
    }
    const answer = (front) => cards.find((card) => card.front === front)?.back;
    expect(answer('appear')).toBe('seem, sound, emerge');
    expect(answer('construction')).toBe('building, erect');
    expect(answer('potential')).toBe('ability, possibility');
    expect(answer('will')).toBe('necessarily, must, probably, likely, certainly, future, yet to');
    expect(cards.at(-1).front).toBe('yet to');
  });
});
