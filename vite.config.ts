import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' 方便直接部署到 GitHub Pages 等静态托管
export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.ts'], css: false },
});
