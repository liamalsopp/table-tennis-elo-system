import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

// Get all players
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query(`
      SELECT 
        id,
        name,
        elo,
        wins,
        losses,
        matches_played as "matchesPlayed",
        last_played as "lastPlayed",
        rust_accumulated as "rustAccumulated",
        created_at as "createdAt",
        lootboxes,
        current_avatar_id as "currentAvatarId"
      FROM players
      ORDER BY elo DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Add a new player
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Check if player already exists
    const existing = await db.query('SELECT id FROM players WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A player with this name already exists' });
    }

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    await db.query(
      `INSERT INTO players (id, name, elo, wins, losses, matches_played, last_played, rust_accumulated, created_at, lootboxes)
       VALUES ($1, $2, 1000.0, 0, 0, 0, NULL, 1.0, $3, 0)`,
      [id, name.trim(), createdAt]
    );

    const result = await db.query(`
      SELECT 
        id,
        name,
        elo,
        wins,
        losses,
        matches_played as "matchesPlayed",
        last_played as "lastPlayed",
        rust_accumulated as "rustAccumulated",
        created_at as "createdAt",
        lootboxes,
        current_avatar_id as "currentAvatarId"
      FROM players
      WHERE id = $1
    `, [id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Failed to add player' });
  }
});

// Delete a player
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // Delete all matches involving this player (CASCADE will handle this, but being explicit)
    await db.query('DELETE FROM matches WHERE player1_id = $1 OR player2_id = $1', [id]);

    // Delete the player
    const result = await db.query('DELETE FROM players WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

export default router;
