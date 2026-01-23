import cron from 'node-cron';
import { webcrypto } from 'crypto';
import { backupDatabase } from './backup.js';

// Ensure crypto is available globally for Azure SDK
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}

// Schedule backup to run daily at 2 AM UTC
// You can change this with CRON_SCHEDULE environment variable
const schedule = process.env.CRON_SCHEDULE || '0 2 * * *';

console.log(`Backup scheduler initialized. Schedule: ${schedule}`);

// Run backup on schedule
cron.schedule(schedule, async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled backup...`);
  try {
    await backupDatabase();
    console.log(`[${new Date().toISOString()}] Scheduled backup completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Scheduled backup failed:`, error);
  }
});

// Export function to run backup on startup (called after DB is initialized)
export async function runStartupBackup() {
  if (process.env.BACKUP_ON_STARTUP !== 'false') {
    console.log('Running initial backup on startup...');
    try {
      await backupDatabase();
      console.log('Initial backup completed');
    } catch (error) {
      console.error('Initial backup failed:', error);
    }
  }
}

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('Scheduler shutting down...');
  process.exit(0);
});
