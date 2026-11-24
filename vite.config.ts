import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import { apiRouter } from './src/server/router';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        const app = express();
        app.use(express.json());
        app.use('/api', apiRouter);
        server.middlewares.use(app);
      },
    },
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
