import OpenAI from 'openai';

export function createExplabsClient() {
  const apiKey = process.env.EXPLABS_API_KEY;
  if (!apiKey) throw new Error('EXPLABS_API_KEY не задан в окружении.');

  return new OpenAI({
    apiKey,
    baseURL: 'https://api.experientiallabs.ai/v1',
  });
}
