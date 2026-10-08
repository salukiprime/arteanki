export const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30];

export function addDays(date, days) { return new Date(new Date(date).getTime() + days * 86400000); }

export function applyAnswer({ box = 1, rating, now = new Date() }) {
  const current = Math.min(5, Math.max(1, Number(box) || 1));
  if (!['again', 'hard', 'know'].includes(rating)) throw new Error('Неизвестная оценка карточки.');
  const nextBox = rating === 'again' ? 1 : rating === 'hard' ? current : Math.min(5, current + 1);
  return { box: nextBox, dueAt: addDays(now, INTERVALS_DAYS[nextBox]), rating };
}

export function dueAtValue(value) { return value?.toDate ? value.toDate() : new Date(value); }

export function isDue(progress, now = new Date()) { return !progress || !progress.dueAt || dueAtValue(progress.dueAt) <= now; }

export function buildStudyQueue(cards, progress, { startCardId = '', limit = 20, random = Math.random } = {}) {
  const dueCards = cards.filter((card) => isDue(progress.get(card.id)));
  const selectedCard = startCardId ? cards.find((card) => card.id === startCardId) : null;
  const rest = dueCards.filter((card) => card.id !== selectedCard?.id);

  for (let index = rest.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [rest[index], rest[target]] = [rest[target], rest[index]];
  }

  return [...(selectedCard ? [selectedCard] : []), ...rest]
    .slice(0, limit)
    .map((card) => card.id);
}
