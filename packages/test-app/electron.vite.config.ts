import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
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
    build: {
      outDir: 'dist/renderer',
      sourcemap: true,
      minify: false,
      rollupOptions: {
        input: resolve(__dirname, 'public/index.html'),
      },
    },
  },
})
