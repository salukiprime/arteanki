import { describe, expect, it } from 'vitest';
import { parseGeneratedCards, validateGenerationInput } from '../functions/generate-cards.js';

describe('card generation boundaries', () => {
  it('accepts valid source and count, rejects oversized requests', () => {
    expect(validateGenerationInput({ source: 'Текст для карточек. '.repeat(3), count: 3 }).count).toBe(3);
    expect(() => validateGenerationInput({ source: 'коротко', count: 3 })).toThrow();
    expect(() => validateGenerationInput({ source: 'Текст для карточек. '.repeat(3), count: 21 })).toThrow();
  });

  it('parses JSON cards and rejects malformed or oversized model output', () => {
    expect(parseGeneratedCards('```json\n{"cards":[{"front":"Вопрос?","back":"Ответ"}]}\n```', 2))
      .toEqual([{ front: 'Вопрос?', back: 'Ответ' }]);
    expect(() => parseGeneratedCards('{"cards":[{"front":"?","back":""}]}', 1)).toThrow();
    expect(() => parseGeneratedCards('{"cards":[{"front":"?","back":"A"},{"front":"!","back":"B"}]}', 1)).toThrow();
  });
});
