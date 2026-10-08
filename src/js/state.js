import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.js';
import { ensureProfile } from './services/auth.js';

let currentUser = null;
let ready = false;
const listeners = new Set();

export function getCurrentUser() { return currentUser; }
export function subscribeAuth(callback) { listeners.add(callback); callback(currentUser, ready); return () => listeners.delete(callback); }

export function initAuth() {
  if (!auth) { ready = true; listeners.forEach((callback) => callback(null, true)); return Promise.resolve(null); }
  return new Promise((resolve) => onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) { try { await ensureProfile(user); } catch { /* page services show a useful error */ } }
    ready = true;
    listeners.forEach((callback) => callback(currentUser, ready));
    resolve(user);
  }));
}
