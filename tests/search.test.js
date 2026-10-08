import { describe, expect, it } from 'vitest';
import { buildSearchTokens, normalizeText } from '../src/js/search.js';

describe('search normalization', () => {
  it('normalizes punctuation and case', () => expect(normalizeText('  React, Hooks! 2025 ')).toBe('react hooks 2025'));
  it('creates unique prefixes from all deck text and limits them', () => {
    const tokens = buildSearchTokens({ title: 'React', description: 'Компоненты', tags: ['frontend'] });
    expect(tokens).toContain('re'); expect(tokens).toContain('react'); expect(tokens).toContain('ко'); expect(new Set(tokens).size).toBe(tokens.length); expect(tokens.length).toBeLessThanOrEqual(200);
  });
});
