import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Promisify database methods
db.run = promisify(db.run.bind(db));
db.get = promisify(db.get.bind(db));
db.all = promisify(db.all.bind(db));

// Initialize database schema
export async function initDatabase() {
  // Create players table
  await db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      elo REAL NOT NULL DEFAULT 1000.0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      matches_played INTEGER NOT NULL DEFAULT 0,
      last_played TEXT,
      rust_accumulated REAL NOT NULL DEFAULT 1.0,
      created_at TEXT NOT NULL
    )
  `);

  // Add new columns if they don't exist (for existing databases)
  try {
    await db.run(`ALTER TABLE players ADD COLUMN last_played TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await db.run(`ALTER TABLE players ADD COLUMN rust_accumulated REAL NOT NULL DEFAULT 1.0`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await db.run(`ALTER TABLE players ADD COLUMN elo REAL`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create matches table
  await db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      player1_id TEXT NOT NULL,
      player2_id TEXT NOT NULL,
      player1_name TEXT NOT NULL,
      player2_name TEXT NOT NULL,
      player1_score INTEGER NOT NULL,
      player2_score INTEGER NOT NULL,
      player1_elo_before REAL NOT NULL,
      player2_elo_before REAL NOT NULL,
      player1_elo_after REAL NOT NULL,
      player2_elo_after REAL NOT NULL,
      player1_elo_change REAL NOT NULL,
      player2_elo_change REAL NOT NULL,
      player1_rust REAL,
      player2_rust REAL,
      player1_days_inactive INTEGER,
      player2_days_inactive INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (player1_id) REFERENCES players(id),
      FOREIGN KEY (player2_id) REFERENCES players(id)
    )
  `);

  // Create indexes for better performance
  await db.run(`CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at)`);

  console.log('Database initialized successfully');
}

export default db;
