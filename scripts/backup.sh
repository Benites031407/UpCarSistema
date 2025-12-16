#!/bin/bash

# Enhanced backup script for Machine Rental System
# This script creates comprehensive backups including database, volumes, and configurations

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_NAME="${DB_NAME:-machine_rental}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PREFIX="$BACKUP_DIR/backup_${TIMESTAMP}"

log "Starting comprehensive backup at $(date)"

# Function to backup database
backup_database() {
    log "Creating database backup..."
    
    local db_backup_file="${BACKUP_PREFIX}_database.sql"
    
    # Check if database is accessible
    if ! docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -h localhost -U "$DB_USER" > /dev/null 2>&1; then
        error "Database is not accessible"
    fi
    
    # Create database backup
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
        -h localhost \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-privileges \
        --format=custom > "$db_backup_file"
    
    # Compress the backup
    gzip "$db_backup_file"
    
    local backup_size=$(du -h "${db_backup_file}.gz" | cut -f1)
    log "Database backup completed: ${db_backup_file}.gz (${backup_size})"
}

# Function to backup Docker volumes
backup_volumes() {
    log "Creating Docker volumes backup..."
    
    local volumes_backup_file="${BACKUP_PREFIX}_volumes.tar.gz"
    
    # Get list of volumes used by the application
    local volumes=$(docker-compose -f "$COMPOSE_FILE" config --volumes)
    
    if [ -n "$volumes" ]; then
        # Create temporary container to access volumes
        docker run --rm \
            $(echo "$volumes" | sed 's/^/-v /g' | sed 's/$/:\/backup\/&:ro/g' | tr '\n' ' ') \
            -v "$BACKUP_DIR:/host_backup" \
            alpine:latest \
            sh -c "cd /backup && tar czf /host_backup/$(basename $volumes_backup_file) ."
        
        local backup_size=$(du -h "$volumes_backup_file" | cut -f1)
        log "Volumes backup completed: $volumes_backup_file (${backup_size})"
    else
        warn "No volumes found to backup"
    fi
}

# Function to backup configuration files
backup_configs() {
    log "Creating configuration backup..."
    
    local config_backup_file="${BACKUP_PREFIX}_configs.tar.gz"
    
    # Backup important configuration files
    tar czf "$config_backup_file" \
        --exclude='*.log' \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='build' \
        docker-compose*.yml \
        .env.prod* \
        nginx/ \
        monitoring/ \
        ssl/ \
        scripts/ \
        2>/dev/null || warn "Some configuration files may not exist"
    
    local backup_size=$(du -h "$config_backup_file" | cut -f1)
    log "Configuration backup completed: $config_backup_file (${backup_size})"
}

# Function to create backup manifest
create_manifest() {
    log "Creating backup manifest..."
    
    local manifest_file="${BACKUP_PREFIX}_manifest.json"
    
    cat > "$manifest_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "backup_type": "full",
  "database": {
    "name": "$DB_NAME",
    "host": "$DB_HOST",
    "port": "$DB_PORT"
  },
  "services": $(docker-compose -f "$COMPOSE_FILE" ps --services | jq -R . | jq -s .),
  "volumes": $(docker volume ls --format "{{.Name}}" | grep "$(basename $(pwd))" | jq -R . | jq -s . 2>/dev/null || echo "[]"),
  "system_info": {
    "hostname": "$(hostname)",
    "docker_version": "$(docker --version)",
    "compose_version": "$(docker-compose --version)"
  }
}
EOF
    
    log "Backup manifest created: $manifest_file"
}

# Function to verify backups
verify_backups() {
    log "Verifying backup integrity..."
    
    local db_backup="${BACKUP_PREFIX}_database.sql.gz"
    local volumes_backup="${BACKUP_PREFIX}_volumes.tar.gz"
    local config_backup="${BACKUP_PREFIX}_configs.tar.gz"
    
    # Verify database backup
    if [ -f "$db_backup" ]; then
        if gzip -t "$db_backup" 2>/dev/null; then
            log "✓ Database backup integrity verified"
        else
            error "✗ Database backup is corrupted"
        fi
    fi
    
    # Verify volumes backup
    if [ -f "$volumes_backup" ]; then
        if tar -tzf "$volumes_backup" >/dev/null 2>&1; then
            log "✓ Volumes backup integrity verified"
        else
            error "✗ Volumes backup is corrupted"
        fi
    fi
    
    # Verify config backup
    if [ -f "$config_backup" ]; then
        if tar -tzf "$config_backup" >/dev/null 2>&1; then
            log "✓ Configuration backup integrity verified"
        else
            error "✗ Configuration backup is corrupted"
        fi
    fi
}

# Function to clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old backup sets
    for backup_set in $(find "$BACKUP_DIR" -name "backup_*_manifest.json" -type f -mtime +$RETENTION_DAYS); do
        local backup_prefix=$(echo "$backup_set" | sed 's/_manifest\.json$//')
        
        # Delete all files in the backup set
        rm -f "${backup_prefix}"_*.{sql.gz,tar.gz,json} 2>/dev/null || true
        ((deleted_count++))
    done
    
    if [ $deleted_count -gt 0 ]; then
        log "Deleted $deleted_count old backup sets"
    else
        log "No old backups to clean up"
    fi
}

# Function to list current backups
list_backups() {
    log "Current backup sets:"
    
    local backup_count=0
    for manifest in $(find "$BACKUP_DIR" -name "backup_*_manifest.json" -type f | sort -r); do
        local timestamp=$(basename "$manifest" | sed 's/backup_\(.*\)_manifest\.json/\1/')
        local backup_date=$(echo "$timestamp" | sed 's/\([0-9]\{8\}\)_\([0-9]\{6\}\)/\1 \2/' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
        
        local total_size=0
        for file in "${BACKUP_DIR}/backup_${timestamp}"_*; do
            if [ -f "$file" ]; then
                local size=$(du -b "$file" | cut -f1)
                total_size=$((total_size + size))
            fi
        done
        
        local human_size=$(echo "$total_size" | awk '{
            if ($1 >= 1073741824) printf "%.1fG", $1/1073741824
            else if ($1 >= 1048576) printf "%.1fM", $1/1048576
            else if ($1 >= 1024) printf "%.1fK", $1/1024
            else printf "%dB", $1
        }')
        
        echo "  $backup_date - $human_size"
        ((backup_count++))
    done
    
    if [ $backup_count -eq 0 ]; then
        log "No backups found"
    else
        log "Total backup sets: $backup_count"
    fi
}

# Main backup process
main() {
    case "${1:-full}" in
        "database"|"db")
            backup_database
            ;;
        "volumes")
            backup_volumes
            ;;
        "configs")
            backup_configs
            ;;
        "full")
            backup_database
            backup_volumes
            backup_configs
            create_manifest
            verify_backups
            cleanup_old_backups
            list_backups
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {full|database|volumes|configs|list|cleanup}"
            echo "  full     - Complete backup (default)"
            echo "  database - Database backup only"
            echo "  volumes  - Docker volumes backup only"
            echo "  configs  - Configuration files backup only"
            echo "  list     - List existing backups"
            echo "  cleanup  - Clean up old backups"
            exit 1
            ;;
    esac
    
    log "Backup process completed at $(date)"
}

# Check if jq is available (needed for JSON processing)
if ! command -v jq &> /dev/null; then
    warn "jq is not installed. Installing..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y jq
    elif command -v yum &> /dev/null; then
        yum install -y jq
    else
        warn "Could not install jq automatically. Some features may not work."
    fi
fi

main "$@"