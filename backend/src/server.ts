import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow all origins so Railway/Vercel domain mismatches never cause 503s.
// Tighten this per-env once everything is working.
app.use(cors({ origin: true, credentials: true }));

// ── Stripe webhook (MUST be before express.json so raw body is preserved) ─────
import { stripeWebhook } from './controllers/stripe.controller';
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ── General body parsers ──────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Server startup ────────────────────────────────────────────────────────────
const PORT = config.port;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    // Log but do NOT exit — let the server start so Railway healthcheck passes.
    // Individual requests that need DB will fail gracefully via Prisma errors.
    console.error('⚠️  Database connection failed at startup (will retry on request):', error);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 Environment: ${config.nodeEnv}`);
    console.log(`🌐 CORS: open (all origins)`);
    console.log(`🔑 STRIPE_SECRET_KEY set: ${!!config.stripe.secretKey}`);
    console.log(`🔗 FRONTEND_URL: ${config.frontendUrl}`);
  });
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Catch unhandled promise rejections — prevent process crash
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled promise rejection:', reason);
});

startServer();

export default app;
