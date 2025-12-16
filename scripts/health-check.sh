#!/bin/bash

# Health check script for Machine Rental System
# This script checks the health of all services

set -e

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
TIMEOUT=30

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
}

# Check if service is running
check_service_running() {
    local service=$1
    if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        return 0
    else
        return 1
    fi
}

# Check if service is healthy
check_service_healthy() {
    local service=$1
    local status=$(docker-compose -f "$COMPOSE_FILE" ps "$service" | grep "$service" | awk '{print $4}')
    
    if [[ "$status" == *"healthy"* ]]; then
        return 0
    elif [[ "$status" == *"unhealthy"* ]]; then
        return 1
    else
        # Service might not have health check
        return 2
    fi
}

# Check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        return 0
    else
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if check_service_running "postgres"; then
        if check_service_healthy "postgres"; then
            log "✓ Database is running and healthy"
            return 0
        else
            error "✗ Database is running but unhealthy"
            return 1
        fi
    else
        error "✗ Database is not running"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis connectivity..."
    
    if check_service_running "redis"; then
        if check_service_healthy "redis"; then
            log "✓ Redis is running and healthy"
            return 0
        else
            error "✗ Redis is running but unhealthy"
            return 1
        fi
    else
        error "✗ Redis is not running"
        return 1
    fi
}

# Check MQTT broker
check_mqtt() {
    log "Checking MQTT broker..."
    
    if check_service_running "mosquitto"; then
        if check_service_healthy "mosquitto"; then
            log "✓ MQTT broker is running and healthy"
            return 0
        else
            error "✗ MQTT broker is running but unhealthy"
            return 1
        fi
    else
        error "✗ MQTT broker is not running"
        return 1
    fi
}

# Check backend service
check_backend() {
    log "Checking backend service..."
    
    if check_service_running "backend"; then
        if check_http_endpoint "http://localhost/api/health"; then
            log "✓ Backend service is running and responding"
            return 0
        else
            error "✗ Backend service is not responding to health checks"
            return 1
        fi
    else
        error "✗ Backend service is not running"
        return 1
    fi
}

# Check frontend service
check_frontend() {
    log "Checking frontend service..."
    
    if check_service_running "frontend"; then
        if check_http_endpoint "http://localhost/health"; then
            log "✓ Frontend service is running and responding"
            return 0
        else
            error "✗ Frontend service is not responding to health checks"
            return 1
        fi
    else
        error "✗ Frontend service is not running"
        return 1
    fi
}

# Check monitoring services
check_monitoring() {
    log "Checking monitoring services..."
    
    local prometheus_ok=true
    local grafana_ok=true
    
    if check_service_running "prometheus"; then
        if check_http_endpoint "http://localhost:9090/-/healthy"; then
            log "✓ Prometheus is running and healthy"
        else
            warn "✗ Prometheus is not responding"
            prometheus_ok=false
        fi
    else
        warn "✗ Prometheus is not running"
        prometheus_ok=false
    fi
    
    if check_service_running "grafana"; then
        if check_http_endpoint "http://localhost:3000/api/health"; then
            log "✓ Grafana is running and healthy"
        else
            warn "✗ Grafana is not responding"
            grafana_ok=false
        fi
    else
        warn "✗ Grafana is not running"
        grafana_ok=false
    fi
    
    if $prometheus_ok && $grafana_ok; then
        return 0
    else
        return 1
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        log "✓ Disk space usage: ${usage}%"
        return 0
    elif [ "$usage" -lt 90 ]; then
        warn "⚠ Disk space usage: ${usage}% (Warning threshold)"
        return 1
    else
        error "✗ Disk space usage: ${usage}% (Critical threshold)"
        return 1
    fi
}

# Check memory usage
check_memory() {
    log "Checking memory usage..."
    
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -lt 80 ]; then
        log "✓ Memory usage: ${usage}%"
        return 0
    elif [ "$usage" -lt 90 ]; then
        warn "⚠ Memory usage: ${usage}% (Warning threshold)"
        return 1
    else
        error "✗ Memory usage: ${usage}% (Critical threshold)"
        return 1
    fi
}

# Generate health report
generate_report() {
    local overall_status="HEALTHY"
    local failed_checks=0
    
    log "=== Machine Rental System Health Check Report ==="
    log "Timestamp: $(date)"
    echo
    
    # Core services
    check_database || { overall_status="UNHEALTHY"; ((failed_checks++)); }
    check_redis || { overall_status="UNHEALTHY"; ((failed_checks++)); }
    check_mqtt || { overall_status="UNHEALTHY"; ((failed_checks++)); }
    check_backend || { overall_status="UNHEALTHY"; ((failed_checks++)); }
    check_frontend || { overall_status="UNHEALTHY"; ((failed_checks++)); }
    
    # System resources
    check_disk_space || { overall_status="WARNING"; }
    check_memory || { overall_status="WARNING"; }
    
    # Monitoring (optional)
    check_monitoring || { warn "Monitoring services have issues"; }
    
    echo
    log "=== Summary ==="
    if [ "$overall_status" = "HEALTHY" ]; then
        log "✓ Overall system status: HEALTHY"
        exit 0
    elif [ "$overall_status" = "WARNING" ]; then
        warn "⚠ Overall system status: WARNING"
        exit 1
    else
        error "✗ Overall system status: UNHEALTHY ($failed_checks critical issues)"
        exit 2
    fi
}

# Main execution
main() {
    case "${1:-report}" in
        "report")
            generate_report
            ;;
        "database")
            check_database
            ;;
        "redis")
            check_redis
            ;;
        "mqtt")
            check_mqtt
            ;;
        "backend")
            check_backend
            ;;
        "frontend")
            check_frontend
            ;;
        "monitoring")
            check_monitoring
            ;;
        "system")
            check_disk_space && check_memory
            ;;
        *)
            echo "Usage: $0 {report|database|redis|mqtt|backend|frontend|monitoring|system}"
            echo "  report     - Full health check report (default)"
            echo "  database   - Check database only"
            echo "  redis      - Check Redis only"
            echo "  mqtt       - Check MQTT broker only"
            echo "  backend    - Check backend service only"
            echo "  frontend   - Check frontend service only"
            echo "  monitoring - Check monitoring services only"
            echo "  system     - Check system resources only"
            exit 1
            ;;
    esac
}

main "$@"