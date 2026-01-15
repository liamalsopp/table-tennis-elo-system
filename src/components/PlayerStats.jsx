import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function PlayerStats() {
  const { players, matches } = useApp();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [ratingHistory, setRatingHistory] = useState([]);

  useEffect(() => {
    if (!selectedPlayerId) {
      setRatingHistory([]);
      return;
    }

    // Get all matches for this player in chronological order
    const playerMatches = matches
      .filter(m => m.player1Id === selectedPlayerId || m.player2Id === selectedPlayerId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Build rating history
    const history = [];
    const player = players.find(p => p.id === selectedPlayerId);
    
    if (!player) return;

    // Starting rating (1000 for new players, or first match rating)
    let currentRating = 1000.0;
    
    // Add initial point
    if (playerMatches.length > 0) {
      const firstMatch = playerMatches[0];
      const wasPlayer1 = firstMatch.player1Id === selectedPlayerId;
      currentRating = wasPlayer1 ? firstMatch.player1ELOBefore : firstMatch.player2ELOBefore;
      history.push({
        date: new Date(firstMatch.createdAt),
        rating: currentRating,
        match: firstMatch,
      });
    }

    // Add each match's rating change
    playerMatches.forEach(match => {
      const wasPlayer1 = match.player1Id === selectedPlayerId;
      const ratingAfter = wasPlayer1 ? match.player1ELOAfter : match.player2ELOAfter;
      
      history.push({
        date: new Date(match.createdAt),
        rating: ratingAfter,
        match: match,
      });
    });

    // Add current rating if player has matches
    if (playerMatches.length > 0) {
      history.push({
        date: new Date(),
        rating: player.elo,
        match: null,
      });
    }

    setRatingHistory(history);
  }, [selectedPlayerId, players, matches]);

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  const renderChart = () => {
    if (ratingHistory.length === 0) return null;

    const ratings = ratingHistory.map(h => h.rating);
    const minRating = Math.min(...ratings) - 50;
    const maxRating = Math.max(...ratings) + 50;
    const range = maxRating - minRating;

    // Chart dimensions
    const chartWidth = 800;
    const chartHeight = 400;
    const padding = 40;
    const plotWidth = chartWidth - (padding * 2);
    const plotHeight = chartHeight - (padding * 2);

    const points = ratingHistory.map((point, index) => {
      const x = padding + (index / (ratingHistory.length - 1)) * plotWidth;
      const y = padding + plotHeight - ((point.rating - minRating) / range) * plotHeight;
      return { x, y, ...point };
    });

    // Create path for line
    const pathData = points.map((p, i) => 
      i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    ).join(' ');

    return (
      <div className="chart-container">
        <svg 
          width={chartWidth} 
          height={chartHeight} 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="rating-chart"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = padding + plotHeight - (ratio * plotHeight);
            const rating = minRating + (ratio * range);
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#666"
                >
                  {rating.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#667eea"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#667eea"
                stroke="white"
                strokeWidth="2"
              />
              {point.match && (
                <title>
                  {new Date(point.match.createdAt).toLocaleDateString()}: {point.rating.toFixed(1)} ELO
                  {'\n'}vs {point.match.player1Id === selectedPlayerId ? point.match.player2Name : point.match.player1Name}
                  {'\n'}Score: {point.match.player1Id === selectedPlayerId 
                    ? `${point.match.player1Score}-${point.match.player2Score}`
                    : `${point.match.player2Score}-${point.match.player1Score}`
                  }
                </title>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="card">
      <h2>📈 Player Statistics</h2>
      
      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label>Select Player</label>
        <select
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          className="select"
        >
          <option value="">Select a player...</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} ({typeof player.elo === 'number' ? player.elo.toFixed(1) : player.elo} ELO)
            </option>
          ))}
        </select>
      </div>

      {selectedPlayer && (
        <div className="player-stats-container">
          <div className="player-summary">
            <h3>{selectedPlayer.name}</h3>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Current ELO</div>
                <div className="stat-value-large">
                  {typeof selectedPlayer.elo === 'number' ? selectedPlayer.elo.toFixed(1) : selectedPlayer.elo}
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Matches Played</div>
                <div className="stat-value-large">{selectedPlayer.matchesPlayed || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Wins</div>
                <div className="stat-value-large wins">{selectedPlayer.wins || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Losses</div>
                <div className="stat-value-large losses">{selectedPlayer.losses || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Win Rate</div>
                <div className="stat-value-large">
                  {selectedPlayer.matchesPlayed > 0
                    ? ((selectedPlayer.wins / selectedPlayer.matchesPlayed) * 100).toFixed(1) + '%'
                    : '0%'
                  }
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Status</div>
                <div className="stat-value-large">
                  {(selectedPlayer.matchesPlayed || 0) < 10 ? (
                    <span className="provisional-badge">⭐ Provisional</span>
                  ) : (
                    <span>Established</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {ratingHistory.length > 0 && (
            <div className="rating-history-section">
              <h3>ELO Rating Over Time</h3>
              {renderChart()}
              
              <div className="rating-summary">
                <div className="summary-item">
                  <strong>Starting Rating:</strong> {ratingHistory[0]?.rating.toFixed(1) || '1000.0'}
                </div>
                <div className="summary-item">
                  <strong>Current Rating:</strong> {selectedPlayer.elo.toFixed(1)}
                </div>
                <div className="summary-item">
                  <strong>Rating Change:</strong> 
                  <span className={selectedPlayer.elo - (ratingHistory[0]?.rating || 1000) >= 0 ? 'positive' : 'negative'}>
                    {selectedPlayer.elo - (ratingHistory[0]?.rating || 1000) >= 0 ? '+' : ''}
                    {(selectedPlayer.elo - (ratingHistory[0]?.rating || 1000)).toFixed(1)}
                  </span>
                </div>
                <div className="summary-item">
                  <strong>Peak Rating:</strong> {Math.max(...ratingHistory.map(h => h.rating)).toFixed(1)}
                </div>
              </div>
            </div>
          )}

          {ratingHistory.length === 0 && selectedPlayerId && (
            <p className="info">No match history yet. Play some matches to see rating progression!</p>
          )}
        </div>
      )}

      {!selectedPlayerId && (
        <p className="info">Select a player to view their statistics and rating history</p>
      )}
    </div>
  );
}
