import '../styles.css';
import '../generation.css';
import { initAuth, subscribeAuth } from './state.js';
import { renderNav, protectPage } from './nav.js';
import { firebaseConfigured } from './firebase.js';
import { initCatalog } from '../pages/catalog.js';
import { initAuthPage } from '../pages/auth-pages.js';
import { initDeckPage } from '../pages/deck-page.js';
import { initEditorPage } from '../pages/editor-page.js';
import { initGenerationUI } from '../pages/generation-ui.js';
import { initStudyPage } from '../pages/study-page.js';
import { initDashboardPage } from '../pages/dashboard-page.js';
import { initAdminPage } from '../pages/admin-page.js';

const page = document.body.dataset.page;
const guarded = new Set(['editor', 'study', 'dashboard', 'admin']);
const adminPage = page === 'admin';

async function boot() {
  const user = await initAuth();
  await renderNav(user);
  if (!firebaseConfigured && page !== 'catalog' && !['login', 'register', 'reset'].includes(page)) document.querySelector('[data-config-note]')?.removeAttribute('hidden');
  if (guarded.has(page) && !protectPage(user, { admin: adminPage })) return;
  const initializers = { catalog: initCatalog, login: initAuthPage, register: initAuthPage, reset: initAuthPage, deck: initDeckPage, editor: initEditorPage, study: initStudyPage, dashboard: initDashboardPage, admin: initAdminPage };
  await initializers[page]?.(user);
  if (page === 'editor' && user) initGenerationUI();
}

boot().catch((error) => { const target = document.querySelector('[data-global-error]'); if (target) { target.hidden = false; target.textContent = error.message; } });
