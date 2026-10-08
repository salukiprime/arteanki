import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, getDocs } from 'firebase/firestore';
import { db, friendlyError } from '../firebase.js';

export function subscribeComments(deckId, callback, onError) { return onSnapshot(query(collection(db, 'comments'), where('deckId', '==', deckId), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError); }
export async function createComment(input, user, deck) { try { return await addDoc(collection(db, 'comments'), { deckId: deck.id, deckTitleSnapshot: deck.title, authorId: user.uid, authorNameSnapshot: user.displayName || user.email?.split('@')[0] || 'Пользователь', body: input.body.trim(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); } catch (error) { throw new Error(friendlyError(error)); } }
export async function updateOwnComment(id, body) { await updateDoc(doc(db, 'comments', id), { body: body.trim(), updatedAt: serverTimestamp() }); }
export async function deleteComment(id) { await deleteDoc(doc(db, 'comments', id)); }
export async function listAllComments() { const snapshot = await getDocs(query(collection(db, 'comments'), orderBy('createdAt', 'desc'), limit(200))); return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); }
export async function listOwnComments(uid) { const snapshot = await getDocs(query(collection(db, 'comments'), where('authorId', '==', uid), limit(100))); return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); }
