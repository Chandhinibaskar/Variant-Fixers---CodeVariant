import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` produces dist/index.html as ONE self-contained file (easy to submit / host anywhere).
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
});
