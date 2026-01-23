import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { webcrypto } from 'crypto';
import { initDatabase } from './db.js';
import playersRouter from './routes/players.js';
import matchesRouter from './routes/matches.js';

// Ensure crypto is available globally for Azure SDK (required for @azure/storage-blob)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}

// Import scheduler only if backups are explicitly enabled
let schedulerModule = null;
if (process.env.ENABLE_BACKUPS === 'true' && process.env.AZURE_STORAGE_CONNECTION_STRING) {
  import('./scheduler.js')
    .then((module) => {
      schedulerModule = module;
      console.log('Backup scheduler started');
    })
    .catch((error) => {
      console.error('Failed to start backup scheduler:', error);
      // Don't fail the app if scheduler fails to start
    });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize database (connects to PostgreSQL)
  await initDatabase();

  // Run startup backup after database is initialized
  if (schedulerModule && schedulerModule.runStartupBackup) {
    await schedulerModule.runStartupBackup();
  }

  // API Routes
  app.use('/api/players', playersRouter);
  app.use('/api/matches', matchesRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve static files from React app in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));

    // Serve React app for all non-API routes (SPA routing)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    if (process.env.NODE_ENV === 'production') {
      console.log('Serving React app from /dist');
    }
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
