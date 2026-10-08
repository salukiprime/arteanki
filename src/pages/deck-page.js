import { cardDifficultyLabel, deckDifficulty } from '../js/difficulty.js';
import { getDeck, getCards, isDeckSaved, removeSavedDeck, saveDeck, similarDecks } from '../js/services/decks.js';
import { createComment, deleteComment, subscribeComments, updateOwnComment } from '../js/services/comments.js';
import { getProfile } from '../js/services/auth.js';
import { $, escapeHtml, formatDate, emptyState, renderError, setBusy } from '../js/ui.js';

export async function initDeckPage(user) {
  const id = new URLSearchParams(location.search).get('id');
  const root = $('#deck-page');
  if (!id) { root.innerHTML = emptyState('Колода не указана.'); return; }
  const status = $('#deck-status');
  try {
    const deck = await getDeck(id);
    if (!deck) throw new Error('Колода не найдена.');
    const publicDeck = deck.visibility === 'public' && deck.moderationStatus === 'approved' && !deck.deletedAt;
    const profile = user ? await getProfile(user.uid) : null;
    if (!publicDeck && deck.ownerId !== user?.uid && profile?.role !== 'admin') throw new Error('Эта колода пока недоступна.');
    const cards = await getCards(id);
    $('#deck-title').textContent = deck.title;
    $('#deck-description').textContent = deck.description || 'Без описания';
    $('#deck-meta').innerHTML = `<span>${escapeHtml(deck.category)}</span><span>${cards.length} карточек</span><span class="pill card-difficulty">${cardDifficultyLabel(deckDifficulty(cards))}</span><span>Обновлено ${formatDate(deck.updatedAt)}</span><span>Автор: ${escapeHtml(deck.ownerNameSnapshot)}</span>`;
    $('#deck-tags').innerHTML = (deck.tags || []).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('');
    $('#moderation-note').hidden = !(deck.ownerId === user?.uid && deck.moderationStatus !== 'approved');
    if (!$('#moderation-note').hidden) $('#moderation-note').textContent = `Статус: ${deck.moderationStatus === 'pending' ? 'на модерации' : deck.moderationStatus === 'rejected' ? `отклонена. ${deck.moderationNote || ''}` : 'черновик'}`;
    $('#cards-list').innerHTML = cards.map((card, index) => `<details class="card-row"><summary>Карточка ${index + 1}<span class="card-row-meta"><span class="pill card-difficulty">${cardDifficultyLabel(card.difficulty)}</span><span aria-hidden="true">⌄</span></span></summary><div><strong>Лицевая сторона</strong><p>${escapeHtml(card.front)}</p><strong>Обратная сторона</strong><p>${escapeHtml(card.back)}</p><a class="button small outline card-study-link" href="study.html?deckId=${encodeURIComponent(id)}&startCardId=${encodeURIComponent(card.id)}">Начать с этой карточки</a></div></details>`).join('');
    $('#study-link').href = `study.html?deckId=${encodeURIComponent(id)}`;
    const saveButton = $('#save-deck'); const loginAction = $('.deck-hero .hero-actions a[href="login.html"]');
    if (!user) saveButton.hidden = true;
    else {
      loginAction.hidden = true;
      saveButton.textContent = await isDeckSaved(user.uid, id) ? 'Удалить из библиотеки' : 'Сохранить в библиотеку';
      saveButton.addEventListener('click', async () => { setBusy(saveButton, true); try { if (saveButton.textContent.includes('Удалить')) { await removeSavedDeck(user.uid, id); saveButton.textContent = 'Сохранить в библиотеку'; } else { await saveDeck(user.uid, deck); saveButton.textContent = 'Удалить из библиотеки'; } } catch (error) { renderError(status, error); } finally { setBusy(saveButton, false); } });
    }
    initComments(user, deck); loadSimilar(deck);
  } catch (error) { renderError(status, error); }
}

function initComments(user, deck) {
  const list = $('#comments-list'); const form = $('#comment-form');
  subscribeComments(deck.id, (comments) => {
    list.innerHTML = comments.length ? comments.map((comment) => `<article class="comment" data-comment="${comment.id}"><div class="comment-head"><strong>${escapeHtml(comment.authorNameSnapshot)}</strong><time>${formatDate(comment.createdAt)}</time></div><p class="comment-body">${escapeHtml(comment.body)}</p>${user && comment.authorId === user.uid ? '<div class="comment-actions"><button class="text-button edit-comment">Изменить</button><button class="text-button danger delete-comment">Удалить</button></div>' : ''}</article>`).join('') : emptyState('Комментариев пока нет.');
    list.querySelectorAll('.delete-comment').forEach((button) => button.addEventListener('click', async () => deleteComment(button.closest('[data-comment]').dataset.comment)));
    list.querySelectorAll('.edit-comment').forEach((button) => button.addEventListener('click', async () => { const article = button.closest('[data-comment]'); const body = window.prompt('Новый текст комментария', article.querySelector('.comment-body').textContent); if (body?.trim()) await updateOwnComment(article.dataset.comment, body); }));
  }, (error) => renderError($('#comments-status'), error));
  if (!user) { form.hidden = true; const commentsStatus = $('#comments-status'); commentsStatus.textContent = 'Войдите, чтобы оставить комментарий.'; commentsStatus.className = 'message info'; commentsStatus.hidden = false; return; }
  form.addEventListener('submit', async (event) => { event.preventDefault(); const input = $('#comment-body'); if (!input.value.trim()) return; try { await createComment({ body: input.value }, user, deck); input.value = ''; } catch (error) { renderError($('#comments-status'), error); } });
}

async function loadSimilar(deck) { const target = $('#similar-list'); try { const result = await similarDecks(deck); target.innerHTML = result.items.length ? result.items.map((item) => `<a class="similar-card" href="deck.html?id=${item.id}"><span class="pill">${escapeHtml(item.category)}</span><strong>${escapeHtml(item.title)}</strong><small>${item.cardCount || 0} карточек</small></a>`).join('') : emptyState('Похожих колод нет.'); } catch (error) { renderError($('#similar-status'), error); } }
