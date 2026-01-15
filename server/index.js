import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import playersRouter from './routes/players.js';
import matchesRouter from './routes/matches.js';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Initialize database
  await initDatabase();

  // Routes
  app.use('/api/players', playersRouter);
  app.use('/api/matches', matchesRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
