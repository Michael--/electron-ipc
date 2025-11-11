import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@gen': resolve(__dirname, 'dist'),
      },
    },
    build: {
      outDir: 'dist/main',
      sourcemap: true,
      minify: false,
      lib: {
        entry: resolve(__dirname, 'src/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@gen': resolve(__dirname, 'dist'),
      },
    },
    build: {
      outDir: 'dist/preload',
      sourcemap: true,
      minify: false,
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'public'),
    plugins: [react()],
    build: {
      outDir: 'dist/renderer',
      sourcemap: true,
      minify: false,
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, 'public/index.html'),
      },
    },
  },
})
