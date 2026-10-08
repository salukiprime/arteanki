import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  server: { port: 5173 },
  build: { rollupOptions: { input: {
    index: 'index.html', login: 'login.html', register: 'register.html',
    reset: 'reset.html', deck: 'deck.html', editor: 'editor.html',
    study: 'study.html', dashboard: 'dashboard.html', admin: 'admin.html',
    notFound: '404.html'
  } } }
});
