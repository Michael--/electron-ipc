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
        'bin/generate-api': resolve(__dirname, 'src/bin/generate-api.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (entryName.includes('bin/')) {
          return `${entryName}.js`
        }
        return `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
      },
    },
    rollupOptions: {
      external: ['electron', 'fs', 'path', 'ts-morph', 'colors', 'yaml'],
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
})
