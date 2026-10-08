import { login, register, resetPassword } from '../js/services/auth.js';
import { $, renderError, setBusy, showMessage } from '../js/ui.js';

export async function initAuthPage() {
  const form = $('form[data-auth]'); if (!form) return; const message = $('[data-form-message]');
  form.addEventListener('submit', async (event) => { event.preventDefault(); const button = form.querySelector('button[type=submit]'); setBusy(button, true); showMessage(message, ''); try { const values = Object.fromEntries(new FormData(form)); if (form.dataset.auth === 'login') await login(values); else if (form.dataset.auth === 'register') { if (values.password !== values.passwordConfirm) throw new Error('Пароли не совпадают.'); await register(values); } else { await resetPassword(values.email); showMessage(message, 'Письмо для восстановления отправлено.', 'success'); return; } location.href = new URLSearchParams(location.search).get('next') || 'dashboard.html'; } catch (error) { renderError(message, error); } finally { setBusy(button, false); } });
}
