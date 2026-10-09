/**
 * server.ts — HTTP server entry-point.
 *
 * Calls createApp() and starts listening. Keep side-effects (listen, signal
 * handling) here so that app.ts can be imported by tests without binding a port.
 */

import { createApp } from './app';

const PORT = Number(process.env['PORT'] ?? 3001);

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`[server] FreshTrack API listening on http://localhost:${PORT}`);
  console.log(`[server] Health endpoint: http://localhost:${PORT}/api/v1/health`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 s if still pending
  setTimeout(() => {
    console.error('[server] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
