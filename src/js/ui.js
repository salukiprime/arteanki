import { cardDifficultyLabel } from './difficulty.js';
import { friendlyError } from './firebase.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
export const formatDate = (value) => { const date = value?.toDate ? value.toDate() : value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(date) : '—'; };
export const formatDateTime = (value) => { const date = value?.toDate ? value.toDate() : value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—'; };
export function showMessage(element, text, type = 'info') { if (!element) return; element.textContent = text; element.className = `message ${type}`; element.hidden = !text; }
export function setBusy(button, busy, busyText = 'Сохранение…') { if (!button) return; if (busy) { button.dataset.label = button.textContent; button.textContent = busyText; button.disabled = true; } else { button.textContent = button.dataset.label || button.textContent; button.disabled = false; } }
export function renderError(element, error) { showMessage(element, error?.message || friendlyError(error), 'error'); }
export function emptyState(text) { return `<div class="empty-state"><div class="empty-icon">✦</div><p>${escapeHtml(text)}</p></div>`; }
export function deckCard(deck, options = {}) { return `<article class="deck-card">${deck.imageUrl ? `<img src="${escapeHtml(deck.imageUrl)}" alt="${escapeHtml(deck.imageAlt || 'Изображение')}" class="deck-card-image">` : ''}<div class="deck-card-top"><span class="pill">${escapeHtml(deck.category || 'другое')}</span><span class="muted">${deck.cardCount || 0} карт</span></div><span class="pill card-difficulty">${cardDifficultyLabel(deck.difficulty)}</span><h3><a href="deck.html?id=${encodeURIComponent(deck.id)}">${escapeHtml(deck.title)}</a></h3><p>${escapeHtml(deck.description || 'Без описания')}</p><div class="tags">${(deck.tags || []).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('')}</div><div class="deck-card-bottom"><span>${escapeHtml(deck.ownerNameSnapshot || 'Автор')}</span><span>${formatDate(deck.updatedAt)}</span></div>${options.action || ''}</article>`; }
export function loadingState() { return '<div class="loading"><span class="spinner"></span> Загружаем…</div>'; }
