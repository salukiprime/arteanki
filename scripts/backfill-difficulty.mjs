import { readFile, readdir, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { DEFAULT_CARD_DIFFICULTY, deckDifficulty } from '../src/js/difficulty.js';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { OAuth2Client } = require('google-auth-library');
const apply = process.argv.includes('--apply');
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('VITE_FIREBASE_PROJECT_ID is required.');
// Use the existing Firebase CLI sign-in without printing or copying credentials.
const config = JSON.parse(await readFile(`${homedir()}/.config/configstore/firebase-tools.json`, 'utf8'));
let cliPath = process.env.FIREBASE_CLI_PACKAGE;
if (!cliPath) {
  const cache = `${homedir()}/.npm/_npx`;
  for (const entry of await readdir(cache)) {
    const candidate = `${cache}/${entry}/node_modules/firebase-tools/package.json`;
    try { await access(candidate); cliPath = candidate; break; } catch {}
  }
}
if (!cliPath) throw new Error('Install Firebase CLI or set FIREBASE_CLI_PACKAGE to its package.json.');
const api = createRequire(cliPath)('./lib/api.js');
if (!config.tokens?.refresh_token) throw new Error('Sign in with Firebase CLI first.');
const authClient = new OAuth2Client(api.clientId(), api.clientSecret());
authClient.setCredentials({ refresh_token: config.tokens.refresh_token });
const root = `projects/${projectId}/databases/(default)/documents`;
const endpoint = `https://firestore.googleapis.com/v1/${root}`;
async function listDocuments(path) {
  const documents = [];
  let pageToken;
  do {
    const response = await authClient.request({ url: `${endpoint}/${path}`, params: { pageSize: 300, ...(pageToken ? { pageToken } : {}) } });
    documents.push(...(response.data.documents || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return documents;
}
const decks = await listDocuments('decks');
let deckCount = 0;
let cardCount = 0;
for (const deck of decks) {
  const id = deck.name.split('/').at(-1);
  const cards = await listDocuments(`decks/${id}/cards`);
  if (process.argv.includes('--verify')) console.log(JSON.stringify({ deckId: id, difficulty: deck.fields?.difficulty?.stringValue || null, cards: cards.length, missingCardDifficulty: cards.filter((card) => card.fields?.difficulty === undefined).length }));
  const missing = cards.filter((card) => card.fields?.difficulty === undefined);
  const writes = missing.map((card) => ({
    update: { name: card.name, fields: { difficulty: { stringValue: DEFAULT_CARD_DIFFICULTY } } },
    updateMask: { fieldPaths: ['difficulty'] },
    currentDocument: { updateTime: card.updateTime },
  }));
  if (deck.fields?.difficulty === undefined) {
    writes.push({
      update: { name: deck.name, fields: { difficulty: { stringValue: deckDifficulty(cards.map((card) => ({ difficulty: card.fields?.difficulty?.stringValue }))) } } },
      updateMask: { fieldPaths: ['difficulty'] },
      currentDocument: { updateTime: deck.updateTime },
    });
    deckCount++;
  }
  if (apply && writes.length) await authClient.request({ url: `${endpoint}:commit`, method: 'POST', data: { writes } });
  cardCount += missing.length;
}
console.log(JSON.stringify({ projectId, mode: apply ? 'applied' : 'dry-run', scannedDecks: decks.length, decks: deckCount, cards: cardCount }));
