import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from './Avatar';
import './AvatarSelector.css';

export default function AvatarSelector({ playerId, onSelect }) {
  const { refreshData } = useApp();
  const [ownedAvatars, setOwnedAvatars] = useState([]);
  const [currentAvatar, setCurrentAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 
    (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api');

  useEffect(() => {
    loadAvatars();
  }, [playerId]);

  const loadAvatars = async () => {
    try {
      setLoading(true);
      const [ownedRes, currentRes] = await Promise.all([
        fetch(`${API_BASE_URL}/avatars/player/${playerId}`),
        fetch(`${API_BASE_URL}/avatars/player/${playerId}/current`),
      ]);

      if (ownedRes.ok) {
        const owned = await ownedRes.json();
        setOwnedAvatars(owned);
      }

      if (currentRes.ok) {
        const current = await currentRes.json();
        setCurrentAvatar(current);
        setSelectedId(current?.id || null);
      }
    } catch (error) {
      console.error('Error loading avatars:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectAvatar = async (avatarId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/avatars/player/${playerId}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId }),
      });

      if (!response.ok) {
        throw new Error('Failed to set avatar');
      }

      const avatar = await response.json();
      setCurrentAvatar(avatar);
      setSelectedId(avatarId);
      refreshData();
      if (onSelect) onSelect(avatar);
    } catch (error) {
      console.error('Error selecting avatar:', error);
      alert('Failed to set avatar. Please try again.');
    }
  };

  if (loading) {
    return <div className="avatar-selector-loading">Loading avatars...</div>;
  }

  if (ownedAvatars.length === 0) {
    return (
      <div className="avatar-selector-empty">
        <p>No avatars yet. Win matches to earn lootboxes!</p>
      </div>
    );
  }

  return (
    <div className="avatar-selector">
      <h3>Select Avatar</h3>
      <div className="current-avatar-display">
        <div className="current-label">Current:</div>
        <Avatar avatar={currentAvatar} size="large" />
        {currentAvatar && (
          <div className="current-name">{currentAvatar.name}</div>
        )}
      </div>
      <div className="avatars-grid">
        {ownedAvatars.map((avatar) => (
          <div
            key={avatar.id}
            className={`avatar-item ${selectedId === avatar.id ? 'selected' : ''} rarity-${avatar.rarity}`}
            onClick={() => selectAvatar(avatar.id)}
            title={`${avatar.name} (${avatar.rarity})`}
          >
            <Avatar avatar={avatar} size="large" />
            <div className="avatar-item-name">{avatar.name}</div>
            <div className={`avatar-item-rarity rarity-${avatar.rarity}`}>
              {avatar.rarity}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
