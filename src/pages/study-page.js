import { cardDifficultyLabel } from '../js/difficulty.js';
import { getDeck, getCards } from '../js/services/decks.js';
import { answerCard, completeSession, getProgress, startOrResumeSession, abandonSession } from '../js/services/study.js';
import { $, formatDateTime, renderError } from '../js/ui.js';

const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export async function initStudyPage(user) {
  const params = new URLSearchParams(location.search); const deckId = params.get('deckId'); const startCardId = params.get('startCardId') || ''; const status = $('#study-status');
  let cards = []; let session = null;
  if (!deckId) { renderError(status, new Error('Колода не указана.')); return; }
  try {
    const deck = await getDeck(deckId); cards = await getCards(deckId);
    if (!deck || deck.deletedAt || (deck.ownerId !== user.uid && (deck.visibility !== 'public' || deck.moderationStatus !== 'approved'))) throw new Error('Эта колода недоступна для обучения.');
    session = await startOrResumeSession({ uid: user.uid, deck, cards, startCardId });
    if (session.empty) { $('#study-empty').hidden = false; $('#next-due').textContent = session.nextDueAt ? `Следующее повторение: ${formatDateTime(session.nextDueAt)}` : 'Нет карточек для повторения.'; return; }
    session.progress = await getProgress(user.uid, deckId); $('#study-empty').hidden = true; renderCard();
    $('#reveal-card').addEventListener('click', () => { $('#answer-side').hidden = false; $('#reveal-card').hidden = true; });
    $$('.rating').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true; const card = cards.find((item) => item.id === session.queueCardIds[session.currentIndex]);
      try {
        const progress = session.progress.get(card.id);
        const result = await answerCard({ uid: user.uid, deckId, cardId: card.id, rating: button.dataset.rating, box: progress?.box || 1, counts: { attempts: progress?.attempts || 0, againCount: session.againCount, hardCount: session.hardCount, knowCount: session.knowCount }, queueCardIds: session.queueCardIds, requeuedCardIds: session.requeuedCardIds || [], currentIndex: session.currentIndex });
        session = { ...session, ...result.counts, currentIndex: session.currentIndex + 1, requeuedCardIds: result.requeuedCardIds, queueCardIds: result.queueCardIds || session.queueCardIds }; session.progress.set(card.id, { box: result.box, dueAt: result.dueAt });
        if (session.currentIndex >= session.queueCardIds.length) { await completeSession(session); $('#study-area').hidden = true; $('#study-result').hidden = false; $('#result-stats').textContent = `Не знаю: ${session.againCount} · Трудно: ${session.hardCount} · Знаю: ${session.knowCount}`; } else renderCard();
      } catch (error) { renderError(status, error); button.disabled = false; }
    }));
    $('#abandon-study').addEventListener('click', async () => { await abandonSession(session); location.href = 'dashboard.html'; });
  } catch (error) { renderError(status, error); }

  function renderCard() { const card = cards.find((item) => item.id === session.queueCardIds[session.currentIndex]); if (!card) return; $('#study-progress').textContent = `${session.currentIndex + 1} / ${session.queueCardIds.length}`; $('#study-difficulty').textContent = cardDifficultyLabel(card.difficulty); $('#front-side').textContent = card.front; $('#back-side').textContent = card.back; $('#answer-side').hidden = true; $('#reveal-card').hidden = false; $$('.rating').forEach((button) => { button.disabled = false; }); }
}
