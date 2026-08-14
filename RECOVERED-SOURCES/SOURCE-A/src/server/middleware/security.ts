/**
 * SMS — Security & Safe Request Middleware
 */

import cors from 'cors';
import helmet from 'helmet';
import { Express } from 'express';
import { SYSTEM_CONFIG } from '../../config/index.js';

export function setupSecurityMiddleware(app: Express): void {
  // Helmet HTTP security headers (disable contentSecurityPolicy in dev for Vite iframe loading)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allowed for Vite preview iframe
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: SYSTEM_CONFIG.server.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );
}
