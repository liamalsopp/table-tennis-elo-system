import pg from 'pg';
const { Pool } = pg;

let pool = null;

// Create PostgreSQL connection pool
function createPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'tabletennis'}:${process.env.DB_PASSWORD || 'changeme'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'tabletennis'}`;

  console.log('Connecting to PostgreSQL database...');
  console.log(`Database host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`Database name: ${process.env.DB_NAME || 'tabletennis'}`);

  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

// Initialize database schema
export async function initDatabase() {
  // Create connection pool
  if (!pool) {
    createPool();
  }

  // Test connection
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    throw error;
  }

  // Check if database has existing data
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM players');
    console.log('Existing players in database:', parseInt(result.rows[0].count) || 0);
  } catch (e) {
    console.log('Database is new or tables do not exist yet');
  }

  // Create players table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      elo DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      matches_played INTEGER NOT NULL DEFAULT 0,
      last_played TIMESTAMP,
      rust_accumulated DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add new columns if they don't exist (for existing databases)
  try {
    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS last_played TIMESTAMP`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS rust_accumulated DOUBLE PRECISION NOT NULL DEFAULT 1.0`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await pool.query(`ALTER TABLE players ALTER COLUMN elo TYPE DOUBLE PRECISION`);
  } catch (e) {
    // Column type already correct, ignore
  }

  // Create matches table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id VARCHAR(255) PRIMARY KEY,
      player1_id VARCHAR(255) NOT NULL,
      player2_id VARCHAR(255) NOT NULL,
      player1_name VARCHAR(255) NOT NULL,
      player2_name VARCHAR(255) NOT NULL,
      player1_score INTEGER NOT NULL,
      player2_score INTEGER NOT NULL,
      player1_elo_before DOUBLE PRECISION NOT NULL,
      player2_elo_before DOUBLE PRECISION NOT NULL,
      player1_elo_after DOUBLE PRECISION NOT NULL,
      player2_elo_after DOUBLE PRECISION NOT NULL,
      player1_elo_change DOUBLE PRECISION NOT NULL,
      player2_elo_change DOUBLE PRECISION NOT NULL,
      player1_rust DOUBLE PRECISION,
      player2_rust DOUBLE PRECISION,
      player1_days_inactive INTEGER,
      player2_days_inactive INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player1_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (player2_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at)`);

  // Final check - show what's in the database
  try {
    const playerResult = await pool.query('SELECT COUNT(*) as count FROM players');
    const matchResult = await pool.query('SELECT COUNT(*) as count FROM matches');
    console.log('✅ Database initialized successfully');
    console.log(`   Players: ${parseInt(playerResult.rows[0].count) || 0}`);
    console.log(`   Matches: ${parseInt(matchResult.rows[0].count) || 0}`);
  } catch (e) {
    console.log('Database initialized (unable to read counts)');
  }
}

// Export a getter function to ensure pool is initialized
export function getDb() {
  if (!pool) {
    createPool();
  }
  return pool;
}

// Close pool gracefully
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export default pool;
