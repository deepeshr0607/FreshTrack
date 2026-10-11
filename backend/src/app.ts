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
import { randomUUID } from 'node:crypto';
import { InvalidApiInput, sendFailure } from './lib/api';

import { healthRouter } from './routes/health';
import { createAuthRouter } from './routes/auth';
import { createHouseholdRouter } from './routes/households';
import type { HouseholdService } from './services/households';
import { createIdentityVerifier, type VerifyIdentity } from './services/auth';

// ── Environment ──────────────────────────────────────────────────────────────

// ── App factory ──────────────────────────────────────────────────────────────

export function createApp(options: { verifyIdentity?: VerifyIdentity; householdService?: HouseholdService } = {}): express.Application {
  const app = express();
  const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '').split(',').map((o) => o.trim()).filter(Boolean);

  // Trust proxy headers from Vercel / reverse proxies
  app.set('trust proxy', 1);

  // Generate correlation before parsing/CORS so every failure has a server-owned request ID.
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.headers['x-request-id'] = randomUUID();
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    next();
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(Object.assign(new Error('Origin is not allowed.'), { status: 403, code: 'CORS_REJECTED' }));
      },
      credentials: true,
    }),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Request ID ────────────────────────────────────────────────────────────
  // Assigned above, before any middleware can reject the request.

  // ── Global rate limit ─────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => sendFailure(req, res, 429, 'RATE_LIMITED', 'Too many requests — please slow down.'),
    }),
  );

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/v1', healthRouter);
  const verifyIdentity = options.verifyIdentity ?? createIdentityVerifier(process.env['NEON_AUTH_URL']);
  app.use('/api/v1', createAuthRouter(verifyIdentity));
  app.use('/api/v1', createHouseholdRouter(verifyIdentity, options.householdService));

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    sendFailure(req, res, 404, 'NOT_FOUND', 'The requested endpoint does not exist.');
  });

  // ── Global error handler ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.headers['x-request-id'];
    const suppliedStatus = (err as { status?: number }).status;
    const status = err instanceof InvalidApiInput ? 400 : typeof suppliedStatus === 'number' && suppliedStatus >= 400 && suppliedStatus <= 599 ? suppliedStatus : 500;
    const code = err instanceof InvalidApiInput ? 'INVALID_REQUEST' : (err as { code?: string }).code === 'CORS_REJECTED' ? 'CORS_REJECTED'
      : status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';

    // Do NOT log the full error in production to avoid leaking stack traces.
    // The same redaction applies in development: parser errors can contain raw request bodies.
    console.error(JSON.stringify({ level: 'error', event: 'request_failed', requestId, status, code }));

    sendFailure(req, res, status, code, status === 500 ? 'An unexpected error occurred.' : 'The request could not be processed.');
  });

  return app;
}
