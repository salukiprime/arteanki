import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseConfigured = Object.values(config).every(Boolean);
let app;
export const auth = firebaseConfigured ? getAuth((app = initializeApp(config))) : null;
export const db = firebaseConfigured ? getFirestore(app) : null;
export const functions = firebaseConfigured ? getFunctions(app) : null;

if (firebaseConfigured && import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export function requireFirebase() {
  if (!firebaseConfigured) throw new Error('Firebase не настроен. Заполните файл .env значениями VITE_FIREBASE_*.');
  return { auth, db };
}

export function friendlyError(error) {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-credential': 'Неверный email или пароль.',
    'auth/email-already-in-use': 'Этот email уже зарегистрирован.',
    'auth/weak-password': 'Пароль должен содержать минимум 6 символов.',
    'auth/invalid-email': 'Введите корректный email.',
    'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже.',
    'permission-denied': 'Недостаточно прав для этого действия.',
    'failed-precondition': 'Не выполнено условие Firebase. Проверьте индексы.'
  };
  return messages[code] || error?.message || 'Произошла ошибка. Попробуйте ещё раз.';
}
