import mongoose from 'mongoose';
import env from './env.js';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Human-readable connection state, used by the health endpoint.
 */
export function getConnectionState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] ?? 'unknown';
}

/**
 * Connect to MongoDB, retrying with backoff.
 *
 * A dev machine often starts the API before the local mongod is fully up, and a
 * hosted database can briefly refuse connections during a restart. Retrying
 * turns both into a short pause instead of a crash loop.
 */
export async function connectDatabase() {
  // Reject queries against fields that aren't in the schema rather than silently
  // dropping them — important once expense splits are being written.
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });

      console.log(`MongoDB connected → ${mongoose.connection.name}`);
      break;
    } catch (error) {
      const isLastAttempt = attempt === MAX_ATTEMPTS;

      if (isLastAttempt) {
        console.error(`MongoDB connection failed after ${MAX_ATTEMPTS} attempts.`);
        console.error(error.message);
        throw error;
      }

      const delay = BASE_DELAY_MS * attempt;
      console.warn(
        `MongoDB connection attempt ${attempt}/${MAX_ATTEMPTS} failed, retrying in ${delay}ms…`,
      );
      await sleep(delay);
    }
  }

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
  console.log('MongoDB connection closed.');
}
