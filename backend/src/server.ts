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
  console.info(JSON.stringify({ level: 'info', event: 'server_started', port: PORT }));
  console.info(JSON.stringify({ level: 'info', event: 'health_endpoint', path: '/api/v1/health' }));
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.info(JSON.stringify({ level: 'info', event: 'shutdown_requested', signal }));
  server.close(() => {
    console.info(JSON.stringify({ level: 'info', event: 'server_closed' }));
    process.exit(0);
  });

  // Force exit after 10 s if still pending
  setTimeout(() => {
    console.error(JSON.stringify({ level: 'error', event: 'shutdown_timeout' }));
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
