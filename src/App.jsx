import { useState } from 'react';
import './App.css';
import AddPlayer from './components/AddPlayer';
import AddMatch from './components/AddMatch';
import Leaderboard from './components/Leaderboard';
import MatchHistory from './components/MatchHistory';
import Prediction from './components/Prediction';
import PlayerStats from './components/PlayerStats';
import LootboxPage from './components/LootboxPage';
import { useApp } from './context/AppContext';

function App() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const { players, matches } = useApp();

  const tabs = [
    { id: 'leaderboard', label: '🏆 Leaderboard', component: <Leaderboard /> },
    { id: 'add-match', label: '➕ Add Match', component: <AddMatch /> },
    { id: 'add-player', label: '👤 Add Player', component: <AddPlayer /> },
    { id: 'lootbox', label: '🎁 Lootbox', component: <LootboxPage /> },
    { id: 'prediction', label: '🔮 Prediction', component: <Prediction /> },
    { id: 'stats', label: '📈 Stats', component: <PlayerStats /> },
    { id: 'history', label: '📊 History', component: <MatchHistory /> },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏓 Table Tennis ELO Tracker</h1>
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Players:</span>
            <span className="stat-value">{players.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Matches:</span>
            <span className="stat-value">{matches.length}</span>
          </div>
      </div>
      </header>

      <nav className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
        </button>
        ))}
      </nav>

      <main className="main-content">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </main>
      </div>
  );
}

export default App;
