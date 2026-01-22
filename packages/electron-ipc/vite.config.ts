import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
      include: ['src/**/*'],
      exclude: ['src/bin/**/*', '**/*.test.ts'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'window-manager/index': resolve(__dirname, 'src/window-manager/index.ts'),
        'inspector/index': resolve(__dirname, 'src/inspector/index.ts'),
        'inspector/trace-renderer': resolve(__dirname, 'src/inspector/trace-renderer.ts'),
        'inspector/ui/preload': resolve(__dirname, 'src/inspector/ui/preload.ts'),
        'inspector/ui/renderer': resolve(__dirname, 'src/inspector/ui/renderer.ts'),
        'validation/index': resolve(__dirname, 'src/validation/index.ts'),
        'validation/adapters/zod': resolve(__dirname, 'src/validation/adapters/zod.ts'),
        'validation/adapters/valibot': resolve(__dirname, 'src/validation/adapters/valibot.ts'),
        'bin/generate-api': resolve(__dirname, 'src/bin/generate-api.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (entryName.includes('bin/')) {
          return `${entryName}.js`
        }
        if (entryName.includes('inspector/ui/')) {
          // UI files always as .js
          return `${entryName}.js`
        }
        return `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
      },
    },
    rollupOptions: {
      external: ['electron', 'fs', 'path', 'ts-morph', 'colors', 'yaml', 'node:async_hooks'],
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
})
