import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://reading.1mether.me',
  trailingSlash: 'ignore',
  // VITE_CACHE_DIR：沙盒/CI 环境无法写 node_modules/.vite 时可重定向缓存，本机不受影响
  vite: process.env.VITE_CACHE_DIR ? { cacheDir: process.env.VITE_CACHE_DIR } : {},
});
