# Machine Rental System - Deployment Guide

This guide covers the complete deployment process for the Machine Rental System in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [SSL Certificates](#ssl-certificates)
4. [Database Setup](#database-setup)
5. [Deployment Process](#deployment-process)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Backup and Recovery](#backup-and-recovery)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or newer, CentOS 8+, or similar Linux distribution
- **CPU**: Minimum 4 cores (8 cores recommended for production)
- **RAM**: Minimum 8GB (16GB recommended for production)
- **Storage**: Minimum 100GB SSD (500GB recommended for production)
- **Network**: Static IP address and domain name

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for SSL certificate generation)

### Installation Commands

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd machine-rental-system
```

### 2. Create Production Environment File

```bash
cp .env.prod.example .env.prod
```

### 3. Configure Environment Variables

Edit `.env.prod` with your production values:

```bash
# Critical settings to change:
DB_PASSWORD=your-secure-database-password
REDIS_PASSWORD=your-secure-redis-password
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-long
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
PIX_ACCESS_TOKEN=your-production-pix-access-token
WHATSAPP_ACCESS_TOKEN=your-whatsapp-business-access-token
GRAFANA_ADMIN_PASSWORD=your-secure-grafana-password

# Update URLs for your domain:
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

## SSL Certificates

### Option 1: Self-Signed Certificates (Development/Testing)

The deployment script will automatically generate self-signed certificates if none exist.

### Option 2: Let's Encrypt (Recommended for Production)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
```

### Option 3: Custom Certificates

Place your certificates in the `ssl/` directory:
- `ssl/cert.pem` - Certificate file
- `ssl/key.pem` - Private key file

## Database Setup

### Initial Setup

The deployment process will automatically:
1. Create the PostgreSQL database
2. Run initial migrations
3. Set up proper user permissions

### Manual Database Operations

```bash
# Run migrations manually
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Seed initial data (if needed)
docker-compose -f docker-compose.prod.yml exec backend npm run db:seed
```

## Deployment Process

### Automated Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run full deployment
./scripts/deploy.sh deploy
```

### Manual Deployment Steps

```bash
# 1. Build and start services
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 2. Wait for services to be healthy
docker-compose -f docker-compose.prod.yml ps

# 3. Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# 4. Create initial backup
./scripts/backup.sh
```

### Deployment Verification

```bash
# Check service status
./scripts/deploy.sh status

# Run health checks
./scripts/health-check.sh

# View logs
./scripts/deploy.sh logs
```

## Monitoring and Logging

### Access Monitoring Dashboards

- **Grafana**: http://your-server:3000 (admin/your-grafana-password)
- **Prometheus**: http://your-server:9090

### Log Locations

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# System logs
sudo journalctl -u docker
```

### Setting Up Alerts

1. Configure Grafana alert rules
2. Set up notification channels (email, Slack, etc.)
3. Create custom dashboards for business metrics

## Backup and Recovery

### Automated Backups

```bash
# Create backup
./scripts/backup.sh

# Schedule daily backups (add to crontab)
0 2 * * * /path/to/machine-rental-system/scripts/backup.sh
```

### Manual Backup

```bash
# Create immediate backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres machine_rental > backup.sql
```

### Recovery Process

```bash
# Restore from backup
./scripts/restore.sh /backups/backup_machine_rental_20231201_020000.sql.gz
```

### Backup Strategy

- **Daily**: Automated database backups
- **Weekly**: Full system backup including volumes
- **Monthly**: Archive old backups to external storage
- **Retention**: Keep 30 days of daily backups, 12 weeks of weekly backups

## Maintenance

### Regular Maintenance Tasks

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean up old Docker resources
docker system prune -f
```

### Scaling Services

```bash
# Scale backend service
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale with load balancer configuration
# (Requires additional nginx configuration)
```

### Security Updates

1. Regularly update base Docker images
2. Monitor security advisories for dependencies
3. Update SSL certificates before expiration
4. Review and rotate secrets periodically

## Troubleshooting

### Common Issues

#### Services Not Starting

```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check system resources
df -h
free -h
docker system df
```

#### Database Connection Issues

```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### SSL Certificate Issues

```bash
# Verify certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443
```

#### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check application metrics
curl https://yourdomain.com/api/metrics
```

### Emergency Procedures

#### Service Recovery

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

#### Database Recovery

```bash
# Emergency database restore
./scripts/restore.sh /backups/latest-backup.sql.gz
```

#### Rollback Deployment

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore from backup
./scripts/restore.sh /backups/pre-deployment-backup.sql.gz

# Start previous version
git checkout previous-tag
./scripts/deploy.sh deploy
```

## Production Checklist

### Pre-Deployment Checklist

**Infrastructure Setup:**
- [ ] Server meets minimum requirements (4+ cores, 8+ GB RAM, 100+ GB SSD)
- [ ] Operating system is updated and hardened
- [ ] Docker and Docker Compose are installed
- [ ] Firewall is configured (ports 80, 443, SSH only)
- [ ] SSL certificates are obtained and installed
- [ ] Domain DNS is properly configured
- [ ] Backup storage is configured and tested

**Security Configuration:**
- [ ] All default passwords have been changed
- [ ] Strong, unique passwords are used for all services
- [ ] JWT secrets are properly generated (64+ characters)
- [ ] Database passwords are secure and rotated
- [ ] Redis passwords are configured
- [ ] MQTT credentials are secured
- [ ] Admin IP whitelist is configured
- [ ] Fail2ban is configured and active
- [ ] Security headers are enabled in nginx
- [ ] Rate limiting is properly configured

**Application Configuration:**
- [ ] All environment variables are properly configured
- [ ] Database connection is tested
- [ ] Redis connection is tested
- [ ] MQTT broker connection is tested
- [ ] Payment gateway integration is tested (sandbox)
- [ ] WhatsApp API integration is tested
- [ ] Google OAuth is configured and tested
- [ ] Email notifications are configured (if used)

**Monitoring and Logging:**
- [ ] Prometheus is configured and collecting metrics
- [ ] Grafana dashboards are imported and configured
- [ ] AlertManager is configured with notification channels
- [ ] Log aggregation (Loki) is working
- [ ] Health checks are configured for all services
- [ ] Backup monitoring is configured
- [ ] Disk space monitoring is configured
- [ ] Memory and CPU monitoring is configured

**Testing and Validation:**
- [ ] Unit tests are passing
- [ ] Integration tests are passing
- [ ] End-to-end tests are passing
- [ ] Property-based tests are passing
- [ ] Load testing has been performed
- [ ] Security scanning has been completed
- [ ] Penetration testing has been performed (if required)
- [ ] Backup and restore procedures have been tested

**Documentation and Procedures:**
- [ ] Deployment documentation is up to date
- [ ] Emergency procedures are documented
- [ ] Rollback procedures are documented and tested
- [ ] Monitoring runbooks are created
- [ ] Contact information is updated
- [ ] Change management process is defined

### Post-Deployment Checklist

**Immediate Verification (0-30 minutes):**
- [ ] All services are running and healthy
- [ ] Health checks are passing
- [ ] SSL certificates are working
- [ ] Frontend is accessible and functional
- [ ] API endpoints are responding
- [ ] Database connections are stable
- [ ] Authentication is working
- [ ] Payment processing is functional (test transactions)
- [ ] MQTT communication is working
- [ ] Notifications are being sent

**Short-term Monitoring (1-24 hours):**
- [ ] Monitor application logs for errors
- [ ] Check system resource usage
- [ ] Verify backup creation
- [ ] Monitor payment transactions
- [ ] Check notification delivery
- [ ] Verify machine communications
- [ ] Monitor user registrations and logins
- [ ] Check admin dashboard functionality

**Long-term Monitoring (1-7 days):**
- [ ] Monitor application performance trends
- [ ] Verify automated backup schedule
- [ ] Check log rotation and cleanup
- [ ] Monitor security alerts
- [ ] Verify certificate expiration monitoring
- [ ] Check database performance
- [ ] Monitor IoT device connectivity
- [ ] Verify maintenance notifications

### Go-Live Checklist

**Final Pre-Launch Steps:**
- [ ] Switch DNS to production servers
- [ ] Update monitoring to production thresholds
- [ ] Enable production logging levels
- [ ] Activate production payment gateway
- [ ] Enable production WhatsApp notifications
- [ ] Update Google OAuth redirect URLs
- [ ] Configure production CORS origins
- [ ] Enable production security features

**Launch Verification:**
- [ ] Complete end-to-end user journey test
- [ ] Verify machine activation workflow
- [ ] Test payment processing with real transactions
- [ ] Verify admin dashboard access and functionality
- [ ] Test notification delivery
- [ ] Verify mobile responsiveness
- [ ] Check QR code scanning functionality
- [ ] Test subscription management

**Post-Launch Monitoring:**
- [ ] Monitor real user transactions
- [ ] Watch for payment processing issues
- [ ] Monitor machine connectivity
- [ ] Check notification delivery rates
- [ ] Monitor system performance under real load
- [ ] Watch for security incidents
- [ ] Monitor backup success rates

## Support and Maintenance

### Monitoring Checklist

- [ ] Daily: Check service health and logs
- [ ] Weekly: Review performance metrics and alerts
- [ ] Monthly: Update dependencies and security patches
- [ ] Quarterly: Review and test backup/recovery procedures

### Contact Information

For deployment issues or questions:
- Technical Lead: [email]
- DevOps Team: [email]
- Emergency Contact: [phone]

---

**Note**: This deployment guide assumes a single-server deployment. For high-availability deployments, additional configuration for load balancing, database clustering, and service redundancy will be required.