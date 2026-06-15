import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    lang: 'en-US',
    title: 'Electron IPC',
    description:
      'TypeScript code generator for type-safe Electron IPC communication with streaming, validation, and multi-window support',
    base: '/',
    head: [
      ['meta', { name: 'robots', content: 'index, follow' }],
      ['meta', { name: 'author', content: 'Michael Rieck (Michael--)' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'Electron IPC' }],
      [
        'meta',
        { property: 'og:title', content: 'Electron IPC — Type-safe IPC Generator for Electron' },
      ],
      [
        'meta',
        {
          property: 'og:description',
          content:
            'TypeScript code generator for type-safe Electron IPC communication with streaming, validation, and multi-window support',
        },
      ],
      ['meta', { property: 'og:url', content: 'https://electron-ipc.number10.de/' }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
      ['meta', { name: 'twitter:title', content: 'Electron IPC — Type-safe IPC Generator' }],
      [
        'meta',
        {
          name: 'twitter:description',
          content: 'TypeScript code generator for type-safe Electron IPC communication',
        },
      ],
    ],
    sitemap: {
      hostname: 'https://electron-ipc.number10.de',
    },
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
              { text: 'Renderer-to-Renderer IPC', link: '/guide/renderer-to-renderer' },
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
