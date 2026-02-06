import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // escuta em 0.0.0.0 (acessível pelo IP da máquina)
    port: 5173,
    strictPort: true,
  },
});
