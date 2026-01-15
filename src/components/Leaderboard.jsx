import { useApp } from '../context/AppContext';

export default function Leaderboard() {
  const { players, deletePlayer } = useApp();

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
              <th>Actions</th>
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
                  {player.name}
                  {isProvisional(player) && (
                    <span className="provisional-badge" title="Provisional (less than 10 games)">⭐</span>
                  )}
                </td>
                <td>
                  <span className="elo-badge">{formatELO(player.elo)}</span>
                </td>
                <td className="stat wins">{player.wins}</td>
                <td className="stat losses">{player.losses}</td>
                <td className="stat">{getWinRate(player)}</td>
                <td className="stat">{player.matchesPlayed}</td>
                <td>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${player.name}? This will also delete all their matches.`)) {
                        deletePlayer(player.id);
                      }
                    }}
                    title="Delete player"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

