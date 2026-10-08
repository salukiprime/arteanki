import { getProfile, updateProfileData } from '../js/services/auth.js';
import { listOwnDecks, listSavedDecks } from '../js/services/decks.js';
import { listStudySessions, subscribeActiveSessions, abandonSession } from '../js/services/study.js';
import { listOwnComments, updateOwnComment, deleteComment } from '../js/services/comments.js';
import { $, deckCard, escapeHtml, emptyState, formatDateTime, renderError, setBusy, showMessage } from '../js/ui.js';

export async function initDashboardPage(user) {
  const status = $('#dashboard-status');
  try {
    const profile = await getProfile(user.uid);
    $('#profile-name').value = profile?.displayName || ''; $('#profile-bio').value = profile?.bio || '';
    const decks = await listOwnDecks(user.uid);
    $('#my-decks').innerHTML = decks.length ? decks.map((deck) => deckCard(deck, { action: `<div class="deck-card-actions"><a class="button small ghost" href="editor.html?id=${deck.id}">Редактировать</a><span class="status-label ${deck.moderationStatus}">${deck.moderationStatus}</span></div>` })).join('') : emptyState('Вы ещё не создали колод.');
    const saved = await listSavedDecks(user.uid);
    $('#saved-decks').innerHTML = saved.length ? saved.map((item) => `<div class="saved-row"><div><a href="deck.html?id=${item.deckId}">${escapeHtml(item.deckTitleSnapshot)}</a><small>Автор: ${escapeHtml(item.ownerNameSnapshot || '—')}</small></div><a class="button small primary" href="study.html?deckId=${item.deckId}">Учить</a></div>`).join('') : emptyState('Сохранённых колод пока нет.');
    const sessions = await listStudySessions(user.uid);
    $('#history-list').innerHTML = sessions.length ? sessions.map((item) => `<div class="history-row"><span class="status-label ${item.status}">${item.status === 'completed' ? 'завершена' : 'прервана'}</span><strong>${escapeHtml(item.deckTitleSnapshot)}</strong><span>${item.totalCards} карт · ${formatDateTime(item.completedAt)}</span></div>`).join('') : emptyState('История обучения пуста.');
    await renderOwnComments(user.uid);
    subscribeActiveSessions(user.uid, renderActive, (error) => renderError(status, error));
    $('#profile-form').addEventListener('submit', saveProfile);
  } catch (error) { renderError(status, error); }

  async function saveProfile(event) { event.preventDefault(); const button = event.submitter; setBusy(button, true); try { await updateProfileData(user.uid, { displayName: $('#profile-name').value.trim(), bio: $('#profile-bio').value.trim() }); showMessage(status, 'Профиль сохранён.', 'success'); } catch (error) { renderError(status, error); } finally { setBusy(button, false); } }
  function renderActive(active) { $('#active-sessions').innerHTML = active.length ? active.map((item) => `<div class="saved-row"><div><strong>${escapeHtml(item.deckTitleSnapshot)}</strong><small>Прогресс: ${item.currentIndex} / ${item.queueCardIds?.length || 0}</small></div><div><a class="button small primary" href="study.html?deckId=${item.deckId}">Продолжить</a><button class="text-button danger abandon-dashboard" data-session="${item.id}">Завершить</button></div></div>`).join('') : emptyState('Активных сессий нет.'); $('#active-sessions').querySelectorAll('.abandon-dashboard').forEach((button) => button.addEventListener('click', async () => { const item = active.find((session) => session.id === button.dataset.session); if (item) await abandonSession(item); })); }
}

async function renderOwnComments(uid) {
  const target = $('#my-comments'); if (!target) return;
  const comments = await listOwnComments(uid);
  target.innerHTML = comments.length ? comments.map((item) => `<div class="saved-row" data-own-comment="${item.id}"><div><strong>${escapeHtml(item.deckTitleSnapshot || 'Колода')}</strong><small class="comment-body">${escapeHtml(item.body)}</small></div><div><button class="text-button edit-own-comment">Изменить</button><button class="text-button danger delete-own-comment">Удалить</button></div></div>`).join('') : emptyState('Вы ещё не оставляли комментариев.');
  target.querySelectorAll('.delete-own-comment').forEach((button) => button.addEventListener('click', async () => { const row = button.closest('[data-own-comment]'); await deleteComment(row.dataset.ownComment); row.remove(); }));
  target.querySelectorAll('.edit-own-comment').forEach((button) => button.addEventListener('click', async () => { const row = button.closest('[data-own-comment]'); const body = window.prompt('Новый текст комментария', row.querySelector('.comment-body').textContent); if (body?.trim()) { await updateOwnComment(row.dataset.ownComment, body); row.querySelector('.comment-body').textContent = body.trim(); } }));
}
