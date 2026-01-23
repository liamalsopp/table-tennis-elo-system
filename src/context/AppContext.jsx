import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// In production, use relative URLs since React app is served from same server
// In development, use the dev server URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api');

export function AppProvider({ children }) {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from API on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [playersRes, matchesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/players`),
        fetch(`${API_BASE_URL}/matches`),
      ]);

      if (!playersRes.ok) {
        console.error('Failed to fetch players:', playersRes.status, playersRes.statusText);
      } else {
        const playersData = await playersRes.json();
        setPlayers(playersData);
      }

      if (!matchesRes.ok) {
        console.error('Failed to fetch matches:', matchesRes.status, matchesRes.statusText);
    } else {
        const matchesData = await matchesRes.json();
        setMatches(matchesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('API Base URL:', API_BASE_URL);
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to add player:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to add player');
      }

      const newPlayer = await response.json();
      await loadData(); // Reload all data
      return newPlayer;
    } catch (error) {
      console.error('Error adding player:', error);
      if (error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:3001');
      }
      throw error;
    }
  };

  const addMatch = async (player1Id, player2Id, player1Score, player2Score) => {
    try {
      const response = await fetch(`${API_BASE_URL}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      player1Id,
      player2Id,
      player1Score,
      player2Score,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add match');
      }

      const newMatch = await response.json();
      await loadData(); // Reload all data to get updated ELO ratings
    return newMatch;
    } catch (error) {
      throw error;
    }
  };

  const deletePlayer = async (playerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/players/${playerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete player');
      }

      await loadData(); // Reload all data
    } catch (error) {
      throw error;
    }
  };

  const deleteMatch = async (matchId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/matches/${matchId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete match');
      }

      await loadData(); // Reload all data to get recalculated ELO ratings
    } catch (error) {
      throw error;
    }
  };

  const getPlayerStats = (playerId) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return null;

    const playerMatches = matches.filter(
      (m) => m.player1Id === playerId || m.player2Id === playerId
    );

    const recentMatches = playerMatches.slice(0, 10);

    return {
      player,
      matches: playerMatches,
      recentMatches,
    };
  };

  const value = {
    players: [...players].sort((a, b) => b.elo - a.elo), // Sort by ELO descending
    matches,
    loading,
    addPlayer,
    addMatch,
    deletePlayer,
    deleteMatch,
    getPlayerStats,
    refreshData: loadData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
