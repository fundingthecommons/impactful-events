#!/bin/bash

# Load environment variables from .env.local file
if [ -f .env.local ]; then
    source .env.local
elif [ -f .env ]; then
    source .env
else
    echo "❌ Error: Neither .env.local nor .env file found"
    exit 1
fi

# Find pg_dump in common locations
if command -v pg_dump &> /dev/null; then
    PG_DUMP="pg_dump"
elif [ -x "/opt/homebrew/opt/postgresql@17/bin/pg_dump" ]; then
    PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
elif [ -x "/usr/local/opt/postgresql@17/bin/pg_dump" ]; then
    PG_DUMP="/usr/local/opt/postgresql@17/bin/pg_dump"
else
    echo "❌ Error: pg_dump command not found"
    echo ""
    echo "PostgreSQL is installed but pg_dump not found in PATH."
    echo "Add to your PATH with:"
    echo "  echo 'export PATH=\"/opt/homebrew/opt/postgresql@17/bin:\$PATH\"' >> ~/.zshrc"
    echo "  source ~/.zshrc"
    echo ""
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p db-backups

# Generate backup with timestamp
BACKUP_FILE="db-backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"

echo "Creating database backup: $BACKUP_FILE"
"$PG_DUMP" "$DATABASE_URL" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully: $BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ Backup failed"
    exit 1
fi