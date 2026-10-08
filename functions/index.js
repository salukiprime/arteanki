import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { MAX_GENERATED_CARDS, parseGeneratedCards, validateGenerationInput } from './generate-cards.js';

const gatewayKey = defineSecret('EXPLABS_API_KEY');
const MODEL = 'mimo-v2.6-pro';
const DAILY_LIMIT = 20;
initializeApp();

async function reserveGeneration(uid) {
  const ref = getFirestore().collection('aiGenerationLimits').doc(uid);
  const today = new Date().toISOString().slice(0, 10);
  await getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const used = snapshot.data()?.day === today ? snapshot.data().count || 0 : 0;
    if (used >= DAILY_LIMIT) {
      throw new HttpsError('resource-exhausted', 'Дневной лимит — 20 генераций. Попробуйте завтра.');
    }
    transaction.set(ref, { day: today, count: used + 1 });
  });
}

export const generateCards = onCall(
  { secrets: [gatewayKey], timeoutSeconds: 120, maxInstances: 10 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Войдите в аккаунт, чтобы генерировать карточки.');

    let input;
    try {
      input = validateGenerationInput(request.data);
    } catch (error) {
      throw new HttpsError('invalid-argument', error.message);
    }

    await reserveGeneration(request.auth.uid);

    try {
      const client = new OpenAI({
        apiKey: gatewayKey.value(),
        baseURL: 'https://api.experientiallabs.ai/v1',
        maxRetries: 0,
      });
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: `Ты создаёшь карточки для интервального обучения. Верни только JSON-объект вида {"cards":[{"front":"вопрос или термин","back":"краткий точный ответ"}]}. Создай не более ${MAX_GENERATED_CARDS} карточек. Каждая сторона — максимум 500 символов. Используй только факты из текста, не выдумывай. Пиши на языке исходного текста.` },
          { role: 'user', content: `Составь ${input.count} карточек по этому тексту:\n\n${input.source}` },
        ],
      });
      return { cards: parseGeneratedCards(completion.choices[0]?.message?.content, input.count) };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error?.status === 429) throw new HttpsError('resource-exhausted', 'Лимит генерации исчерпан. Попробуйте позже.');
      if (error?.status === 401 || error?.status === 403) throw new HttpsError('failed-precondition', 'Шлюз AI недоступен. Сообщите администратору.');
      throw new HttpsError('internal', 'Не удалось создать карточки. Попробуйте ещё раз.');
    }
  },
);
