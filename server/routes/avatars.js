import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

// Get all available avatars
router.get('/available', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query(`
      SELECT id, name, emoji, rarity
      FROM avatars
      ORDER BY 
        CASE rarity
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          WHEN 'common' THEN 4
        END,
        name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching avatars:', error);
    res.status(500).json({ error: 'Failed to fetch avatars' });
  }
});

// Get player's owned avatars
router.get('/player/:playerId', async (req, res) => {
  try {
    const db = getDb();
    const { playerId } = req.params;
    
    const result = await db.query(`
      SELECT 
        a.id,
        a.name,
        a.emoji,
        a.rarity,
        pa.obtained_at as "obtainedAt"
      FROM player_avatars pa
      JOIN avatars a ON pa.avatar_id = a.id
      WHERE pa.player_id = $1
      ORDER BY 
        CASE a.rarity
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          WHEN 'common' THEN 4
        END,
        pa.obtained_at DESC
    `, [playerId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching player avatars:', error);
    res.status(500).json({ error: 'Failed to fetch player avatars' });
  }
});

// Get player's current avatar
router.get('/player/:playerId/current', async (req, res) => {
  try {
    const db = getDb();
    const { playerId } = req.params;
    
    const playerResult = await db.query('SELECT current_avatar_id FROM players WHERE id = $1', [playerId]);
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const currentAvatarId = playerResult.rows[0].current_avatar_id;
    if (!currentAvatarId) {
      return res.json(null);
    }

    const avatarResult = await db.query('SELECT id, name, emoji, rarity FROM avatars WHERE id = $1', [currentAvatarId]);
    if (avatarResult.rows.length === 0) {
      return res.json(null);
    }

    res.json(avatarResult.rows[0]);
  } catch (error) {
    console.error('Error fetching current avatar:', error);
    res.status(500).json({ error: 'Failed to fetch current avatar' });
  }
});

// Set player's current avatar
router.post('/player/:playerId/set', async (req, res) => {
  try {
    const db = getDb();
    const { playerId } = req.params;
    const { avatarId } = req.body;

    if (!avatarId) {
      return res.status(400).json({ error: 'Avatar ID is required' });
    }

    // Verify player owns this avatar
    const ownershipCheck = await db.query(
      'SELECT id FROM player_avatars WHERE player_id = $1 AND avatar_id = $2',
      [playerId, avatarId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Player does not own this avatar' });
    }

    // Update player's current avatar
    await db.query(
      'UPDATE players SET current_avatar_id = $1 WHERE id = $2',
      [avatarId, playerId]
    );

    // Get the avatar details
    const avatarResult = await db.query('SELECT id, name, emoji, rarity FROM avatars WHERE id = $1', [avatarId]);
    
    res.json(avatarResult.rows[0]);
  } catch (error) {
    console.error('Error setting avatar:', error);
    res.status(500).json({ error: 'Failed to set avatar' });
  }
});

// Open a lootbox for a player
router.post('/lootbox/open', async (req, res) => {
  try {
    const db = getDb();
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    // Check if player has lootboxes
    const playerResult = await db.query('SELECT lootboxes FROM players WHERE id = $1', [playerId]);
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const lootboxes = parseInt(playerResult.rows[0].lootboxes) || 0;
    if (lootboxes < 1) {
      return res.status(400).json({ error: 'No lootboxes available' });
    }

    // Get all avatars
    const avatarsResult = await db.query('SELECT id, name, emoji, rarity FROM avatars');
    const allAvatars = avatarsResult.rows;

    // Get avatars player already owns
    const ownedResult = await db.query(
      'SELECT avatar_id FROM player_avatars WHERE player_id = $1',
      [playerId]
    );
    const ownedIds = new Set(ownedResult.rows.map(r => r.avatar_id));

    // Filter to unowned avatars
    const unownedAvatars = allAvatars.filter(a => !ownedIds.has(a.id));

    // If player owns all avatars, allow duplicates (but less likely)
    const availableAvatars = unownedAvatars.length > 0 ? unownedAvatars : allAvatars;

    // Weighted random selection based on rarity
    const weights = {
      common: 70,
      rare: 25,
      epic: 4,
      legendary: 1
    };

    const weightedAvatars = [];
    for (const avatar of availableAvatars) {
      const weight = weights[avatar.rarity] || 1;
      for (let i = 0; i < weight; i++) {
        weightedAvatars.push(avatar);
      }
    }

    // Random selection
    const selectedAvatar = weightedAvatars[Math.floor(Math.random() * weightedAvatars.length)];

    // Check if player already owns this avatar
    const alreadyOwned = ownedIds.has(selectedAvatar.id);

    if (!alreadyOwned) {
      // Add avatar to player's collection
      const ownershipId = `${playerId}-${selectedAvatar.id}-${Date.now()}`;
      await db.query(
        'INSERT INTO player_avatars (id, player_id, avatar_id) VALUES ($1, $2, $3)',
        [ownershipId, playerId, selectedAvatar.id]
      );

      // If player has no current avatar, set this one
      const currentCheck = await db.query('SELECT current_avatar_id FROM players WHERE id = $1', [playerId]);
      if (!currentCheck.rows[0].current_avatar_id) {
        await db.query('UPDATE players SET current_avatar_id = $1 WHERE id = $2', [selectedAvatar.id, playerId]);
      }
    }

    // Decrement lootboxes
    await db.query(
      'UPDATE players SET lootboxes = GREATEST(0, lootboxes - 1) WHERE id = $1',
      [playerId]
    );

    res.json({
      avatar: selectedAvatar,
      isNew: !alreadyOwned,
      remainingLootboxes: Math.max(0, lootboxes - 1)
    });
  } catch (error) {
    console.error('Error opening lootbox:', error);
    res.status(500).json({ error: 'Failed to open lootbox' });
  }
});

// Get player's lootbox count
router.get('/lootbox/:playerId', async (req, res) => {
  try {
    const db = getDb();
    const { playerId } = req.params;
    
    const result = await db.query('SELECT lootboxes FROM players WHERE id = $1', [playerId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ lootboxes: parseInt(result.rows[0].lootboxes) || 0 });
  } catch (error) {
    console.error('Error fetching lootboxes:', error);
    res.status(500).json({ error: 'Failed to fetch lootboxes' });
  }
});

export default router;
