import { generateCardsFromText } from '../js/services/generation.js';
import { $, $$, renderError, setBusy, showMessage } from '../js/ui.js';

export function initGenerationUI() {
  const button = $('#generate-cards');
  if (!button) return;

  button.addEventListener('click', async () => {
    const status = $('#generator-status');
    const source = $('#generator-source').value.trim();
    const count = Number($('#generator-count').value);
    const editors = $$('.card-editor');
    const first = editors[0];
    const blankFirst = editors.length === 1 && !first.dataset.id &&
      !$('textarea[name=front]', first).value.trim() && !$('textarea[name=back]', first).value.trim();
    const available = 200 - editors.length + (blankFirst ? 1 : 0);

    if (source.length < 40 || source.length > 12000) {
      showMessage(status, 'Вставьте текст от 40 до 12 000 символов.', 'error');
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      showMessage(status, 'Выберите от 1 до 20 карточек.', 'error');
      return;
    }
    if (count > available) {
      showMessage(status, `В колоде осталось место для ${available} карточек.`, 'error');
      return;
    }

    setBusy(button, true, 'Генерация…');
    showMessage(status, 'Создаём карточки…');
    try {
      const cards = await generateCardsFromText(source, count);
      let firstAdded;
      for (const card of cards) {
        let editor;
        if (blankFirst && !firstAdded) {
          editor = first;
        } else {
          $('#add-card').click();
          editor = $$('.card-editor').at(-1);
        }
        if (!firstAdded) firstAdded = editor;
        $('textarea[name=front]', editor).value = card.front;
        $('textarea[name=back]', editor).value = card.back;
      }
      showMessage(status, `Добавлено ${cards.length} карточек. Проверьте их перед сохранением.`, 'success');
      firstAdded?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      renderError(status, error);
    } finally {
      setBusy(button, false);
    }
  });
}
