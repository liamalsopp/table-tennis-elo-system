import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AddMatch() {
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { addMatch, players } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!player1Id || !player2Id) {
      setError('Please select both players');
      setLoading(false);
      return;
    }

    if (player1Id === player2Id) {
      setError('A player cannot play against themselves');
      setLoading(false);
      return;
    }

    const score1 = parseInt(player1Score);
    const score2 = parseInt(player2Score);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      setError('Please enter valid scores (non-negative numbers)');
      setLoading(false);
      return;
    }

    if (score1 === score2) {
      setError('Scores cannot be equal (one player must win)');
      setLoading(false);
      return;
    }

    try {
      await addMatch(player1Id, player2Id, score1, score2);
      setSuccess('Match added successfully!');
      setPlayer1Id('');
      setPlayer2Id('');
      setPlayer1Score('');
      setPlayer2Score('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to add match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Add Match Result</h2>
      <form onSubmit={handleSubmit}>
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
          <label>Player 1 Score</label>
          <input
            type="number"
            value={player1Score}
            onChange={(e) => setPlayer1Score(e.target.value)}
            placeholder="Score"
            min="0"
            className="input"
          />
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

        <div className="form-group">
          <label>Player 2 Score</label>
          <input
            type="number"
            value={player2Score}
            onChange={(e) => setPlayer2Score(e.target.value)}
            placeholder="Score"
            min="0"
            className="input"
          />
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button type="submit" className="btn btn-primary" disabled={players.length < 2 || loading}>
          {loading ? 'Adding...' : 'Add Match'}
        </button>
        {players.length < 2 && (
          <p className="info">You need at least 2 players to add a match</p>
        )}
      </form>
    </div>
  );
}

