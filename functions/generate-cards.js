export const MAX_SOURCE_LENGTH = 12000;
export const MAX_GENERATED_CARDS = 20;

export function validateGenerationInput(input) {
  const source = typeof input?.source === 'string' ? input.source.trim() : '';
  const count = Number(input?.count);
  if (source.length < 40 || source.length > MAX_SOURCE_LENGTH) {
    throw new Error(`Текст должен содержать от 40 до ${MAX_SOURCE_LENGTH} символов.`);
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_GENERATED_CARDS) {
    throw new Error(`Количество карточек: от 1 до ${MAX_GENERATED_CARDS}.`);
  }
  return { source, count };
}

export function parseGeneratedCards(content, count) {
  if (typeof content !== 'string') throw new Error('Модель не вернула текст.');
  const raw = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error('Модель вернула некорректный формат карточек. Попробуйте ещё раз.');
  }
  const cards = Array.isArray(result) ? result : result?.cards;
  if (!Array.isArray(cards) || !cards.length || cards.length > count) {
    throw new Error('Модель вернула неверное количество карточек. Попробуйте ещё раз.');
  }
  if (cards.some((card) => typeof card?.front !== 'string' || typeof card?.back !== 'string' || !card.front.trim() || !card.back.trim() || card.front.length > 500 || card.back.length > 500)) {
    throw new Error('Модель вернула неполные или слишком длинные карточки. Попробуйте ещё раз.');
  }
  return cards.map(({ front, back }) => ({ front: front.trim(), back: back.trim() }));
}
