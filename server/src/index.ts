import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { appRouter, createContext } from './trpc';
import { initSocket } from './socket';
import { SchedulerService } from './services/scheduler.service';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 4000;

// Security & Logging Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Required for some mobile/web socket environments
}));
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Initialize Socket.io
initSocket(httpServer);

// tRPC Middleware
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'API is running', uptime: process.uptime() });
});

httpServer.listen(port, () => {
  console.log(` Server + Sockets running on http://localhost:${port}`);

  // Start Background Scheduler
  try {
    SchedulerService.init();
  } catch (err) {
    console.error('Failed to start scheduler:', err);
  }
});
