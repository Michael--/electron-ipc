import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    lang: 'en-US',
    title: 'Electron IPC',
    description: 'Type-safe IPC generator for Electron',
    base: '/electron-ipc/',
    markdown: {
      // @ts-expect-error VitePress supports this, but TS picks wrong types
      mermaid: true,
      math: false,
    },
    mermaid: {
      flowchart: { htmlLabels: true },
      themeVariables: {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fontSize: '16px',
      },
    },

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
            text: 'Getting Started',
            items: [
              { text: 'Overview', link: '/guide/overview' },
              { text: 'Architecture', link: '/guide/architecture' },
            ],
          },
          {
            text: 'Core Features',
            items: [
              { text: 'Validation', link: '/guide/validation' },
              { text: 'Window Manager', link: '/guide/window-manager' },
              { text: 'Inspector', link: '/guide/inspector' },
            ],
          },
          {
            text: 'Advanced Topics',
            items: [
              { text: 'Multi-Window Patterns', link: '/guide/multi-window' },
              { text: 'Performance Tuning', link: '/guide/performance' },
              { text: 'Security & Best Practices', link: '/guide/security' },
              { text: 'Production Deployment', link: '/guide/production' },
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
    vite: {
      ssr: { noExternal: ['mermaid'] },
      optimizeDeps: { include: ['mermaid'] },
    },
  })
)
