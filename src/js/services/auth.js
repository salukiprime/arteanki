import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, friendlyError, requireFirebase } from '../firebase.js';

export async function ensureProfile(user, displayName = '') {
  requireFirebase();
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    try {
      await setDoc(ref, { displayName: displayName || user.displayName || user.email?.split('@')[0] || 'Пользователь', email: user.email || '', role: 'user', bio: '', settings: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (error) {
      // Another auth listener may have created the same profile meanwhile.
      if (error.code !== 'permission-denied' || !(await getDoc(ref)).exists()) throw error;
    }
  }
  return (await getDoc(ref)).data();
}

export async function register({ email, password, displayName }) {
  try { requireFirebase(); const result = await createUserWithEmailAndPassword(auth, email.trim(), password); if (displayName.trim()) await updateProfile(result.user, { displayName: displayName.trim() }); await ensureProfile(result.user, displayName); if (displayName.trim()) await updateProfileData(result.user.uid, { displayName: displayName.trim() }); return result.user; } catch (error) { throw new Error(friendlyError(error)); }
}
export async function login({ email, password }) { try { requireFirebase(); return (await signInWithEmailAndPassword(auth, email.trim(), password)).user; } catch (error) { throw new Error(friendlyError(error)); } }
export async function logout() { if (auth) await signOut(auth); }
export async function resetPassword(email) { try { requireFirebase(); await sendPasswordResetEmail(auth, email.trim()); } catch (error) { throw new Error(friendlyError(error)); } }
export async function getProfile(uid) { requireFirebase(); const snapshot = await getDoc(doc(db, 'users', uid)); return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null; }
export async function updateProfileData(uid, data) { requireFirebase(); await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }); }
