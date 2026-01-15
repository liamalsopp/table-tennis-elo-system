import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get all players
router.get('/', async (req, res) => {
  try {
    const players = await db.all(`
      SELECT 
        id,
        name,
        elo,
        wins,
        losses,
        matches_played as matchesPlayed,
        last_played as lastPlayed,
        rust_accumulated as rustAccumulated,
        created_at as createdAt
      FROM players
      ORDER BY elo DESC
    `);
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Add a new player
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Check if player already exists
    const existing = await db.get('SELECT id FROM players WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'A player with this name already exists' });
    }

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    await db.run(
      `INSERT INTO players (id, name, elo, wins, losses, matches_played, last_played, rust_accumulated, created_at)
       VALUES (?, ?, 1000.0, 0, 0, 0, NULL, 1.0, ?)`,
      [id, name.trim(), createdAt]
    );

    const player = await db.get(`
      SELECT 
        id,
        name,
        elo,
        wins,
        losses,
        matches_played as matchesPlayed,
        last_played as lastPlayed,
        rust_accumulated as rustAccumulated,
        created_at as createdAt
      FROM players
      WHERE id = ?
    `, [id]);

    res.status(201).json(player);
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Failed to add player' });
  }
});

// Delete a player
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all matches involving this player
    await db.run('DELETE FROM matches WHERE player1_id = ? OR player2_id = ?', [id, id]);

    // Delete the player
    const result = await db.run('DELETE FROM players WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

export default router;
