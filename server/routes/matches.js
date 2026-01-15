import express from 'express';
import db from '../db.js';
import { calculateRatingChanges, decayRust } from '../utils/elo.js';

const router = express.Router();

// Get all matches
router.get('/', async (req, res) => {
  try {
    const matches = await db.all(`
      SELECT 
        id,
        player1_id as player1Id,
        player2_id as player2Id,
        player1_name as player1Name,
        player2_name as player2Name,
        player1_score as player1Score,
        player2_score as player2Score,
        player1_elo_before as player1ELOBefore,
        player2_elo_before as player2ELOBefore,
        player1_elo_after as player1ELOAfter,
        player2_elo_after as player2ELOAfter,
        player1_elo_change as player1ELOChange,
        player2_elo_change as player2ELOChange,
        player1_rust as player1Rust,
        player2_rust as player2Rust,
        player1_days_inactive as player1DaysInactive,
        player2_days_inactive as player2DaysInactive,
        created_at as createdAt
      FROM matches
      ORDER BY created_at DESC
    `);
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Add a new match
router.post('/', async (req, res) => {
  try {
    const { player1Id, player2Id, player1Score, player2Score } = req.body;

    // Validation
    if (!player1Id || !player2Id) {
      return res.status(400).json({ error: 'Both players are required' });
    }

    if (player1Id === player2Id) {
      return res.status(400).json({ error: 'A player cannot play against themselves' });
    }

    const score1 = parseInt(player1Score);
    const score2 = parseInt(player2Score);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      return res.status(400).json({ error: 'Please enter valid scores (non-negative numbers)' });
    }

    if (score1 === score2) {
      return res.status(400).json({ error: 'Scores cannot be equal (one player must win)' });
    }

    // Get players with all fields
    const player1 = await db.get('SELECT * FROM players WHERE id = ?', [player1Id]);
    const player2 = await db.get('SELECT * FROM players WHERE id = ?', [player2Id]);

    if (!player1 || !player2) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Determine winner
    const isPlayer1Winner = score1 > score2;
    const winner = isPlayer1Winner ? player1 : player2;
    const loser = isPlayer1Winner ? player2 : player1;
    const winnerScore = isPlayer1Winner ? score1 : score2;
    const loserScore = isPlayer1Winner ? score2 : score1;

    const matchDate = new Date().toISOString();

    // Calculate rating changes using advanced algorithm
    const changes = calculateRatingChanges(
      winner.elo,
      loser.elo,
      winnerScore,
      loserScore,
      winner.matches_played,
      loser.matches_played,
      winner.last_played,
      loser.last_played,
      winner.rust_accumulated || 1.0,
      loser.rust_accumulated || 1.0,
      matchDate
    );

    // Calculate new ratings
    const winnerNewRating = winner.elo + changes.winnerChange;
    const loserNewRating = loser.elo + changes.loserChange;

    // Update winner
    const winnerNewRust = decayRust(changes.newWinnerRust);
    await db.run(
      `UPDATE players 
       SET elo = ?, 
           wins = wins + 1,
           matches_played = matches_played + 1,
           last_played = ?,
           rust_accumulated = ?
       WHERE id = ?`,
      [winnerNewRating, matchDate, winnerNewRust, winner.id]
    );

    // Update loser
    const loserNewRust = decayRust(changes.newLoserRust);
    await db.run(
      `UPDATE players 
       SET elo = ?, 
           losses = losses + 1,
           matches_played = matches_played + 1,
           last_played = ?,
           rust_accumulated = ?
       WHERE id = ?`,
      [loserNewRating, matchDate, loserNewRust, loser.id]
    );

    // Create match record
    const matchId = Date.now().toString();

    // Store match data with player1/player2 order preserved
    await db.run(
      `INSERT INTO matches (
        id, player1_id, player2_id, player1_name, player2_name,
        player1_score, player2_score,
        player1_elo_before, player2_elo_before,
        player1_elo_after, player2_elo_after,
        player1_elo_change, player2_elo_change,
        player1_rust, player2_rust,
        player1_days_inactive, player2_days_inactive,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matchId, player1Id, player2Id, player1.name, player2.name,
        score1, score2,
        player1.elo, player2.elo,
        isPlayer1Winner ? winnerNewRating : loserNewRating,
        isPlayer1Winner ? loserNewRating : winnerNewRating,
        isPlayer1Winner ? changes.winnerChange : changes.loserChange,
        isPlayer1Winner ? changes.loserChange : changes.winnerChange,
        isPlayer1Winner ? changes.winnerRust : changes.loserRust,
        isPlayer1Winner ? changes.loserRust : changes.winnerRust,
        isPlayer1Winner ? changes.winnerDaysInactive : changes.loserDaysInactive,
        isPlayer1Winner ? changes.loserDaysInactive : changes.winnerDaysInactive,
        matchDate
      ]
    );

    // Return the created match
    const match = await db.get(`
      SELECT 
        id,
        player1_id as player1Id,
        player2_id as player2Id,
        player1_name as player1Name,
        player2_name as player2Name,
        player1_score as player1Score,
        player2_score as player2Score,
        player1_elo_before as player1ELOBefore,
        player2_elo_before as player2ELOBefore,
        player1_elo_after as player1ELOAfter,
        player2_elo_after as player2ELOAfter,
        player1_elo_change as player1ELOChange,
        player2_elo_change as player2ELOChange,
        player1_rust as player1Rust,
        player2_rust as player2Rust,
        player1_days_inactive as player1DaysInactive,
        player2_days_inactive as player2DaysInactive,
        created_at as createdAt
      FROM matches
      WHERE id = ?
    `, [matchId]);

    res.status(201).json(match);
  } catch (error) {
    console.error('Error adding match:', error);
    res.status(500).json({ error: 'Failed to add match' });
  }
});

// Delete a match
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the match to delete
    const match = await db.get('SELECT * FROM matches WHERE id = ?', [id]);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Delete the match
    await db.run('DELETE FROM matches WHERE id = ?', [id]);

    // Recalculate all ELO ratings from scratch
    // Reset all players
    await db.run(`
      UPDATE players 
      SET elo = 1000.0, 
          wins = 0, 
          losses = 0, 
          matches_played = 0,
          last_played = NULL,
          rust_accumulated = 1.0
    `);

    // Get all remaining matches in chronological order
    const allMatches = await db.all('SELECT * FROM matches ORDER BY created_at ASC');

    // Replay all matches using the new algorithm
    for (const m of allMatches) {
      const p1 = await db.get('SELECT * FROM players WHERE id = ?', [m.player1_id]);
      const p2 = await db.get('SELECT * FROM players WHERE id = ?', [m.player2_id]);

      if (p1 && p2) {
        const isP1Winner = m.player1_score > m.player2_score;
        const winner = isP1Winner ? p1 : p2;
        const loser = isP1Winner ? p2 : p1;
        const winnerScore = isP1Winner ? m.player1_score : m.player2_score;
        const loserScore = isP1Winner ? m.player2_score : m.player1_score;

        const changes = calculateRatingChanges(
          winner.elo,
          loser.elo,
          winnerScore,
          loserScore,
          winner.matches_played,
          loser.matches_played,
          winner.last_played,
          loser.last_played,
          winner.rust_accumulated || 1.0,
          loser.rust_accumulated || 1.0,
          m.created_at
        );

        const winnerNewRating = winner.elo + changes.winnerChange;
        const loserNewRating = loser.elo + changes.loserChange;
        const winnerNewRust = decayRust(changes.newWinnerRust);
        const loserNewRust = decayRust(changes.newLoserRust);

        // Update winner
        await db.run(
          `UPDATE players 
           SET elo = ?, 
               wins = wins + 1,
               matches_played = matches_played + 1,
               last_played = ?,
               rust_accumulated = ?
           WHERE id = ?`,
          [winnerNewRating, m.created_at, winnerNewRust, winner.id]
        );

        // Update loser
        await db.run(
          `UPDATE players 
           SET elo = ?, 
               losses = losses + 1,
               matches_played = matches_played + 1,
               last_played = ?,
               rust_accumulated = ?
           WHERE id = ?`,
          [loserNewRating, m.created_at, loserNewRust, loser.id]
        );
      }
    }

    res.json({ message: 'Match deleted and ELO ratings recalculated' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

export default router;
