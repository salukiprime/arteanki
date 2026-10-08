import { httpsCallable } from 'firebase/functions';
import { functions, requireFirebase } from '../firebase.js';

export async function generateCardsFromText(source, count) {
  requireFirebase();
  const callable = httpsCallable(functions, 'generateCards', { timeout: 120000 });
  const result = await callable({ source, count });
  if (!Array.isArray(result.data?.cards)) throw new Error('Сервис вернул некорректные карточки.');
  return result.data.cards;
}
