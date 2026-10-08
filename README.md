# ArteAnki

Адаптивный тренажёр карточек на Vanilla JavaScript, Vite и Firebase.

## GitHub Pages

Сайт: https://salukiprime.github.io/arteanki/

Изменения в ветке `main` автоматически проходят тесты, собираются и публикуются
через `.github/workflows/pages.yml`. В настройках репозитория Pages выбран
источник GitHub Actions. Путь сайта задаётся через `VITE_BASE_PATH`.

Для сборки используется публичная конфигурация Firebase из `.env.example`.
Секрет `EXPLABS_API_KEY` остаётся на стороне Firebase Cloud Functions.
GitHub Pages размещает интерфейс; авторизация, данные и генерация карточек
продолжают использовать Firebase. Для входа добавьте `salukiprime.github.io`
в Firebase Authentication → Settings → Authorized domains.

## Запуск

```bash
npm install
cp .env.example .env
# заполните VITE_FIREBASE_* значениями проекта Firebase
npm run dev
```

В Firebase включите Email/Password Authentication, создайте Firestore и примените правила/индексы:

```bash
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

## Генерация карточек

В редакторе колоды можно вставить текст и добавить до 20 карточек за запрос. Сгенерированные карточки сначала появляются в форме: проверьте и исправьте их перед сохранением. Для каждого аккаунта действует лимит 20 генераций в день.

Для генерации используется Firebase Cloud Function и модель `mimo-v2.6-pro` через Experiential Labs. Ключ хранится в Firebase Secret Manager, а не в коде или браузере. Настройка для публикации:

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set EXPLABS_API_KEY
firebase deploy --only functions,hosting
```

Для публикации Cloud Functions проект Firebase должен быть на тарифе Blaze. Локальный `.env` нужен только для тестового скрипта `npm run explabs:smoke -- mimo-v2.6-pro`; облачная функция получает ключ из Secret Manager.

Локально Blaze не нужен. В двух терминалах запустите:

```bash
npm run emulators
npm run dev:local
```

Откройте адрес Vite, зарегистрируйте тестового пользователя и перейдите в редактор колоды. Auth, Firestore и Functions будут работать в локальных эмуляторах. Для эмулятора Firestore на компьютере нужен Java Runtime. Скрипт `emulators` создаёт игнорируемый Git файл `functions/.secret.local` из локального `.env`.

Для быстрой проверки серверной цепочки с запущенными эмуляторами выполните `npm run local:smoke`. Команда создаст временного пользователя в локальном Auth emulator и запросит две карточки; реальный аккаунт Firebase не затрагивается.

Первого администратора назначьте вручную в документе `users/{uid}`, установив `role: "admin"`.

## Проверки

```bash
npm test
npm run build
```

Приложение состоит из отдельных HTML-страниц. Неизвестные hosting-маршруты показывают `404.html`, а не перенаправляются на SPA-entrypoint.
