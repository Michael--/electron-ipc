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
      outDir: 'out/main',
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
      outDir: 'out/preload',
      sourcemap: true,
      minify: false,
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'public'),
    resolve: {
      alias: {
        '@gen': resolve(__dirname, 'dist'),
      },
    },
    build: {
      outDir: '../out/renderer',
      sourcemap: true,
      minify: false,
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, 'public/index.html'),
      },
    },
  },
})
