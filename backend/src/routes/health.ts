/**
 * routes/health.ts — /api/v1/health endpoint.
 *
 * Returns a simple JSON payload so that:
 *  - Local development can confirm the server is running.
 *  - Vercel health checks can confirm the function is deployed.
 *  - Future readiness checks can extend this with a database ping.
 *
 * No authentication required. Never expose secrets or internal state here.
 */

import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      status: 'ok',
      service: 'freshtrack-api',
      timestamp: new Date().toISOString(),
      environment: process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'unknown',
    },
  });
});
