#!/bin/bash
export KUBECONFIG="${HOME}/.kube/config"
# Configuration
BACKUP_DIR="${HOME}/k3d-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILENAME="$BACKUP_DIR/backup-$TIMESTAMP.sql"
POD_NAME="postgres-0"
DB_USER="tabletennis"
DB_NAME="tabletennis"

# Ensure directory exists
mkdir -p $BACKUP_DIR

# The Magic Command
# We use full path to kubectl just to be safe (run 'which kubectl' to check yours)
/usr/local/bin/kubectl exec -i $POD_NAME -- pg_dump -U $DB_USER -d $DB_NAME > $FILENAME

# Optional: Delete backups older than 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
