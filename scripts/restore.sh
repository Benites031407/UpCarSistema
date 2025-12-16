#!/bin/bash

# Database restore script for Machine Rental System
# This script restores a PostgreSQL database from backup

set -e

# Configuration
BACKUP_DIR="/backups"
DB_NAME="${DB_NAME:-machine_rental}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -lah "$BACKUP_DIR"/backup_${DB_NAME}_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

echo "Starting database restore at $(date)"
echo "Backup file: $BACKUP_FILE"

# Create a temporary directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup if it's compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Extracting compressed backup..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/backup.sql"
    RESTORE_FILE="$TEMP_DIR/backup.sql"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Confirm restore operation
echo "WARNING: This will replace all data in database '$DB_NAME'"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled"
    exit 1
fi

# Drop existing connections to the database
echo "Terminating existing connections..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "Recreating database..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS $DB_NAME;"

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "CREATE DATABASE $DB_NAME;"

# Restore database
echo "Restoring database from backup..."
PGPASSWORD="$DB_PASSWORD" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-privileges \
    "$RESTORE_FILE"

echo "Database restore completed at $(date)"

# Verify restore
echo "Verifying restore..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "Restored database contains $TABLE_COUNT tables"
echo "Restore process completed successfully"