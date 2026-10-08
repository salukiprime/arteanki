import { validCardDifficulty } from './difficulty.js';

export const CATEGORIES = ['языки', 'точные науки', 'естественные науки', 'IT', 'гуманитарные науки', 'другое'];

export function validateDeck(input) {
  const errors = {};
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  if (title.length < 3 || title.length > 80) errors.title = 'Название: от 3 до 80 символов.';
  if (description.length > 1000) errors.description = 'Описание: не более 1000 символов.';
  if (!CATEGORIES.includes(input.category)) errors.category = 'Выберите категорию.';
  const tags = Array.isArray(input.tags) ? input.tags : [];
  if (tags.length > 5 || tags.some((tag) => String(tag).trim().length > 24)) errors.tags = 'До 5 тегов, каждый не длиннее 24 символов.';
  const cards = Array.isArray(input.cards) ? input.cards : [];
  if (cards.length < 1 || cards.length > 200) errors.cards = 'В колоде должна быть от 1 до 200 карточек.';
  if (cards.some((card) => !String(card.front || '').trim() || !String(card.back || '').trim() || String(card.front).length > 500 || String(card.back).length > 500)) {
    errors.cards = 'У каждой карточки обязательны обе стороны до 500 символов.';
  }
  if (cards.some((card) => card.difficulty !== undefined && !validCardDifficulty(card.difficulty))) errors.difficulty = 'Выберите допустимую сложность карточки.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCard(card) {
  return Boolean(String(card?.front || '').trim() && String(card?.back || '').trim() && String(card.front).length <= 500 && String(card.back).length <= 500 && (card.difficulty === undefined || validCardDifficulty(card.difficulty)));
}
