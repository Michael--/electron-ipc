import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const BASE_URL = 'https://electron-ipc.number10.de'

function resolvePageUrl(relativePath: string): string {
  if (relativePath === 'index.md') return '/'
  const clean = relativePath.replace(/\.md$/, '')
  return `/${clean}`
}

export default withMermaid(
  defineConfig({
    lang: 'en-US',
    title: 'Electron IPC',
    description:
      'Generate type-safe Electron IPC APIs from TypeScript contracts for main, preload, and renderer code.',
    base: '/',
    head: [
      ['meta', { name: 'author', content: 'Michael Rieck (Michael--)' }],
      [
        'meta',
        {
          name: 'keywords',
          content:
            'electron ipc, electron typescript, type-safe ipc, contextBridge, ipcMain, ipcRenderer, code generator',
        },
      ],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'Electron IPC' }],
      ['meta', { property: 'og:image', content: `${BASE_URL}/og-image.png` }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
    ],
    transformHead: ({ pageData, head, title, description }): void => {
      // 404 page: only add noindex, skip all SEO tags
      if (pageData.isNotFound) {
        head.push(['meta', { name: 'robots', content: 'noindex' }])
        return
      }

      const url = resolvePageUrl(pageData.relativePath)
      const fullUrl = `${BASE_URL}${url}`

      // robots (default index,follow for all real pages)
      head.push(['meta', { name: 'robots', content: 'index, follow' }])

      // canonical
      head.push(['link', { rel: 'canonical', href: fullUrl }])

      // OG — use context-level title (includes site name suffix) and description (resolved fallback)
      head.push(['meta', { property: 'og:title', content: title }])
      head.push(['meta', { property: 'og:description', content: description }])
      head.push(['meta', { property: 'og:url', content: fullUrl }])

      // Twitter
      head.push(['meta', { name: 'twitter:title', content: title }])
      head.push(['meta', { name: 'twitter:description', content: description }])
    },
    sitemap: {
      hostname: 'https://electron-ipc.number10.de',
      transformItems: (items) =>
        items.map((item) => ({
          ...item,
          url: item.url.replace(/\.html$/, ''),
        })),
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
        { text: 'Guide', link: '/guide/introduction' },
        { text: 'Quick Start', link: '/guide/quick-start' },
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
              { text: 'Introduction', link: '/guide/introduction' },
              { text: 'Overview', link: '/guide/overview' },
              { text: 'Installation', link: '/guide/installation' },
              { text: 'Quick Start', link: '/guide/quick-start' },
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
