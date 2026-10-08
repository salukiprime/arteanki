const punctuation = /[^\p{L}\p{N}\s-]+/gu;

export function normalizeText(value = '') {
  return String(value).toLocaleLowerCase('ru-RU').replace(punctuation, ' ').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildSearchTokens({ title = '', description = '', tags = [] } = {}) {
  const words = normalizeText([title, description, ...tags].join(' ')).split(' ').filter((word) => word.length >= 2);
  const tokens = new Set();
  words.forEach((word) => { for (let i = 2; i <= word.length; i += 1) tokens.add(word.slice(0, i)); });
  return [...tokens].slice(0, 200);
}

export function searchTerms(query = '') {
  return [...new Set(normalizeText(query).split(' ').filter((word) => word.length >= 2))].slice(0, 10);
}
