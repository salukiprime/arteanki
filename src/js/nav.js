import { logout } from './services/auth.js';
import { getProfile } from './services/auth.js';
import { $, escapeHtml, showMessage } from './ui.js';
import { firebaseConfigured } from './firebase.js';

export async function renderNav(user) {
  const slot = $('#site-nav'); if (!slot) return;
  let profile = null; if (user) { try { profile = await getProfile(user.uid); } catch { /* optional nav enhancement */ } }
  slot.innerHTML = `<a class="brand" href="index.html"><span class="brand-mark">A</span><span>ArteAnki</span></a><nav class="nav-links"><a href="index.html">Каталог</a>${user ? '<a href="dashboard.html">Мой кабинет</a>' : ''}${profile?.role === 'admin' ? '<a href="admin.html">Админ-панель</a>' : ''}</nav><div class="nav-actions">${user ? `<span class="user-chip">${escapeHtml(profile?.displayName || user.email || '')}</span><button class="button ghost" id="logout-button">Выйти</button>` : '<a class="button ghost" href="login.html">Войти</a><a class="button primary small" href="register.html">Регистрация</a>'}<button class="menu-button" aria-label="Открыть меню">☰</button></div>`;
  $('#logout-button')?.addEventListener('click', async () => { await logout(); location.href = 'index.html'; });
  $('.menu-button', slot)?.addEventListener('click', () => $('.nav-links', slot)?.classList.toggle('open'));
  if (!firebaseConfigured) { const notice = document.createElement('span'); notice.className = 'config-dot'; notice.title = 'Firebase не настроен'; notice.textContent = '⚙'; slot.querySelector('.nav-actions')?.prepend(notice); }
}

export function protectPage(user, { admin = false } = {}) { if (!user) { location.href = `login.html?next=${encodeURIComponent(location.pathname + location.search)}`; return false; } return true; }
