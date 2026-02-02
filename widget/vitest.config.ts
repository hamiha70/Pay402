import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // Browser environment (was 'node' - that's why Buffer bug wasn't caught!)
    globals: true,
  },
});
