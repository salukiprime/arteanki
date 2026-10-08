import { createExplabsClient } from '../server/explabs-client.js';

const model = process.argv[2];
if (!model) {
  console.error('Укажите точный ID модели: npm run explabs:smoke -- <model-id>');
  process.exit(1);
}

try {
  const client = createExplabsClient();
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Ответь одним словом: привет.' }],
  });
  const answer = completion.choices[0]?.message?.content;
  if (!answer) throw new Error('Шлюз вернул пустой ответ.');
  console.log(JSON.stringify({ model: completion.model, answer, usage: completion.usage }, null, 2));
} catch (error) {
  console.error(`Тест не прошёл: ${error.message}`);
  process.exitCode = 1;
}
