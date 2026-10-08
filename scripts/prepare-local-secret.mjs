import { chmod, writeFile } from 'node:fs/promises';

const key = process.env.EXPLABS_API_KEY;
if (!key) throw new Error('EXPLABS_API_KEY не задан в .env.');
const file = new URL('../functions/.secret.local', import.meta.url);
await writeFile(file, `EXPLABS_API_KEY=${key}\n`, { mode: 0o600 });
await chmod(file, 0o600);
console.log('Локальный секрет для эмулятора подготовлен.');
