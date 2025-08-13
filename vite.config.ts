import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: { // Added server configuration
        proxy: {
          '/sitemap-proxy': { // This will be the new path in our app
            target: 'https://oneclickseo.com', // The actual target
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/sitemap-proxy/, ''), // Remove the proxy prefix
            secure: false, // For HTTPS targets
          }
        }
      }
    };
});
