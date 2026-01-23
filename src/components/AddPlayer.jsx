import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AddPlayer() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { addPlayer, players } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!name.trim()) {
      setError('Please enter a player name');
      setLoading(false);
      return;
    }

    if (players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A player with this name already exists');
      setLoading(false);
      return;
    }

    try {
      await addPlayer(name);
      setSuccess('Player added successfully!');
    setName('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to add player');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Add New Player</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player name"
            className="input"
          />
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Adding...' : 'Add Player'}
        </button>
      </form>
    </div>
  );
}

