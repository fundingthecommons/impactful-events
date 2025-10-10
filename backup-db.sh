#!/bin/bash

# Load environment variables from .env file
source .env

# Create backup directory if it doesn't exist
mkdir -p db-backups

# Generate backup with timestamp
BACKUP_FILE="db-backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"

echo "Creating database backup: $BACKUP_FILE"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully: $BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ Backup failed"
    exit 1
fi