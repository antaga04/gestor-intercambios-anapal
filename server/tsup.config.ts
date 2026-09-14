import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    outDir: 'dist',
    target: 'node22',
    platform: 'node',
    clean: true,
    sourcemap: true,
    splitting: false,
    minify: false,
    // Bundle workspace code so the Vercel function is self-contained.
    noExternal: ['@anapal/shared'],
    tsconfig: './tsconfig.json',
    onSuccess: 'mkdir -p dist/templates && cp -r templates/. dist/templates/',
});
