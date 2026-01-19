import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'Electron IPC',
  description: 'Type-safe IPC generator for Electron',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/overview' },
      { text: 'Architecture', link: '/guide/architecture' },
      { text: 'Window Manager', link: '/guide/window-manager' },
      { text: 'Inspector', link: '/guide/inspector' },
      { text: 'Examples', link: '/examples/electron-vite' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Overview', link: '/guide/overview' },
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Window Manager', link: '/guide/window-manager' },
            { text: 'Inspector', link: '/guide/inspector' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Electron + Vite', link: '/examples/electron-vite' },
            { text: 'Electron Forge', link: '/examples/electron-forge' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/Michael--/electron-ipc' }],
  },
})
