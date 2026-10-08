import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db, friendlyError, requireFirebase } from '../firebase.js';
import { buildSearchTokens, searchTerms, normalizeText } from '../search.js';
import { getStarterCards, getStarterDeck, listStarterDecks } from '../../data/starter-decks.js';

import { DEFAULT_CARD_DIFFICULTY, deckDifficulty } from '../difficulty.js';

const PAGE_SIZE = 12;
const deckRef = (id) => doc(db, 'decks', id);
const data = (snap) => ({ id: snap.id, ...snap.data() });

export function buildDeckQuery({ category = '', tag = '', search = '', sort = 'newest', cursor = null, pageSize = PAGE_SIZE } = {}) {
  requireFirebase();
  let q = query(collection(db, 'decks'), where('visibility', '==', 'public'), where('moderationStatus', '==', 'approved'), where('deletedAt', '==', null));
  const terms = searchTerms(search);
  if (category) q = query(q, where('category', '==', category));
  if (tag && !terms.length) q = query(q, where('tags', 'array-contains', tag));
  if (terms.length) q = query(q, where('searchTokens', 'array-contains-any', terms), orderBy('updatedAt', 'desc'));
  else q = query(q, orderBy(sort === 'title' ? 'titleLower' : sort === 'count' ? 'cardCount' : 'updatedAt', sort === 'title' ? 'asc' : 'desc'));
  if (cursor) q = query(q, startAfter(cursor));
  return query(q, limit(pageSize));
}

export async function loadDeckPage(options = {}) { try { const snapshot = await getDocs(buildDeckQuery(options)); return { items: snapshot.docs.map(data), cursor: snapshot.docs.at(-1) || null, hasMore: snapshot.size === (options.pageSize || PAGE_SIZE) }; } catch (error) { throw new Error(friendlyError(error)); } }

export function subscribeLatestDecks(callback, onError) {
  try { const q = buildDeckQuery({}); return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(data), snapshot.docs.at(-1) || null), onError); } catch (error) { onError?.(error); return () => {}; }
}

export async function getDeck(id) { const starter = getStarterDeck(id); if (starter) return starter; try { const snapshot = await getDoc(deckRef(id)); return snapshot.exists() ? data(snapshot) : null; } catch (error) { throw new Error(friendlyError(error)); } }
export async function getCards(deckId) { const starter = getStarterCards(deckId); if (starter) return starter; const snapshot = await getDocs(query(collection(db, 'decks', deckId, 'cards'), orderBy('position', 'asc'), limit(200))); return snapshot.docs.map((snap) => ({ difficulty: DEFAULT_CARD_DIFFICULTY, ...data(snap) })); }

function cleanDeckInput(input) { return { title: input.title.trim(), titleLower: normalizeText(input.title), description: input.description.trim(), category: input.category, difficulty: deckDifficulty(input.cards), tags: [...new Set(input.tags.map((tag) => normalizeText(tag)).filter(Boolean))].slice(0, 5), searchTokens: buildSearchTokens(input) }; }

export async function createDeck(input, owner) { try { requireFirebase(); const ref = doc(collection(db, 'decks')); const batch = writeBatch(db); batch.set(ref, { ...cleanDeckInput(input), ownerId: owner.uid, ownerNameSnapshot: owner.displayName || owner.email?.split('@')[0] || 'Пользователь', visibility: 'private', moderationStatus: 'draft', moderationNote: '', cardCount: input.cards.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), deletedAt: null }); input.cards.forEach((card, index) => batch.set(doc(collection(db, 'decks', ref.id, 'cards')), { front: card.front.trim(), back: card.back.trim(), difficulty: card.difficulty || DEFAULT_CARD_DIFFICULTY, position: index, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })); await batch.commit(); return ref.id; } catch (error) { throw new Error(friendlyError(error)); } }

export async function updateDeck(id, input, owner) { try { requireFirebase(); const ref = deckRef(id); const current = (await getDoc(ref)).data(); const existing = await getDocs(collection(db, 'decks', id, 'cards')); const incomingIds = new Set(input.cards.map((card) => card.id).filter(Boolean)); const batch = writeBatch(db); existing.docs.filter((card) => !incomingIds.has(card.id)).forEach((card) => batch.delete(card.ref)); const wasPublic = current?.moderationStatus === 'approved'; batch.update(ref, { ...cleanDeckInput(input), cardCount: input.cards.length, ...(wasPublic ? { moderationStatus: 'pending', moderationNote: 'Изменения ожидают повторной модерации.' } : {}), updatedAt: serverTimestamp() }); input.cards.forEach((card, index) => { const cardRef = card.id ? doc(db, 'decks', id, 'cards', card.id) : doc(collection(db, 'decks', id, 'cards')); batch.set(cardRef, { front: card.front.trim(), back: card.back.trim(), difficulty: card.difficulty || DEFAULT_CARD_DIFFICULTY, position: index, createdAt: card.createdAt || serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }); }); await batch.commit(); return id; } catch (error) { throw new Error(friendlyError(error)); } }
export async function submitForModeration(id) { await updateDoc(deckRef(id), { visibility: 'public', moderationStatus: 'pending', moderationNote: '', updatedAt: serverTimestamp() }); }
export async function softDeleteDeck(id) { await updateDoc(deckRef(id), { deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }); }
export async function moderateDeck(id, status, note = '') { if (!['approved', 'rejected', 'hidden'].includes(status)) throw new Error('Недопустимый статус модерации.'); await updateDoc(deckRef(id), { moderationStatus: status, moderationNote: note.trim(), visibility: status === 'approved' ? 'public' : 'private', updatedAt: serverTimestamp() }); }

export async function listOwnDecks(uid) { const snapshot = await getDocs(query(collection(db, 'decks'), where('ownerId', '==', uid), orderBy('updatedAt', 'desc'))); return snapshot.docs.map(data); }
export async function listAllDecks() { const snapshot = await getDocs(query(collection(db, 'decks'), orderBy('updatedAt', 'desc'), limit(100))); return snapshot.docs.map(data); }
export async function similarDecks(deck, cursor = null) { let q = query(collection(db, 'decks'), where('category', '==', deck.category), where('visibility', '==', 'public'), where('moderationStatus', '==', 'approved'), where('deletedAt', '==', null), orderBy('updatedAt', 'desc')); if (cursor) q = query(q, startAfter(cursor)); const snapshot = await getDocs(query(q, limit(7))); const remote = snapshot.docs.map(data); const starters = listStarterDecks().filter((item) => item.category === deck.category); const items = [...remote, ...starters].filter((item, index, all) => item.id !== deck.id && all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 6); return { items, cursor: snapshot.docs.at(-1) || null, hasMore: snapshot.size === 7 }; }

export async function saveDeck(uid, deck) { await setDoc(doc(db, 'savedDecks', `${uid}_${deck.id}`), { userId: uid, deckId: deck.id, deckTitleSnapshot: deck.title, ownerNameSnapshot: deck.ownerNameSnapshot, savedAt: serverTimestamp() }); }
export async function removeSavedDeck(uid, deckId) { await deleteDoc(doc(db, 'savedDecks', `${uid}_${deckId}`)); }
export async function isDeckSaved(uid, deckId) { const snapshot = await getDocs(query(collection(db, 'savedDecks'), where('userId', '==', uid), where('deckId', '==', deckId), limit(1))); return !snapshot.empty; }
export async function listSavedDecks(uid) { const snapshot = await getDocs(query(collection(db, 'savedDecks'), where('userId', '==', uid), orderBy('savedAt', 'desc'))); return snapshot.docs.map(data); }
