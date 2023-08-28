import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Breadc',
  description:
    'Yet another Command Line Application Framework with fully TypeScript support',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/examples' },
      { text: 'Toolkits', link: '/toolkits/' }
    ],
    sidebar: [
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
