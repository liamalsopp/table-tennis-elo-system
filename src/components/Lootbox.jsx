import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from './Avatar';
import './Lootbox.css';

export default function Lootbox({ playerId, onOpen }) {
  const { refreshData } = useApp();
  const [lootboxes, setLootboxes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 
    (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api');

  // Load lootbox count
  useEffect(() => {
    fetch(`${API_BASE_URL}/avatars/lootbox/${playerId}`)
      .then(res => res.json())
      .then(data => setLootboxes(data.lootboxes || 0))
      .catch(err => console.error('Error loading lootboxes:', err));
  }, [playerId]);

  const openLootbox = async () => {
    if (lootboxes < 1 || loading || opening) return;

    setLoading(true);
    setOpening(true);
    setResult(null);
    setShowResult(false);

    try {
      const response = await fetch(`${API_BASE_URL}/avatars/lootbox/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to open lootbox');
      }

      const data = await response.json();
      
      // Animate opening
      setTimeout(() => {
        setResult(data);
        setShowResult(true);
        setLootboxes(data.remainingLootboxes);
        setOpening(false);
        setLoading(false);
        refreshData();
        if (onOpen) onOpen(data);
      }, 1500);
    } catch (error) {
      console.error('Error opening lootbox:', error);
      setOpening(false);
      setLoading(false);
      alert('Failed to open lootbox. Please try again.');
    }
  };

  if (lootboxes === 0 && !showResult) {
    return (
      <div className="lootbox-container">
        <div className="lootbox-empty">
          <span className="lootbox-icon">📦</span>
          <p>No lootboxes available</p>
          <small>Win a match to earn a lootbox!</small>
        </div>
      </div>
    );
  }

  return (
    <div className="lootbox-container">
      {!showResult && (
        <div className={`lootbox ${opening ? 'opening' : ''}`}>
          <div className="lootbox-content">
            <div className="lootbox-icon-large">📦</div>
            <div className="lootbox-count">{lootboxes} Available</div>
            <button 
              className="lootbox-button"
              onClick={openLootbox}
              disabled={loading || opening || lootboxes < 1}
            >
              {opening ? 'Opening...' : 'Open Lootbox'}
            </button>
          </div>
        </div>
      )}

      {showResult && result && (
        <div className={`lootbox-result ${result.isNew ? 'new' : 'duplicate'}`}>
          <div className="result-content">
            <div className="result-header">
              {result.isNew ? '🎉 New Avatar Unlocked!' : '💫 Avatar Obtained'}
            </div>
            <div className="result-avatar">
              <Avatar avatar={result.avatar} size="xlarge" showRarity />
            </div>
            <div className="result-name">{result.avatar.name}</div>
            <div className={`result-rarity rarity-${result.avatar.rarity}`}>
              {result.avatar.rarity.toUpperCase()}
            </div>
            {result.remainingLootboxes > 0 && (
              <div className="result-footer">
                {result.remainingLootboxes} lootbox{result.remainingLootboxes !== 1 ? 'es' : ''} remaining
              </div>
            )}
            <button 
              className="result-close-button"
              onClick={() => {
                setShowResult(false);
                setResult(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
