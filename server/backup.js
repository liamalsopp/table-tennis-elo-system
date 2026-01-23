import { exec } from 'child_process';
import { promisify } from 'util';
import { webcrypto } from 'crypto';
import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure crypto is available globally for Azure SDK (required for @azure/storage-blob)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}

// Backup folder path in blob storage
const BACKUP_FOLDER = 'table-tennis-backups';

async function backupDatabase() {
  try {
    // Get database connection details
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 5432;
    const dbName = process.env.DB_NAME || 'tabletennis';
    const dbUser = process.env.DB_USER || 'tabletennis';
    const dbPassword = process.env.DB_PASSWORD || 'changeme';

    // Azure Blob Storage configuration
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'table-tennis-backups';

    if (!connectionString) {
      console.error('AZURE_STORAGE_CONNECTION_STRING not set, skipping backup');
      return;
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${BACKUP_FOLDER}/database-backup-${timestamp}.sql`;
    const tempBackupPath = path.join(__dirname, `temp-backup-${timestamp}.sql`);

    console.log(`Starting PostgreSQL backup...`);

    // Use pg_dump to create backup
    // Set PGPASSWORD environment variable for password
    const pgDumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p -f ${tempBackupPath}`;
    
    try {
      await execAsync(pgDumpCommand);
    } catch (error) {
      console.error('pg_dump failed:', error);
      // Try alternative: use pg_dump without password file
      const pgDumpAlt = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} > ${tempBackupPath}`;
      await execAsync(pgDumpAlt, { shell: true });
    }

    // Read backup file
    const dbBuffer = fs.readFileSync(tempBackupPath);
    const dbSize = dbBuffer.length;

    console.log(`Backup created: ${(dbSize / 1024).toFixed(2)} KB`);

    // Create blob service client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists
    await containerClient.createIfNotExists();

    // Upload to blob storage
    const blockBlobClient = containerClient.getBlockBlobClient(backupFileName);
    await blockBlobClient.upload(dbBuffer, dbSize, {
      blobHTTPHeaders: {
        blobContentType: 'application/sql'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        size: dbSize.toString()
      }
    });

    console.log(`✓ Backup completed: ${backupFileName}`);

    // Clean up temp file
    fs.unlinkSync(tempBackupPath);

    // Optional: Clean up old backups (keep last 30 days)
    await cleanupOldBackups(containerClient);

  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

async function cleanupOldBackups(containerClient, daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${BACKUP_FOLDER}/` })) {
      // Extract timestamp from filename: table-tennis-backups/database-backup-2024-01-01T12-00-00-000Z.sql
      const match = blob.name.match(/database-backup-(.+)\.sql/);
      if (match) {
        const timestamp = match[1].replace(/-/g, ':').replace(/T/, 'T').replace(/-/g, '-');
        const blobDate = new Date(timestamp);
        
        if (blobDate < cutoffDate) {
          await containerClient.deleteBlob(blob.name);
          deletedCount++;
          console.log(`Deleted old backup: ${blob.name}`);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
    // Don't throw - cleanup failure shouldn't fail the backup
  }
}

// Run backup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backupDatabase()
    .then(() => {
      console.log('Backup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backup script failed:', error);
      process.exit(1);
    });
}

export { backupDatabase };
