import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  target: 'node20',
  format: ['esm'],
  sourcemap: true,
  clean: true,
  dts: false
});
