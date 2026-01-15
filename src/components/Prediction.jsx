import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getExpectedScore } from '../utils/elo';

export default function Prediction() {
  const { players } = useApp();
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');

  const player1 = players.find(p => p.id === player1Id);
  const player2 = players.find(p => p.id === player2Id);

  const calculatePrediction = () => {
    if (!player1 || !player2) return null;

    const player1ELO = player1.elo || 1000;
    const player2ELO = player2.elo || 1000;
    
    const player1WinProb = getExpectedScore(player1ELO, player2ELO);
    const player2WinProb = 1 - player1WinProb;

    const ratingDiff = player1ELO - player2ELO;

    return {
      player1WinProb: player1WinProb * 100,
      player2WinProb: player2WinProb * 100,
      ratingDiff,
      favorite: ratingDiff > 0 ? player1.name : player2.name,
      underdog: ratingDiff > 0 ? player2.name : player1.name,
    };
  };

  const prediction = calculatePrediction();

  return (
    <div className="card">
      <h2>🔮 Match Prediction</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Select two players to see predicted match outcome based on their current ELO ratings.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label>Player 1</label>
          <select
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
            className="select"
          >
            <option value="">Select player...</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} ({typeof player.elo === 'number' ? player.elo.toFixed(1) : player.elo} ELO)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Player 2</label>
          <select
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            className="select"
          >
            <option value="">Select player...</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} ({typeof player.elo === 'number' ? player.elo.toFixed(1) : player.elo} ELO)
              </option>
            ))}
          </select>
        </div>
      </div>

      {prediction && (
        <div className="prediction-results">
          <div className="prediction-header">
            <h3>Predicted Outcome</h3>
            <div className="rating-diff">
              Rating Difference: {prediction.ratingDiff > 0 ? '+' : ''}{prediction.ratingDiff.toFixed(1)}
            </div>
          </div>

          <div className="prediction-cards">
            <div className="prediction-card favorite">
              <div className="player-name-large">{prediction.favorite}</div>
              <div className="elo-display">
                {prediction.ratingDiff > 0 
                  ? (typeof player1.elo === 'number' ? player1.elo.toFixed(1) : player1.elo)
                  : (typeof player2.elo === 'number' ? player2.elo.toFixed(1) : player2.elo)
                }
              </div>
              <div className="win-probability">
                <div className="prob-bar-container">
                  <div 
                    className="prob-bar" 
                    style={{ 
                      width: `${prediction.ratingDiff > 0 ? prediction.player1WinProb : prediction.player2WinProb}%`,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    }}
                  />
                </div>
                <div className="prob-text">
                  {prediction.ratingDiff > 0 ? prediction.player1WinProb : prediction.player2WinProb}% Win Probability
                </div>
              </div>
            </div>

            <div className="vs-divider">VS</div>

            <div className="prediction-card underdog">
              <div className="player-name-large">{prediction.underdog}</div>
              <div className="elo-display">
                {prediction.ratingDiff > 0 
                  ? (typeof player2.elo === 'number' ? player2.elo.toFixed(1) : player2.elo)
                  : (typeof player1.elo === 'number' ? player1.elo.toFixed(1) : player1.elo)
                }
              </div>
              <div className="win-probability">
                <div className="prob-bar-container">
                  <div 
                    className="prob-bar" 
                    style={{ 
                      width: `${prediction.ratingDiff > 0 ? prediction.player2WinProb : prediction.player1WinProb}%`,
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    }}
                  />
                </div>
                <div className="prob-text">
                  {prediction.ratingDiff > 0 ? prediction.player2WinProb : prediction.player1WinProb}% Win Probability
                </div>
              </div>
            </div>
          </div>

          <div className="prediction-details">
            <div className="detail-item">
              <strong>Expected Score:</strong> {prediction.ratingDiff > 0 
                ? `${prediction.player1WinProb.toFixed(1)}% - ${prediction.player2WinProb.toFixed(1)}%`
                : `${prediction.player2WinProb.toFixed(1)}% - ${prediction.player1WinProb.toFixed(1)}%`
              }
            </div>
            <div className="detail-item">
              <strong>Match Type:</strong> {
                Math.abs(prediction.ratingDiff) < 50 ? 'Very Close Match' :
                Math.abs(prediction.ratingDiff) < 100 ? 'Close Match' :
                Math.abs(prediction.ratingDiff) < 200 ? 'Moderate Favorite' :
                'Heavy Favorite'
              }
            </div>
          </div>
        </div>
      )}

      {!prediction && player1Id && player2Id && (
        <p className="info">Select both players to see prediction</p>
      )}
    </div>
  );
}
