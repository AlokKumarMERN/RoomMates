import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 is configured through the Vite plugin plus `@theme` in index.css —
// there is no tailwind.config.js or postcss.config.js in v4.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
});
