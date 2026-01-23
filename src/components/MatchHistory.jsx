import { useApp } from '../context/AppContext';

export default function MatchHistory() {
  const { matches } = useApp();

  if (matches.length === 0) {
    return (
      <div className="card">
        <h2>Match History</h2>
        <p className="empty-state">No matches yet. Add a match to see history!</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWinner = (match) => {
    if (match.player1Score > match.player2Score) {
      return match.player1Name;
    }
    return match.player2Name;
  };

  return (
    <div className="card">
      <h2>📊 Match History</h2>
      <div className="match-history-container">
        {matches.map((match) => {
          const player1Won = match.player1Score > match.player2Score;
          const player2Won = match.player2Score > match.player1Score;

          return (
            <div key={match.id} className="match-card">
              <div className="match-header">
                <span className="match-date">{formatDate(match.createdAt)}</span>
              </div>
              <div className="match-players">
                <div className={`match-player ${player1Won ? 'winner' : ''}`}>
                  <div className="player-info">
                    <span className="player-name">{match.player1Name}</span>
                    <span className="player-score">{match.player1Score}</span>
                  </div>
                  <div className="elo-change">
                    <span className={`elo-before`}>ELO: {typeof match.player1ELOBefore === 'number' ? match.player1ELOBefore.toFixed(1) : match.player1ELOBefore}</span>
                    <span className={`elo-change-value ${match.player1ELOChange >= 0 ? 'positive' : 'negative'}`}>
                      {match.player1ELOChange >= 0 ? '+' : ''}{typeof match.player1ELOChange === 'number' ? match.player1ELOChange.toFixed(1) : match.player1ELOChange}
                    </span>
                    <span className="elo-after">→ {typeof match.player1ELOAfter === 'number' ? match.player1ELOAfter.toFixed(1) : match.player1ELOAfter}</span>
                  </div>
                </div>
                <div className="match-vs">VS</div>
                <div className={`match-player ${player2Won ? 'winner' : ''}`}>
                  <div className="player-info">
                    <span className="player-name">{match.player2Name}</span>
                    <span className="player-score">{match.player2Score}</span>
                  </div>
                  <div className="elo-change">
                    <span className="elo-before">ELO: {typeof match.player2ELOBefore === 'number' ? match.player2ELOBefore.toFixed(1) : match.player2ELOBefore}</span>
                    <span className={`elo-change-value ${match.player2ELOChange >= 0 ? 'positive' : 'negative'}`}>
                      {match.player2ELOChange >= 0 ? '+' : ''}{typeof match.player2ELOChange === 'number' ? match.player2ELOChange.toFixed(1) : match.player2ELOChange}
                    </span>
                    <span className="elo-after">→ {typeof match.player2ELOAfter === 'number' ? match.player2ELOAfter.toFixed(1) : match.player2ELOAfter}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

