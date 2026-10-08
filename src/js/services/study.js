import { collection, doc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db, friendlyError } from '../firebase.js';
import { applyAnswer, buildStudyQueue } from '../leitner.js';

const activeId = (uid, deckId) => `${uid}_${deckId}`;
const progressId = (uid, cardId) => `${uid}_${cardId}`;
const normalize = (snap) => snap.exists() ? { id: snap.id, ...snap.data() } : null;

export async function getProgress(uid, deckId) { const snapshot = await getDocs(query(collection(db, 'cardProgress'), where('userId', '==', uid), where('deckId', '==', deckId))); return new Map(snapshot.docs.map((item) => [item.data().cardId, { id: item.id, ...item.data() }])); }
export async function getActiveSession(uid, deckId) { const snapshot = await getDocs(query(collection(db, 'activeSessions'), where('userId', '==', uid), where('deckId', '==', deckId), limit(1))); return snapshot.empty ? null : normalize(snapshot.docs[0]); }
export function subscribeActiveSessions(uid, callback, onError) { return onSnapshot(query(collection(db, 'activeSessions'), where('userId', '==', uid)), (snapshot) => callback(snapshot.docs.map(normalize)), onError); }

export async function startOrResumeSession({ uid, deck, cards, startCardId = '' }) {
  const existing = await getActiveSession(uid, deck.id);
  if (existing) {
    const selectedExists = cards.some((card) => card.id === startCardId);
    if (!selectedExists || existing.queueCardIds[existing.currentIndex] === startCardId) return existing;
    const queueCardIds = [...existing.queueCardIds];
    const selectedIndex = queueCardIds.indexOf(startCardId, existing.currentIndex);
    if (selectedIndex >= existing.currentIndex) queueCardIds.splice(selectedIndex, 1);
    queueCardIds.splice(existing.currentIndex, 0, startCardId);
    await updateDoc(doc(db, 'activeSessions', existing.id || activeId(uid, deck.id)), { queueCardIds, lastActivityAt: serverTimestamp() });
    return { ...existing, queueCardIds };
  }
  const progress = await getProgress(uid, deck.id); const queueCardIds = buildStudyQueue(cards, progress, { startCardId }); if (!queueCardIds.length) return { empty: true, nextDueAt: [...progress.values()].map((item) => item.dueAt).filter(Boolean).sort((a, b) => (a.toMillis ? a.toMillis() : +a) - (b.toMillis ? b.toMillis() : +b))[0] || null };
  const session = { userId: uid, deckId: deck.id, deckTitleSnapshot: deck.title, queueCardIds, currentIndex: 0, againCount: 0, hardCount: 0, knowCount: 0, requeuedCardIds: [], startedAt: serverTimestamp(), lastActivityAt: serverTimestamp() };
  await setDoc(doc(db, 'activeSessions', activeId(uid, deck.id)), session); return (await getActiveSession(uid, deck.id));
}

export async function answerCard({ uid, deckId, cardId, rating, box = 1, counts, queueCardIds = [], requeuedCardIds = [], currentIndex }) {
  try { const result = applyAnswer({ box, rating }); const progressRef = doc(db, 'cardProgress', progressId(uid, cardId)); const sessionRef = doc(db, 'activeSessions', activeId(uid, deckId)); const batch = writeBatch(db); batch.set(progressRef, { userId: uid, deckId, cardId, box: result.box, dueAt: result.dueAt, attempts: (counts.attempts || 0) + 1, againCount: (counts.againCount || 0) + (rating === 'again' ? 1 : 0), hardCount: (counts.hardCount || 0) + (rating === 'hard' ? 1 : 0), knowCount: (counts.knowCount || 0) + (rating === 'know' ? 1 : 0), updatedAt: serverTimestamp() }, { merge: true }); const nextCounts = { againCount: counts.againCount + (rating === 'again' ? 1 : 0), hardCount: counts.hardCount + (rating === 'hard' ? 1 : 0), knowCount: counts.knowCount + (rating === 'know' ? 1 : 0) }; const shouldRequeue = rating === 'again' && !requeuedCardIds.includes(cardId); const nextQueue = shouldRequeue ? [...queueCardIds, cardId] : null; const nextRequeued = shouldRequeue ? [...requeuedCardIds, cardId] : requeuedCardIds; batch.update(sessionRef, { currentIndex: currentIndex + 1, ...nextCounts, ...(nextQueue ? { queueCardIds: nextQueue } : {}), requeuedCardIds: nextRequeued, lastActivityAt: serverTimestamp() }); await batch.commit(); return { ...result, counts: nextCounts, queueCardIds: nextQueue, requeuedCardIds: nextRequeued }; } catch (error) { throw new Error(friendlyError(error)); }
}

export async function completeSession(session) { const batch = writeBatch(db); batch.set(doc(collection(db, 'studySessions')), { userId: session.userId, deckId: session.deckId, deckTitleSnapshot: session.deckTitleSnapshot, status: 'completed', adminStatus: 'normal', totalCards: session.queueCardIds.length, againCount: session.againCount, hardCount: session.hardCount, knowCount: session.knowCount, startedAt: session.startedAt || serverTimestamp(), completedAt: serverTimestamp(), durationSeconds: Math.max(0, Math.round((Date.now() - (session.startedAt?.toDate?.()?.getTime?.() || Date.now())) / 1000)) }); batch.delete(doc(db, 'activeSessions', session.id || activeId(session.userId, session.deckId))); await batch.commit(); }
export async function abandonSession(session) { const batch = writeBatch(db); batch.set(doc(collection(db, 'studySessions')), { userId: session.userId, deckId: session.deckId, deckTitleSnapshot: session.deckTitleSnapshot, status: 'abandoned', adminStatus: 'normal', totalCards: session.currentIndex, againCount: session.againCount, hardCount: session.hardCount, knowCount: session.knowCount, startedAt: session.startedAt || serverTimestamp(), completedAt: serverTimestamp(), durationSeconds: 0 }); batch.delete(doc(db, 'activeSessions', session.id || activeId(session.userId, session.deckId))); await batch.commit(); }
export async function listStudySessions(uid) { const snapshot = await getDocs(query(collection(db, 'studySessions'), where('userId', '==', uid), limit(100))); return snapshot.docs.map(normalize).sort((a, b) => (b.startedAt?.toMillis?.() || 0) - (a.startedAt?.toMillis?.() || 0)); }
export async function listAllSessions() { const snapshot = await getDocs(query(collection(db, 'studySessions'), limit(200))); return snapshot.docs.map(normalize); }
export async function updateSessionAdminStatus(id, adminStatus) { if (!['normal', 'flagged', 'archived'].includes(adminStatus)) throw new Error('Недопустимый служебный статус.'); await updateDoc(doc(db, 'studySessions', id), { adminStatus }); }
