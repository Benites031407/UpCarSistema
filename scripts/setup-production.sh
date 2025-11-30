#!/bin/bash

# Production server setup script for Machine Rental System
# This script prepares a fresh server for deployment

set -e

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

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root"
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    
    apt-get update
    apt-get upgrade -y
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        htop \
        vim \
        jq \
        openssl \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        logrotate
    
    log "System packages updated"
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add user to docker group
    usermod -aG docker ubuntu || usermod -aG docker $SUDO_USER || true
    
    log "Docker installed successfully"
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."
    
    # Download and install Docker Compose
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log "Docker Compose installed successfully"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow monitoring ports (restrict to specific IPs in production)
    ufw allow 3000/tcp comment "Grafana"
    ufw allow 9090/tcp comment "Prometheus"
    
    # Enable firewall
    ufw --force enable
    
    log "Firewall configured"
}

# Configure fail2ban
configure_fail2ban() {
    log "Configuring fail2ban..."
    
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
    
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log "Fail2ban configured"
}

# Create application user
create_app_user() {
    log "Creating application user..."
    
    # Create machine-rental user
    useradd -m -s /bin/bash machine-rental || true
    usermod -aG docker machine-rental
    
    # Create application directory
    mkdir -p /opt/machine-rental-system
    chown machine-rental:machine-rental /opt/machine-rental-system
    
    # Create backup directory
    mkdir -p /backups
    chown machine-rental:machine-rental /backups
    
    log "Application user created"
}

# Configure log rotation
configure_logrotate() {
    log "Configuring log rotation..."
    
    cat > /etc/logrotate.d/machine-rental-system << EOF
/opt/machine-rental-system/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 machine-rental machine-rental
    postrotate
        docker-compose -f /opt/machine-rental-system/docker-compose.prod.yml restart backend frontend || true
    endscript
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi \
    endscript
    postrotate
        docker-compose -f /opt/machine-rental-system/docker-compose.prod.yml restart nginx || true
    endscript
}
EOF
    
    log "Log rotation configured"
}

# Setup SSL certificates directory
setup_ssl() {
    log "Setting up SSL certificates directory..."
    
    mkdir -p /opt/machine-rental-system/ssl
    chown machine-rental:machine-rental /opt/machine-rental-system/ssl
    chmod 700 /opt/machine-rental-system/ssl
    
    log "SSL directory created"
}

# Configure system limits
configure_limits() {
    log "Configuring system limits..."
    
    cat >> /etc/security/limits.conf << EOF
# Machine Rental System limits
machine-rental soft nofile 65536
machine-rental hard nofile 65536
machine-rental soft nproc 32768
machine-rental hard nproc 32768
EOF
    
    # Configure systemd limits
    mkdir -p /etc/systemd/system/docker.service.d
    cat > /etc/systemd/system/docker.service.d/limits.conf << EOF
[Service]
LimitNOFILE=1048576
LimitNPROC=1048576
EOF
    
    systemctl daemon-reload
    
    log "System limits configured"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring directories..."
    
    mkdir -p /opt/machine-rental-system/monitoring/{grafana,prometheus,alertmanager,loki,promtail}
    chown -R machine-rental:machine-rental /opt/machine-rental-system/monitoring
    
    log "Monitoring directories created"
}

# Setup cron jobs
setup_cron() {
    log "Setting up cron jobs..."
    
    # Create backup cron job
    cat > /etc/cron.d/machine-rental-backup << EOF
# Machine Rental System backup
0 2 * * * machine-rental cd /opt/machine-rental-system && ./scripts/backup.sh full >> /var/log/backup.log 2>&1
EOF
    
    # Create health check cron job
    cat > /etc/cron.d/machine-rental-health << EOF
# Machine Rental System health check
*/5 * * * * machine-rental cd /opt/machine-rental-system && ./scripts/health-check.sh >> /var/log/health-check.log 2>&1
EOF
    
    log "Cron jobs configured"
}

# Install additional tools
install_tools() {
    log "Installing additional tools..."
    
    # Install Node.js (for debugging if needed)
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Install PostgreSQL client
    apt-get install -y postgresql-client
    
    # Install Redis client
    apt-get install -y redis-tools
    
    # Install MQTT client
    apt-get install -y mosquitto-clients
    
    log "Additional tools installed"
}

# Configure swap
configure_swap() {
    log "Configuring swap..."
    
    # Check if swap already exists
    if [ $(swapon --show | wc -l) -eq 0 ]; then
        # Create 2GB swap file
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        
        # Make swap permanent
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        
        # Configure swappiness
        echo 'vm.swappiness=10' >> /etc/sysctl.conf
        
        log "Swap configured (2GB)"
    else
        log "Swap already configured"
    fi
}

# Main setup process
main() {
    log "Starting production server setup..."
    
    check_root
    update_system
    install_docker
    install_docker_compose
    configure_firewall
    configure_fail2ban
    create_app_user
    configure_logrotate
    setup_ssl
    configure_limits
    setup_monitoring
    setup_cron
    install_tools
    configure_swap
    
    log "Production server setup completed!"
    log ""
    log "Next steps:"
    log "1. Clone the application repository to /opt/machine-rental-system"
    log "2. Configure environment variables in .env.prod"
    log "3. Set up SSL certificates in /opt/machine-rental-system/ssl/"
    log "4. Run the deployment script"
    log ""
    log "Important: Reboot the server to ensure all changes take effect"
}

main "$@"