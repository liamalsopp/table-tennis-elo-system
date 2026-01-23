import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { webcrypto } from 'crypto';
import { BlobServiceClient } from '@azure/storage-blob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure crypto is available globally for Azure SDK (required for @azure/storage-blob)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}

// Backup folder path in blob storage
const BACKUP_FOLDER = 'table-tennis-backups';

async function listBackups() {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'table-tennis-backups';

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const backups = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${BACKUP_FOLDER}/` })) {
      if (blob.name.includes('database-backup-') && blob.name.endsWith('.sql')) {
        backups.push({
          name: blob.name,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified
        });
      }
    }

    // Sort by date (newest first)
    backups.sort((a, b) => b.lastModified - a.lastModified);

    return backups;
  } catch (error) {
    console.error('Error listing backups:', error);
    throw error;
  }
}

async function getLatestBackup() {
  try {
    const backups = await listBackups();
    if (backups.length === 0) {
      return null;
    }
    return backups[0]; // Already sorted by date (newest first)
  } catch (error) {
    console.error('Error getting latest backup:', error);
    return null;
  }
}

async function restoreDatabase(backupFileName) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'table-tennis-backups';

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
    }

    // Get database connection details
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 5432;
    const dbName = process.env.DB_NAME || 'tabletennis';
    const dbUser = process.env.DB_USER || 'tabletennis';
    const dbPassword = process.env.DB_PASSWORD || 'changeme';

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    console.log(`Restoring from backup: ${backupFileName}`);

    // Ensure backupFileName includes the folder path
    const blobPath = backupFileName.startsWith(BACKUP_FOLDER) 
      ? backupFileName 
      : `${BACKUP_FOLDER}/${backupFileName}`;

    // Download backup
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    const downloadResponse = await blockBlobClient.download(0);

    // Create temp file for SQL dump
    const timestamp = Date.now();
    const tempBackupPath = path.join(__dirname, `temp-restore-${timestamp}.sql`);

    // Write downloaded SQL to temp file
    const buffer = await streamToBuffer(downloadResponse.readableStreamBody);
    fs.writeFileSync(tempBackupPath, buffer);

    console.log(`SQL dump downloaded: ${(buffer.length / 1024).toFixed(2)} KB`);

    // Restore using psql
    console.log('Restoring database from SQL dump...');
    const psqlCommand = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${tempBackupPath}`;
    
    try {
      await execAsync(psqlCommand);
    } catch (error) {
      // Try alternative method
      const psqlAlt = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} < ${tempBackupPath}`;
      await execAsync(psqlAlt, { shell: true });
    }

    // Clean up temp file
    fs.unlinkSync(tempBackupPath);

    console.log(`✓ Database restored from: ${backupFileName}`);

  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
}

function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const backupName = process.argv[3];

  if (command === 'list') {
    listBackups()
      .then((backups) => {
        console.log('\nAvailable backups:');
        backups.forEach((backup, index) => {
          console.log(`${index + 1}. ${backup.name}`);
          console.log(`   Size: ${(backup.size / 1024).toFixed(2)} KB`);
          console.log(`   Date: ${backup.lastModified.toISOString()}\n`);
        });
        process.exit(0);
      })
      .catch((error) => {
        console.error('Failed to list backups:', error);
        process.exit(1);
      });
  } else if (command === 'restore' && backupName) {
    restoreDatabase(backupName)
      .then(() => {
        console.log('Restore completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Restore failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node restore.js list                    - List available backups');
    console.log('  node restore.js restore <backup-name>   - Restore from backup');
    process.exit(1);
  }
}

export { listBackups, restoreDatabase, getLatestBackup };
