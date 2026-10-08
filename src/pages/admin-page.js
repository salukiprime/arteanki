import { getProfile } from '../js/services/auth.js';
import { summary, listUsers, updateUserRole, listAllDecks, moderateDeck, listAllComments, deleteComment, listAllSessions, updateSessionAdminStatus } from '../js/services/admin.js';
import { $, $$, escapeHtml, emptyState, formatDateTime, renderError, showMessage } from '../js/ui.js';

const moderationLabels = {
  draft: 'Черновик',
  pending: 'На модерации',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  hidden: 'Скрыта',
};

export async function initAdminPage(user) {
  const status = $('#admin-status');
  try {
    const profile = await getProfile(user.uid);
    if (profile?.role !== 'admin') {
      $('#admin-content').hidden = true;
      $('#access-denied').hidden = false;
      return;
    }
    const results = await Promise.allSettled([loadSummary(), loadDecks(), loadComments(), loadUsers(), loadSessions()]);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) renderError(status, failed.reason);
  } catch (error) {
    renderError(status, error);
  }

  async function loadSummary() {
    const counts = await summary();
    $('#admin-summary').innerHTML = [
      ['users', 'Пользователи'], ['decks', 'Колоды'], ['pending', 'На модерации'],
      ['comments', 'Комментарии'], ['studySessions', 'Сессии'],
    ].map(([key, label]) => `<div class="stat-card"><strong>${counts[key] || 0}</strong><span>${label}</span></div>`).join('');
  }

  async function loadDecks() {
    const decks = await listAllDecks();
    $('#admin-decks').innerHTML = decks.length ? decks.map((deck) => {
      const current = deck.moderationStatus;
      const options = current === 'pending' || current === 'draft'
        ? `<option value="" selected disabled>${moderationLabels[current]}</option>` : '';
      return `<div class="admin-row"><div><strong>${escapeHtml(deck.title)}</strong><span>${escapeHtml(deck.ownerNameSnapshot)} · ${moderationLabels[current] || escapeHtml(current)} · ${deck.cardCount} карт</span></div><div class="row-actions"><a href="deck.html?id=${encodeURIComponent(deck.id)}" class="text-button">Открыть</a><select class="moderate-select" data-id="${escapeHtml(deck.id)}" aria-label="Статус колоды ${escapeHtml(deck.title)}">${options}<option value="approved" ${current === 'approved' ? 'selected' : ''}>Одобрена</option><option value="rejected" ${current === 'rejected' ? 'selected' : ''}>Отклонена</option><option value="hidden" ${current === 'hidden' ? 'selected' : ''}>Скрыта</option></select></div></div>`;
    }).join('') : emptyState('Колоды отсутствуют.');

    $$('.moderate-select').forEach((select) => select.addEventListener('change', async () => {
      if (!select.value) return;
      const previous = decks.find((deck) => deck.id === select.dataset.id)?.moderationStatus;
      select.disabled = true;
      try {
        await moderateDeck(select.dataset.id, select.value);
        await Promise.all([loadDecks(), loadSummary()]);
        showMessage(status, 'Статус колоды изменён.', 'success');
      } catch (error) {
        select.value = previous === 'pending' || previous === 'draft' ? '' : previous;
        renderError(status, error);
      } finally {
        if (select.isConnected) select.disabled = false;
      }
    }));
  }

  async function loadComments() {
    const comments = await listAllComments();
    $('#admin-comments').innerHTML = comments.length ? comments.map((item) => `<div class="admin-row"><div><strong>${escapeHtml(item.authorNameSnapshot)}</strong><span>${escapeHtml(item.body)} · ${formatDateTime(item.createdAt)}</span></div><button class="text-button danger admin-delete-comment" data-id="${escapeHtml(item.id)}">Удалить</button></div>`).join('') : emptyState('Комментарии отсутствуют.');
    $$('.admin-delete-comment').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await deleteComment(button.dataset.id);
        await Promise.all([loadComments(), loadSummary()]);
        showMessage(status, 'Комментарий удалён.', 'success');
      } catch (error) {
        button.disabled = false;
        renderError(status, error);
      }
    }));
  }

  async function loadUsers() {
    const users = await listUsers();
    $('#admin-users').innerHTML = users.map((item) => `<div class="admin-row"><div><strong>${escapeHtml(item.displayName || 'Без имени')}</strong><span>${escapeHtml(item.email || '')}</span></div><select class="role-select" data-id="${escapeHtml(item.id)}" data-current-role="${item.role}" aria-label="Роль пользователя ${escapeHtml(item.displayName || item.email || item.id)}" ${item.id === user.uid ? 'disabled' : ''}><option value="user" ${item.role === 'user' ? 'selected' : ''}>user</option><option value="admin" ${item.role === 'admin' ? 'selected' : ''}>admin</option></select></div>`).join('');
    $$('.role-select').forEach((select) => select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        await updateUserRole(select.dataset.id, select.value, user.uid);
        select.dataset.currentRole = select.value;
        showMessage(status, 'Роль изменена.', 'success');
      } catch (error) {
        select.value = select.dataset.currentRole;
        renderError(status, error);
      } finally {
        select.disabled = false;
      }
    }));
  }

  async function loadSessions() {
    const sessions = await listAllSessions();
    $('#admin-sessions').innerHTML = sessions.length ? sessions.map((item) => `<div class="admin-row"><div><strong>${escapeHtml(item.deckTitleSnapshot)}</strong><span>${escapeHtml(item.userId)} · ${item.status} · ${formatDateTime(item.completedAt)}</span></div><select class="session-status" data-id="${escapeHtml(item.id)}" data-current-status="${item.adminStatus || 'normal'}" aria-label="Служебный статус сессии"><option value="normal" ${item.adminStatus === 'normal' ? 'selected' : ''}>normal</option><option value="flagged" ${item.adminStatus === 'flagged' ? 'selected' : ''}>flagged</option><option value="archived" ${item.adminStatus === 'archived' ? 'selected' : ''}>archived</option></select></div>`).join('') : emptyState('Учебных сессий пока нет.');
    $$('.session-status').forEach((select) => select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        await updateSessionAdminStatus(select.dataset.id, select.value);
        select.dataset.currentStatus = select.value;
        showMessage(status, 'Статус сессии изменён.', 'success');
      } catch (error) {
        select.value = select.dataset.currentStatus;
        renderError(status, error);
      } finally {
        select.disabled = false;
      }
    }));
  }
}
