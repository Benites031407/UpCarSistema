#!/bin/bash

# Deployment validation script for Machine Rental System
# This script validates that the deployment is working correctly

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
BASE_URL="${BASE_URL:-https://yourdomain.com}"
TIMEOUT="${TIMEOUT:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TESTS_TOTAL++))
    info "Running test: $test_name"
    
    if eval "$test_command"; then
        log "✓ PASS: $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        error "✗ FAIL: $test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# HTTP request helper
http_get() {
    local url="$1"
    local expected_status="${2:-200}"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        return 0
    else
        echo "Expected status $expected_status, got $response for $url" >&2
        return 1
    fi
}

# JSON response helper
http_get_json() {
    local url="$1"
    local json_path="$2"
    local expected_value="$3"
    
    local response=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "{}")
    local actual_value=$(echo "$response" | jq -r "$json_path" 2>/dev/null || echo "null")
    
    if [ "$actual_value" = "$expected_value" ]; then
        return 0
    else
        echo "Expected '$expected_value', got '$actual_value' for $json_path in $url" >&2
        return 1
    fi
}

# Test basic connectivity
test_basic_connectivity() {
    log "Testing basic connectivity..."
    
    run_test "Frontend health check" "http_get '$BASE_URL/health'"
    run_test "API health check" "http_get '$BASE_URL/api/health'"
    run_test "Frontend loads" "http_get '$BASE_URL'"
}

