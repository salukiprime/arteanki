import { buildDeckQuery, loadDeckPage, subscribeLatestDecks } from '../js/services/decks.js';
import { CATEGORIES } from '../js/validators.js';
import { $, $$, deckCard, emptyState, loadingState, renderError, showMessage } from '../js/ui.js';
import { normalizeText, searchTerms } from '../js/search.js';
import { listStarterDecks } from '../data/starter-decks.js';

export async function initCatalog(user) {
  const grid = $('#catalog-grid'); const status = $('#catalog-status'); const more = $('#load-more'); if (!grid) return;
  const createDeckLink = $('#create-deck-cta');
  if (createDeckLink) createDeckLink.href = user ? 'editor.html' : 'register.html?next=editor.html';
  const category = $('#category-filter'); CATEGORIES.forEach((item) => { category.insertAdjacentHTML('beforeend', `<option value="${item}">${item[0].toUpperCase() + item.slice(1)}</option>`); });
  let state = { cursor: null, items: [], loading: false, unsubscribe: null };
  let realtime = true;
  const readFilters = () => ({ search: $('#catalog-search').value.trim(), category: category.value, tag: $('#tag-filter').value.trim().toLocaleLowerCase('ru-RU'), sort: $('#sort-filter').value });
  const render = () => { const filters = readFilters(); const items = mergeDecks(state.items, filterStarterDecks(filters), filters.sort); grid.innerHTML = items.length ? items.map((item) => deckCard(item)).join('') : emptyState(state.loading ? 'Загружаем колоды…' : 'Подходящих колод пока нет.'); more.hidden = !items.length || !state.hasMore || state.loading; $('#result-count').textContent = items.length ? `${items.length} колод` : ''; };
  const load = async (reset = true) => { if (state.loading) return; state.loading = true; if (reset) { state.items = []; state.cursor = null; state.hasMore = false; } render(); showMessage(status, ''); try { const filters = readFilters(); realtime = !filters.search && !filters.category && !filters.tag && filters.sort === 'newest'; if (state.unsubscribe) { state.unsubscribe(); state.unsubscribe = null; } if (realtime && reset) { state.unsubscribe = subscribeLatestDecks((items, cursor) => { const ids = new Set(items.map((item) => item.id)); state.items = [...items, ...state.items.filter((item) => !ids.has(item.id))]; state.cursor = cursor; state.hasMore = items.length === 12; state.loading = false; render(); }, (error) => { state.loading = false; renderError(status, error); }); } else { const result = await loadDeckPage({ ...filters, cursor: state.cursor }); state.items = reset ? result.items : [...state.items, ...result.items.filter((item) => !state.items.some((old) => old.id === item.id))]; state.cursor = result.cursor; state.hasMore = result.hasMore; state.loading = false; render(); } } catch (error) { state.loading = false; render(); renderError(status, error); } };
  $('#catalog-search')?.addEventListener('input', debounce(() => { if ($('#catalog-search').value.trim()) $('#tag-filter').value = ''; load(); }, 350)); $('#tag-filter')?.addEventListener('input', debounce(() => { if ($('#tag-filter').value.trim()) $('#catalog-search').value = ''; load(); }, 350)); [category, $('#sort-filter')].forEach((control) => control?.addEventListener('change', () => load())); $('#clear-filters')?.addEventListener('click', () => { $('#catalog-search').value = ''; category.value = ''; $('#tag-filter').value = ''; $('#sort-filter').value = 'newest'; load(); }); more.addEventListener('click', () => load(false)); await load();
}
function debounce(callback, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); }; }

function filterStarterDecks(filters) {
  const terms = searchTerms(filters.search);
  const tag = normalizeText(filters.tag);
  const items = listStarterDecks().filter((deck) => {
    const haystack = normalizeText([deck.title, deck.description, ...deck.tags].join(' '));
    return (!filters.category || deck.category === filters.category)
      && (!tag || deck.tags.includes(tag))
      && (!terms.length || terms.every((term) => haystack.includes(term)));
  });
  return items.sort((a, b) => filters.sort === 'title'
    ? a.title.localeCompare(b.title, 'ru')
    : filters.sort === 'count' ? b.cardCount - a.cardCount : 0);
}

function mergeDecks(remote, starters, sort) {
  const items = [...remote, ...starters].filter((deck, index, all) => all.findIndex((item) => item.id === deck.id) === index);
  const time = (value) => value?.toMillis?.() || new Date(value || 0).getTime();
  return items.sort((a, b) => sort === 'title'
    ? a.title.localeCompare(b.title, 'ru')
    : sort === 'count' ? b.cardCount - a.cardCount : time(b.updatedAt) - time(a.updatedAt));
}
