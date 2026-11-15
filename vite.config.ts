import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/ccgt-demo/',
  plugins: [react()],
  worker: { format: 'es' },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
