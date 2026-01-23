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

  // Add lootboxes column to players table
  try {
    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS lootboxes INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS current_avatar_id VARCHAR(255)`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create avatars table (available cosmetics)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS avatars (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      emoji VARCHAR(10) NOT NULL,
      rarity VARCHAR(20) NOT NULL DEFAULT 'common',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create player_avatars table (which avatars each player owns)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_avatars (
      id VARCHAR(255) PRIMARY KEY,
      player_id VARCHAR(255) NOT NULL,
      avatar_id VARCHAR(255) NOT NULL,
      obtained_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (avatar_id) REFERENCES avatars(id) ON DELETE CASCADE,
      UNIQUE(player_id, avatar_id)
    )
  `);

  // Create indexes for avatars
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_avatars_player ON player_avatars(player_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_avatars_avatar ON player_avatars(avatar_id)`);

  // Seed default avatars if table is empty
  const avatarCount = await pool.query('SELECT COUNT(*) as count FROM avatars');
  if (parseInt(avatarCount.rows[0].count) === 0) {
    const defaultAvatars = [
      // Common avatars (70% chance)
      { id: '1', name: 'Ping Pong Ball', emoji: '🏓', rarity: 'common' },
      { id: '2', name: 'Trophy', emoji: '🏆', rarity: 'common' },
      { id: '3', name: 'Medal', emoji: '🥇', rarity: 'common' },
      { id: '4', name: 'Fire', emoji: '🔥', rarity: 'common' },
      { id: '5', name: 'Star', emoji: '⭐', rarity: 'common' },
      { id: '6', name: 'Rocket', emoji: '🚀', rarity: 'common' },
      { id: '7', name: 'Lightning', emoji: '⚡', rarity: 'common' },
      { id: '8', name: 'Crown', emoji: '👑', rarity: 'common' },
      // Rare avatars (25% chance)
      { id: '9', name: 'Diamond', emoji: '💎', rarity: 'rare' },
      { id: '10', name: 'Trophy Gold', emoji: '🥇', rarity: 'rare' },
      { id: '11', name: 'Trophy Silver', emoji: '🥈', rarity: 'rare' },
      { id: '12', name: 'Trophy Bronze', emoji: '🥉', rarity: 'rare' },
      { id: '13', name: 'Comet', emoji: '☄️', rarity: 'rare' },
      // Epic avatars (4% chance)
      { id: '14', name: 'Rainbow', emoji: '🌈', rarity: 'epic' },
      { id: '15', name: 'Trophy Epic', emoji: '🏅', rarity: 'epic' },
      { id: '16', name: 'Sparkles', emoji: '✨', rarity: 'epic' },
      // Legendary avatars (1% chance)
      { id: '17', name: 'Golden Crown', emoji: '👑', rarity: 'legendary' },
      { id: '18', name: 'Champion', emoji: '🏆', rarity: 'legendary' },
    ];

    for (const avatar of defaultAvatars) {
      await pool.query(
        `INSERT INTO avatars (id, name, emoji, rarity) VALUES ($1, $2, $3, $4)`,
        [avatar.id, avatar.name, avatar.emoji, avatar.rarity]
      );
    }
    console.log(`Seeded ${defaultAvatars.length} default avatars`);
  }

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
