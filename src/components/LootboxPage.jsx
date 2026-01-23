import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Lootbox from './Lootbox';
import AvatarSelector from './AvatarSelector';
import './LootboxPage.css';

export default function LootboxPage() {
  const { players } = useApp();
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  // Update selected player when players list changes
  useEffect(() => {
    if (players.length > 0 && (!selectedPlayerId || !players.find(p => p.id === selectedPlayerId))) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players, selectedPlayerId]);

  if (players.length === 0) {
    return (
      <div className="card">
        <h2>🎁 Lootbox & Avatars</h2>
        <p className="empty-state">Add players first to open lootboxes!</p>
      </div>
    );
  }

  return (
    <div className="lootbox-page">
      <div className="card">
        <h2>🎁 Lootbox & Avatars</h2>
        
        <div className="player-selector">
          <label htmlFor="player-select">Select Player:</label>
          <select
            id="player-select"
            value={selectedPlayerId || ''}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="player-select"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} {player.lootboxes > 0 && `(${player.lootboxes} lootbox${player.lootboxes !== 1 ? 'es' : ''})`}
              </option>
            ))}
          </select>
        </div>

        {selectedPlayerId && (
          <>
            <div className="lootbox-section">
              <h3>Open Lootbox</h3>
              <Lootbox playerId={selectedPlayerId} />
            </div>

            <div className="avatar-section">
              <h3>Your Avatars</h3>
              <AvatarSelector playerId={selectedPlayerId} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
