import { defineConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';

const hostname = 'https://breadc.onekuma.cn';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Breadc',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  description:
    'A command-line application framework with strong TypeScript inference, built-in help and composable commands.',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/breadc.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Breadc' }],
    ['meta', { property: 'og:image', content: `${hostname}/social.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'Breadc — a TypeScript command-line framework' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
  ],
  sitemap: { hostname },
  transformHead({ pageData, title, description }) {
    if (pageData.isNotFound) return [['meta', { name: 'robots', content: 'noindex' }]];

    const pathname = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '');
    const url = new URL(pathname, `${hostname}/`).href;

    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }]
    ];
  },
  vite: {
    plugins: [llmstxt({ excludeIndexPage: false })]
  },
  themeConfig: {
    logo: { src: '/breadc.svg', alt: 'Breadc' },
    search: { provider: 'local' },
    outline: [2, 3],
    lastUpdated: {
      formatOptions: { dateStyle: 'medium', timeZone: 'UTC' }
    },
    editLink: {
      pattern: 'https://github.com/yjl9903/Breadc/edit/main/apps/docs/:path',
      text: 'Edit this page on GitHub'
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get Started', link: '/getting-started' },
      { text: 'Examples', link: '/examples' },
      { text: 'Toolkits', link: '/toolkits/' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [{ text: 'Getting Started', link: '/getting-started' }]
      },
      {
        text: 'Examples',
        items: [{ text: 'Examples', link: '/examples' }]
      },
      {
        text: 'Toolkits',
        items: [{ text: 'Toolkits', link: '/toolkits/' }]
      }
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/yjl9903/Breadc' }]
  }
});
