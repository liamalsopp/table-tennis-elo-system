# PostgreSQL Setup Guide

This app now uses PostgreSQL instead of SQLite. The database runs in a Docker container and persists data in a Docker volume.

## Quick Start

1. **Set a secure password** (optional, defaults to `changeme`):
   ```bash
   export POSTGRES_PASSWORD=your-secure-password
   ```

2. **Start the services**:
   ```bash
   docker-compose up -d
   ```

3. **Access the app**:
   - Frontend: http://localhost:8080
   - PostgreSQL: localhost:5432

## Database Configuration

The database is configured via environment variables in `docker-compose.yml`:

- **Database Name**: `tabletennis`
- **Username**: `tabletennis`
- **Password**: Set via `POSTGRES_PASSWORD` env var (default: `changeme`)
- **Host**: `postgres` (within Docker network) or `localhost` (from host)
- **Port**: `5432`

## Data Persistence

Data is stored in a Docker volume named `postgres-data`. This persists across container restarts and removals.

To remove all data:
```bash
docker-compose down -v
```

## Connecting to PostgreSQL

### From Host Machine:
```bash
psql -h localhost -p 5432 -U tabletennis -d tabletennis
# Password: changeme (or your POSTGRES_PASSWORD)
```

### Using Docker Compose:
```bash
docker-compose exec postgres psql -U tabletennis -d tabletennis
```

## Backups

Backups are automatically created using `pg_dump` and uploaded to Azure Blob Storage:

- **Schedule**: Daily at 2 AM UTC (configurable via `CRON_SCHEDULE`)
- **Format**: SQL dump files (`.sql`)
- **Location**: Azure Blob Storage container in `table-tennis-backups/` folder
- **Retention**: Last 30 days (configurable)

### Manual Backup

```bash
docker-compose exec app node server/backup.js
```

### Restore from Backup

```bash
docker-compose exec app node server/restore.js restore database-backup-2024-01-01T02-00-00-000Z.sql
```
