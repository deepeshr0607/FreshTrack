/**
 * app.ts — Express application factory.
 *
 * Wires together middleware and routes without starting the HTTP server.
 * The server entry-point (server.ts) calls createApp() and calls listen().
 * Keeping them separate makes the app importable by tests without binding a port.
 */

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { healthRouter } from './routes/health';

// ── Environment ──────────────────────────────────────────────────────────────

const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// ── App factory ──────────────────────────────────────────────────────────────

export function createApp(): express.Application {
  const app = express();

  // Trust proxy headers from Vercel / reverse proxies
  app.set('trust proxy', 1);

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      },
      credentials: true,
    }),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Request ID ────────────────────────────────────────────────────────────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.headers['x-request-id'] =
      req.headers['x-request-id'] ??
      `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    next();
  });

  // ── Global rate limit ─────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests — please slow down.' } },
    }),
  );

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/v1', healthRouter);

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
    });
  });

  // ── Global error handler ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.headers['x-request-id'];
    const status = (err as { status?: number }).status ?? 500;

    // Do NOT log the full error in production to avoid leaking stack traces.
    if (process.env['NODE_ENV'] !== 'production') {
      console.error(`[error] ${requestId}`, err);
    } else {
      console.error(`[error] ${requestId} ${err.message}`);
    }

    res.status(status).json({
      error: {
        code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message: status === 500 ? 'An unexpected error occurred.' : err.message,
        requestId,
      },
    });
  });

  return app;
}
