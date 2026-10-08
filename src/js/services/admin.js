import { collection, doc, getCountFromServer, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase.js';
import { getProfile } from './auth.js';
import { listAllDecks, moderateDeck } from './decks.js';
import { listAllComments, deleteComment } from './comments.js';
import { listAllSessions, updateSessionAdminStatus } from './study.js';

export { listAllDecks, moderateDeck, listAllComments, deleteComment, listAllSessions, updateSessionAdminStatus };
export async function summary() { const names = ['users', 'decks', 'comments', 'studySessions']; const counts = await Promise.all(names.map(async (name) => [(name), (await getCountFromServer(collection(db, name))).data().count])); const pending = await getCountFromServer(query(collection(db, 'decks'), where('moderationStatus', '==', 'pending'))); return Object.fromEntries([...counts, ['pending', pending.data().count]]); }
export async function listUsers() { const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200))); return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); }
export async function updateUserRole(uid, role, currentUid) { if (uid === currentUid) throw new Error('Нельзя изменить собственную роль.'); if (!['user', 'admin'].includes(role)) throw new Error('Недопустимая роль.'); await updateDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() }); }
