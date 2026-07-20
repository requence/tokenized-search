import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: { fs: { allow: ['..'] } },
    resolve: {
      alias: {
        '@requence/tokenized-search': resolve(__dirname, '../src/index.ts'),
      },
      dedupe: ['react', 'react-dom'],
    },
  },
  // Explicit `gfm: true` is required for @astrojs/mdx on Astro ≥6.4 — the
  // schema changed from `.default(true)` to `.optional()`, so `config.markdown.gfm`
  // is `undefined` unless set, and the MDX plugin treats `undefined` as falsy.
  // The deprecation warning is harmless; remove once @astrojs/mdx fixes this.
  markdown: { gfm: true },
  integrations: [
    react(),
    starlight({
      title: 'Tokenized Search',
      logo: { src: './public/requence-wordmark.svg', replacesTitle: false },
      favicon: '/logo.svg',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/requence/tokenized-search',
        },
      ],
      expressiveCode: {
        themes: ['dark-plus'],
        styleOverrides: {
          borderColor: 'var(--color-zinc-700)',
          borderRadius: '0.375rem',
          codeBackground: '#09090b',
        },
      },
      customCss: ['./src/styles/custom.css'],
      components: {
        PageFrame: './src/components/overrides/PageFrame.astro',
        ThemeSelect: './src/components/overrides/ThemeSelect.astro',
      },
      sidebar: [
        {
          label: 'Concepts',
          items: [
            { label: 'Getting Started', slug: 'concepts/01-getting-started' },
            { label: 'Token Definitions', slug: 'concepts/02-token-definitions' },
            { label: 'Query Parsing', slug: 'concepts/03-query-parsing' },
            { label: 'Boolean Operators', slug: 'concepts/05-boolean-operators' },
            { label: 'Styling', slug: 'concepts/04-styling' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'TokenizedSearch', slug: 'reference/01-tokenized-search' },
            { label: 'Parser Utilities', slug: 'reference/02-parser-utilities' },
            { label: 'Translation', slug: 'reference/03-translation' },
          ],
        },
      ],
    }),
  ],
})
