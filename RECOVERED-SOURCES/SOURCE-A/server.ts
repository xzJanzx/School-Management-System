/**
 * SMS — Server Entry Point
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApp } from './src/server/app.js';
import { SYSTEM_CONFIG } from './src/config/index.js';
import { logger } from './src/server/logger.js';

async function startServer() {
  const app = createApp();
  const PORT = SYSTEM_CONFIG.server.port;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`[SMS] Server started successfully on port ${PORT}`);
  });
}

startServer().catch((err) => {
  logger.error('[SMS] Server failed to start', err);
  process.exit(1);
});
