import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.ts';
import { db } from './server/db.ts';
import { describeStore } from './server/firestoreStore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Load the database before accepting any request
  const source = await db.init();
  console.log(`Database: ${describeStore()}, loaded from ${source}`);

  // Cloud Run sends SIGTERM before stopping an instance: write any pending changes first
  const shutdown = async () => {
    await db.flush();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Serve static generated images if requested directly
  app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images')));

  // Start listening immediately so Nginx never sees 502 ECONNREFUSED during Vite startup
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RENTZ application server running at http://0.0.0.0:${PORT}`);
  });

  // In development, hook up Vite dev server middlewares
  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = (async () => {
      const { createServer: createViteServer } = await import('vite');
      return createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
          watch: null,
        },
        appType: 'spa',
      });
    })();

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

startServer().catch((err) => {
  console.error('Failed to start RentTanzania server:', err);
  process.exit(1);
});

