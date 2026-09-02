import app from './app.js';
import env from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';

async function start() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`RoomMates API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    console.log(`Health check:  http://localhost:${env.PORT}/api/health`);
  });

  /**
   * Close the HTTP server and the database connection before exiting, so
   * in-flight requests finish and Mongo isn't left with a dangling connection.
   */
  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down…`);

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    // Don't hang forever if a connection refuses to close.
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// A failure that escapes here means the process is in an unknown state — log
// loudly and exit rather than serving requests we can't reason about.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
