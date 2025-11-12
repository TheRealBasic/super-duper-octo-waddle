import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  splitting: true,
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@prisma/client', '.prisma/client'],
  noExternal: ['@acme/shared'],
});