# Test SSL/TLS configuration
test_ssl_configuration() {
    if [[ "$BASE_URL" == https://* ]]; then
        log "Testing SSL/TLS configuration..."
        
        run_test "SSL certificate valid" "openssl s_client -connect $(echo $BASE_URL | sed 's|https://||' | sed 's|/.*||'):443 -servername $(echo $BASE_URL | sed 's|https://||' | sed 's|/.*||') < /dev/null 2>/dev/null | openssl x509 -noout -dates"
        run_test "TLS 1.2+ supported" "curl -s --tlsv1.2 --max-time $TIMEOUT '$BASE_URL/health' > /dev/null"
    else
        warn "Skipping SSL tests (HTTP URL provided)"
    fi
}

# Test API endpoints
test_api_endpoints() {
    log "Testing API endpoints..."
    
    run_test "API status endpoint" "http_get '$BASE_URL/api/status'"
    run_test "API version endpoint" "http_get '$BASE_URL/api/version'"
    run_test "API machines endpoint (unauthenticated)" "http_get '$BASE_URL/api/machines' 401"
    run_test "API auth endpoint structure" "http_get '$BASE_URL/api/auth/login' 400"
}

# Test authentication flow
test_authentication() {
    log "Testing authentication flow..."
    
    # Test login endpoint exists
    run_test "Login endpoint exists" "http_get '$BASE_URL/api/auth/login' 400"
    
    # Test registration endpoint exists
    run_test "Registration endpoint exists" "http_get '$BASE_URL/api/auth/register' 400"
    
    # Test Google OAuth endpoint
    run_test "Google OAuth endpoint" "http_get '$BASE_URL/api/auth/google' 302"
}

# Test database connectivity
test_database_connectivity() {
    log "Testing database connectivity..."
    
    if command -v docker-compose &> /dev/null; then
        run_test "Database container running" "docker-compose ps postgres | grep -q 'Up'"
        run_test "Database health check" "docker-compose exec -T postgres pg_isready -U postgres"
    else
        warn "Docker Compose not available, skipping database tests"
    fi
}

# Test Redis connectivity
test_redis_connectivity() {
    log "Testing Redis connectivity..."
    
    if command -v docker-compose &> /dev/null; then
        run_test "Redis container running" "docker-compose ps redis | grep -q 'Up'"
        run_test "Redis ping" "docker-compose exec -T redis redis-cli ping | grep -q PONG"
    else
        warn "Docker Compose not available, skipping Redis tests"
    fi
}

# Test MQTT broker
test_mqtt_broker() {
    log "Testing MQTT broker..."
    
    if command -v docker-compose &> /dev/null; then
        run_test "MQTT container running" "docker-compose ps mosquitto | grep -q 'Up'"
        
        if command -v mosquitto_pub &> /dev/null; then
            run_test "MQTT broker connectivity" "timeout 5 mosquitto_pub -h localhost -t test/topic -m 'test message' -u \${MQTT_USERNAME} -P \${MQTT_PASSWORD}"
        else
            warn "mosquitto_pub not available, skipping MQTT connectivity test"
        fi
    else
        warn "Docker Compose not available, skipping MQTT tests"
    fi
}

# Test monitoring services
test_monitoring() {
    log "Testing monitoring services..."
    
    if command -v docker-compose &> /dev/null; then
        run_test "Prometheus container running" "docker-compose ps prometheus | grep -q 'Up'"
        run_test "Grafana container running" "docker-compose ps grafana | grep -q 'Up'"
        
        # Test Prometheus metrics endpoint
        run_test "Prometheus metrics" "http_get 'http://localhost:9090/metrics'"
        
        # Test Grafana health
        run_test "Grafana health" "http_get 'http://localhost:3000/api/health'"
    else
        warn "Docker Compose not available, skipping monitoring tests"
    fi
}

# Test security headers
test_security_headers() {
    log "Testing security headers..."
    
    local headers=$(curl -s -I --max-time "$TIMEOUT" "$BASE_URL" 2>/dev/null || echo "")
    
    run_test "X-Frame-Options header" "echo '$headers' | grep -i 'X-Frame-Options'"
    run_test "X-Content-Type-Options header" "echo '$headers' | grep -i 'X-Content-Type-Options'"
    run_test "X-XSS-Protection header" "echo '$headers' | grep -i 'X-XSS-Protection'"
    
    if [[ "$BASE_URL" == https://* ]]; then
        run_test "Strict-Transport-Security header" "echo '$headers' | grep -i 'Strict-Transport-Security'"
    fi
}

# Test rate limiting
test_rate_limiting() {
    log "Testing rate limiting..."
    
    # Make multiple rapid requests to test rate limiting
    local rate_limit_test=true
    for i in {1..10}; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/api/health" 2>/dev/null || echo "000")
        if [ "$status" = "429" ]; then
            rate_limit_test=true
            break
        fi
        sleep 0.1
    done
    
    # Note: This test might not always trigger rate limiting depending on configuration
    info "Rate limiting test completed (may not always trigger in normal conditions)"
}

# Test backup system
test_backup_system() {
    log "Testing backup system..."
    
    if [ -f "scripts/backup.sh" ]; then
        run_test "Backup script exists" "test -x scripts/backup.sh"
        
        if command -v docker-compose &> /dev/null; then
            run_test "Backup directory accessible" "test -d /backups || mkdir -p /backups"
        fi
    else
        warn "Backup script not found"
    fi
}

# Test log files
test_logging() {
    log "Testing logging system..."
    
    if command -v docker-compose &> /dev/null; then
        run_test "Backend logs accessible" "docker-compose logs backend | head -1 > /dev/null"
        run_test "Nginx logs accessible" "docker-compose logs nginx | head -1 > /dev/null"
    else
        warn "Docker Compose not available, skipping log tests"
    fi
}

# Performance test
test_performance() {
    log "Testing basic performance..."
    
    local start_time=$(date +%s%N)
    http_get "$BASE_URL/health" > /dev/null 2>&1
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    run_test "Response time under 2000ms" "test $response_time -lt 2000"
    info "Health endpoint response time: ${response_time}ms"
}

# Generate report
generate_report() {
    echo
    log "=== DEPLOYMENT VALIDATION REPORT ==="
    log "Environment: $ENVIRONMENT"
    log "Base URL: $BASE_URL"
    log "Timestamp: $(date)"
    echo
    log "Test Results:"
    log "  Total tests: $TESTS_TOTAL"
    log "  Passed: $TESTS_PASSED"
    log "  Failed: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log "🎉 ALL TESTS PASSED! Deployment appears to be successful."
        echo
        log "Next steps:"
        log "1. Monitor application logs for any issues"
        log "2. Verify real user transactions work correctly"
        log "3. Check monitoring dashboards"
        log "4. Ensure backup schedule is working"
        return 0
    else
        error "❌ SOME TESTS FAILED! Please review and fix issues before going live."
        echo
        error "Failed tests need to be addressed:"
        error "- Check service logs for detailed error information"
        error "- Verify configuration files"
        error "- Ensure all dependencies are properly installed"
        error "- Check network connectivity and firewall rules"
        return 1
    fi
}

# Main execution
main() {
    log "Starting deployment validation for Machine Rental System"
    log "Environment: $ENVIRONMENT"
    log "Base URL: $BASE_URL"
    echo
    
    # Run all test suites
    test_basic_connectivity
    test_ssl_configuration
    test_api_endpoints
    test_authentication
    test_database_connectivity
    test_redis_connectivity
    test_mqtt_broker
    test_monitoring
    test_security_headers
    test_rate_limiting
    test_backup_system
    test_logging
    test_performance
    
    # Generate final report
    generate_report
}

# Handle script arguments
case "${1:-validate}" in
    "validate"|"")
        main
        ;;
    "connectivity")
        test_basic_connectivity
        generate_report
        ;;
    "security")
        test_ssl_configuration
        test_security_headers
        generate_report
        ;;
    "services")
        test_database_connectivity
        test_redis_connectivity
        test_mqtt_broker
        test_monitoring
        generate_report
        ;;
    "performance")
        test_performance
        generate_report
        ;;
    *)
        echo "Usage: $0 {validate|connectivity|security|services|performance}"
        echo "  validate     - Run all validation tests (default)"
        echo "  connectivity - Test basic connectivity only"
        echo "  security     - Test security configuration only"
        echo "  services     - Test backend services only"
        echo "  performance  - Test basic performance only"
        exit 1
        ;;
esac