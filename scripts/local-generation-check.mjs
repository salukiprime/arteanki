import { randomUUID } from 'node:crypto';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('VITE_FIREBASE_PROJECT_ID не задан в .env.');

const signup = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `test-${randomUUID()}@example.test`, password: randomUUID(), returnSecureToken: true }),
});
if (!signup.ok) throw new Error(`Auth emulator: ${signup.status}`);
const { idToken } = await signup.json();

const response = await fetch(`http://127.0.0.1:5001/${projectId}/us-central1/generateCards`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ data: {
    source: 'Фотосинтез — процесс преобразования энергии света в химическую энергию. Он происходит в хлоропластах растений.',
    count: 2,
  } }),
});
const result = await response.json();
if (!response.ok || !Array.isArray(result.result?.cards) || result.result.cards.length !== 2) {
  throw new Error(`Functions emulator: ${response.status} ${JSON.stringify(result.error || result.result)}`);
}
console.log(`Локальная генерация успешна: ${result.result.cards.length} карточки.`);
