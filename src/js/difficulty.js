export const CARD_DIFFICULTIES = { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' };
export const DEFAULT_CARD_DIFFICULTY = 'medium';

export function validCardDifficulty(value) {
  return Object.hasOwn(CARD_DIFFICULTIES, value);
}

export function cardDifficultyLabel(value) {
  const difficulty = validCardDifficulty(value) ? value : DEFAULT_CARD_DIFFICULTY;
  return `Сложность: ${CARD_DIFFICULTIES[difficulty].toLowerCase()}`;
}

export function deckDifficulty(cards = []) {
  if (!cards.length) return DEFAULT_CARD_DIFFICULTY;
  const levels = ['easy', 'medium', 'hard'];
  const total = cards.reduce((sum, card) => sum + levels.indexOf(
    validCardDifficulty(card.difficulty) ? card.difficulty : DEFAULT_CARD_DIFFICULTY,
  ), 0);
  return levels[Math.round(total / cards.length)];
}
