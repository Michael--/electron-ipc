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
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@gen': resolve(__dirname, 'dist'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'public'),
    plugins: [react()],
    resolve: {
      alias: {
        '@gen': resolve(__dirname, 'dist'),
      },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'public/index.html'),
      },
    },
  },
})
