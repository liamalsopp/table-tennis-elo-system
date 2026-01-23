import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from './Avatar';

export default function Leaderboard() {
  const { players, refreshData, refreshTrigger } = useApp();
  const [playerAvatars, setPlayerAvatars] = useState({});

  const API_BASE_URL = import.meta.env.VITE_API_URL || 
    (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api');

  // Load avatars for all players - refresh when players change or refreshTrigger changes
  useEffect(() => {
    const loadAvatars = async () => {
      const avatarPromises = players.map(async (player) => {
        try {
          const res = await fetch(`${API_BASE_URL}/avatars/player/${player.id}/current`);
          if (res.ok) {
            const avatar = await res.json();
            return { playerId: player.id, avatar };
          }
        } catch (error) {
          console.error(`Error loading avatar for ${player.id}:`, error);
        }
        return { playerId: player.id, avatar: null };
      });

      const results = await Promise.all(avatarPromises);
      const avatarMap = {};
      results.forEach(({ playerId, avatar }) => {
        avatarMap[playerId] = avatar;
      });
      setPlayerAvatars(avatarMap);
    };

    if (players.length > 0) {
      loadAvatars();
    }
  }, [players, refreshTrigger]);

  if (players.length === 0) {
    return (
      <div className="card">
        <h2>Leaderboard</h2>
        <p className="empty-state">No players yet. Add players to see the leaderboard!</p>
      </div>
    );
  }

  const getRankColor = (rank) => {
    if (rank === 1) return '#gold';
    if (rank === 2) return '#silver';
    if (rank === 3) return '#cd7f32';
    return '';
  };

  const getWinRate = (player) => {
    if (player.matchesPlayed === 0) return '0%';
    return ((player.wins / player.matchesPlayed) * 100).toFixed(1) + '%';
  };

  const isProvisional = (player) => {
    return player.matchesPlayed < 10;
  };

  const formatELO = (elo) => {
    return typeof elo === 'number' ? elo.toFixed(1) : elo;
  };

  return (
    <div className="card">
      <h2>🏆 Leaderboard</h2>
      <div className="leaderboard-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>ELO</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Win Rate</th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.id} className={index < 3 ? 'top-three' : ''}>
                <td>
                  <span 
                    className="rank-badge" 
                    style={{ color: getRankColor(index + 1) }}
                  >
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </span>
                </td>
                <td className="player-name">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Avatar avatar={playerAvatars[player.id]} size="small" />
                    {player.name}
                    {isProvisional(player) && (
                      <span className="provisional-badge" title="Provisional (less than 10 games)">⭐</span>
                    )}
                    {player.lootboxes > 0 && (
                      <span className="lootbox-badge" title={`${player.lootboxes} lootbox${player.lootboxes !== 1 ? 'es' : ''} available`}>
                        📦{player.lootboxes}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="elo-badge">{formatELO(player.elo)}</span>
                </td>
                <td className="stat wins">{player.wins}</td>
                <td className="stat losses">{player.losses}</td>
                <td className="stat">{getWinRate(player)}</td>
                <td className="stat">{player.matchesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

