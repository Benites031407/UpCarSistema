#!/bin/bash

# Deployment script for Machine Rental System
# This script handles the complete deployment process

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file '$ENV_FILE' not found"
    fi
    
    log "Prerequisites check passed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p backups
    mkdir -p ssl
    mkdir -p logs
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    
    log "Directories created"
}

# Generate SSL certificates if they don't exist
generate_ssl_certificates() {
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        log "Generating self-signed SSL certificates..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=BR/ST=SP/L=SaoPaulo/O=MachineRental/CN=localhost"
        
        log "SSL certificates generated"
    else
        log "SSL certificates already exist"
    fi
}

# Build and deploy services
deploy_services() {
    log "Building and deploying services..."
    
    # Load environment variables
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    
    # Build images
    log "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log "Services deployed"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "unhealthy"; then
            warn "Some services are still unhealthy (attempt $attempt/$max_attempts)"
            sleep 10
            ((attempt++))
        else
            log "All services are healthy"
            return 0
        fi
    done
    
    error "Services failed to become healthy within timeout"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    docker-compose -f "$COMPOSE_FILE" exec backend npm run db:migrate
    
    log "Database migrations completed"
}

# Create backup
create_backup() {
    log "Creating initial backup..."
    
    docker-compose -f "$COMPOSE_FILE" exec postgres /backups/backup.sh
    
    log "Initial backup created"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Wait for Grafana to be ready
    sleep 30
    
    # Import dashboards (if any custom dashboards exist)
    if [ -d "monitoring/grafana/dashboards/custom" ]; then
        log "Importing custom Grafana dashboards..."
        # Custom dashboard import logic would go here
    fi
    
    log "Monitoring setup completed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    docker system prune -f
    docker image prune -f
    
    log "Cleanup completed"
}

# Main deployment process
main() {
    log "Starting deployment of Machine Rental System ($ENVIRONMENT)"
    
    check_prerequisites
    create_directories
    generate_ssl_certificates
    deploy_services
    wait_for_services
    run_migrations
    setup_monitoring
    cleanup
    
    log "Deployment completed successfully!"
    log "Services are available at:"
    log "  - Frontend: https://localhost"
    log "  - API: https://localhost/api"
    log "  - Grafana: http://localhost:3000 (admin/admin)"
    
    # Show service status
    docker-compose -f "$COMPOSE_FILE" ps
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "status")
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "stop")
        log "Stopping services..."
        docker-compose -f "$COMPOSE_FILE" stop
        ;;
    "restart")
        log "Restarting services..."
        docker-compose -f "$COMPOSE_FILE" restart "${2:-}"
        ;;
    "backup")
        create_backup
        ;;
    *)
        echo "Usage: $0 {deploy|status|logs|stop|restart|backup}"
        echo "  deploy  - Full deployment process"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs (optionally specify service name)"
        echo "  stop    - Stop all services"
        echo "  restart - Restart services (optionally specify service name)"
        echo "  backup  - Create database backup"
        exit 1
        ;;
esac