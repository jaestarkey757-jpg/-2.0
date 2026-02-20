import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Добавляем базовый путь, если деплоите на GitHub Pages
  // base: '/имя-вашего-репозитория/', 
  plugins: [
    react({
      // Если нужны специфические настройки Babel, они пишутся здесь:
      babel: {
        plugins: [],
        babelrc: false,
        configFile: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
