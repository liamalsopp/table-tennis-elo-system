# 🏓 Table Tennis ELO Tracker

A full-featured React application for tracking ELO ratings in a table tennis league. Add players, record match results, and watch ELO ratings update in real-time!

## Features

- **Player Management**: Add players to the league with starting ELO of 1000
- **Match Recording**: Record match results with scores for each player
- **Real-time ELO Updates**: ELO ratings automatically recalculate after each match
- **Leaderboard**: View players ranked by ELO with win/loss statistics
- **Match History**: Browse all past matches with ELO changes
- **SQLite Database**: All data is stored in a SQLite database
- **Match Deletion**: Delete matches with automatic ELO recalculation

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start both the backend server and frontend:
```bash
npm run dev:all
```

This will start:
- Backend API server on `http://localhost:3001`
- Frontend React app on `http://localhost:5173`

Alternatively, you can run them separately:
```bash
# Terminal 1 - Backend server
npm run dev:server

# Terminal 2 - Frontend
npm run dev
```

3. Open your browser to `http://localhost:5173`

## How to Use

### Adding Players

1. Navigate to the "👤 Add Player" tab
2. Enter a player name
3. Click "Add Player"
4. New players start with an ELO rating of 1000

### Recording Matches

1. Navigate to the "➕ Add Match" tab
2. Select Player 1 and Player 2 from the dropdowns
3. Enter the scores for each player
4. Click "Add Match"
5. ELO ratings will update automatically!

### Viewing the Leaderboard

The "🏆 Leaderboard" tab shows:
- Player rankings (sorted by ELO)
- Current ELO rating
- Win/Loss record
- Win percentage
- Total matches played

### Viewing Match History

The "📊 History" tab displays:
- All past matches in chronological order
- Match scores
- ELO ratings before and after each match
- ELO change for each player
- Option to delete matches

## ELO Calculation

The app uses an advanced ELO rating system with:
- Starting ELO: 1000
- Performance-based rating changes (not just win/loss)
- Margin of victory multiplier
- Provisional ratings (K=40 for <10 games, K=24 for established)
- Rust factor for inactive players
- Close loss bonus (underdogs can gain rating on close losses)

Expected score is calculated using:
```
Expected Score = 1 / (1 + 10^((Opponent Rating - Player Rating) / 400))
```

## Data Storage

All data is stored in a **SQLite database** located at `server/database.sqlite`:
- Players table: Stores player information and statistics
- Matches table: Stores match history with ELO changes

The database is automatically created when you first run the server. Data persists between server restarts.

### Database Schema

**Players Table:**
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT UNIQUE)
- `elo` (INTEGER, default 1500)
- `wins` (INTEGER, default 0)
- `losses` (INTEGER, default 0)
- `matches_played` (INTEGER, default 0)
- `created_at` (TEXT)

**Matches Table:**
- `id` (TEXT PRIMARY KEY)
- `player1_id`, `player2_id` (TEXT, foreign keys)
- `player1_name`, `player2_name` (TEXT)
- `player1_score`, `player2_score` (INTEGER)
- `player1_elo_before`, `player2_elo_before` (INTEGER)
- `player1_elo_after`, `player2_elo_after` (INTEGER)
- `player1_elo_change`, `player2_elo_change` (INTEGER)
- `created_at` (TEXT)

## API Endpoints

The backend provides REST API endpoints:

- `GET /api/players` - Get all players
- `POST /api/players` - Add a new player
- `DELETE /api/players/:id` - Delete a player
- `GET /api/matches` - Get all matches
- `POST /api/matches` - Add a new match
- `DELETE /api/matches/:id` - Delete a match (recalculates ELO)
- `GET /api/health` - Health check

## Project Structure

```
├── server/
│   ├── index.js           # Express server entry point
│   ├── db.js              # Database initialization
│   ├── routes/
│   │   ├── players.js     # Player API routes
│   │   └── matches.js     # Match API routes
│   └── utils/
│       └── elo.js         # ELO calculation functions
├── src/
│   ├── components/
│   │   ├── AddMatch.jsx      # Form for adding match results
│   │   ├── AddPlayer.jsx     # Form for adding new players
│   │   ├── Leaderboard.jsx   # Displays player rankings
│   │   └── MatchHistory.jsx  # Displays match history
│   ├── context/
│   │   └── AppContext.jsx    # Global state management with API calls
│   ├── utils/
│   │   └── elo.js           # ELO calculation functions
│   ├── App.jsx              # Main app component
│   ├── App.css              # App styles
│   ├── index.css            # Global styles
│   └── main.jsx             # App entry point
└── package.json
```

## Technologies Used

- **Frontend:**
  - React 19
  - Vite
  - Context API for state management
  
- **Backend:**
  - Node.js
  - Express.js
  - SQLite3
  - CORS

- **Styling:**
  - Modern CSS with gradients and animations

## Environment Variables

You can set the API URL using an environment variable:
- `VITE_API_URL` - Defaults to `http://localhost:3001/api` if not set

## Docker Deployment

### Local Testing

Build and run with Docker:

```bash
# Build the image
docker build -t table-tennis-elo:latest .

# Run the container
docker run -p 8080:8080 table-tennis-elo:latest
```

Or use docker-compose:

```bash
docker-compose up --build
```

Visit http://localhost:8080

### Azure App Service Deployment

See [azure-deploy.md](./azure-deploy.md) for detailed deployment instructions to Azure App Services on the free plan.

Quick steps:
1. Build Docker image
2. Push to Azure Container Registry
3. Create Azure App Service
4. Configure persistent storage for database
5. Deploy!

## License

MIT
