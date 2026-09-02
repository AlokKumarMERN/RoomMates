import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import routes from './routes/index.js';
import ApiError from './utils/ApiError.js';

const app = express();

// Trust the first proxy so rate limiting sees real client IPs once deployed
// behind a platform load balancer.
app.set('trust proxy', 1);

// Secure HTTP headers.
app.use(helmet());

// Only our own frontend may call the API, and it must be able to send the
// Authorization header. Origins come from CLIENT_URL (comma-separated).
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests and tools like curl send no Origin header.
      if (!origin) return callback(null, true);
      if (env.allowedOrigins.includes(origin)) return callback(null, true);

      // An ApiError, not a plain Error: a blocked origin is an expected
      // condition, so it should return 403 in the standard envelope rather than
      // being logged and reported as a 500 server fault.
      return callback(
        ApiError.forbidden(`Origin not allowed by CORS: ${origin}`, 'CORS_ORIGIN_DENIED'),
      );
    },
    credentials: true,
  }),
);

// A shared expense payload is small; a low limit is one less thing to abuse.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

if (!env.isProduction && !env.isTest) {
  app.use(morgan('dev'));
}

app.use('/api', routes);

// Order matters: unmatched routes first, then the error handler last.
app.use(notFound);
app.use(errorHandler);

export default app;
