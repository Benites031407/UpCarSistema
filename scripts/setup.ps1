# PowerShell setup script for Machine Rental System deployment
# This script sets up the deployment environment on Windows

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production"
)

# Configuration
$ComposeFile = "docker-compose.prod.yml"
$EnvFile = ".env.prod"

# Function to write colored output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Info($message) {
    Write-ColorOutput Green "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] WARNING: $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $message"
    exit 1
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if Docker is installed
    try {
        $dockerVersion = docker --version
        Write-Info "Docker found: $dockerVersion"
    } catch {
        Write-Error "Docker is not installed or not in PATH"
    }
    
    # Check if Docker Compose is available
    try {
        $composeVersion = docker-compose --version
        Write-Info "Docker Compose found: $composeVersion"
    } catch {
        try {
            $composeVersion = docker compose version
            Write-Info "Docker Compose (plugin) found: $composeVersion"
        } catch {
            Write-Error "Docker Compose is not installed"
        }
    }
    
    # Check if environment file exists
    if (-not (Test-Path $EnvFile)) {
        Write-Error "Environment file '$EnvFile' not found. Please copy from .env.prod.example and configure."
    }
    
    Write-Info "Prerequisites check passed"
}

# Create necessary directories
function New-Directories {
    Write-Info "Creating necessary directories..."
    
    $directories = @("backups", "ssl", "logs", "monitoring\grafana\dashboards", "monitoring\grafana\datasources")
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Info "Created directory: $dir"
        }
    }
    
    Write-Info "Directories created"
}

# Generate SSL certificates
function New-SSLCertificates {
    if (-not (Test-Path "ssl\cert.pem") -or -not (Test-Path "ssl\key.pem")) {
        Write-Info "Generating self-signed SSL certificates..."
        
        try {
            # Generate private key
            openssl genrsa -out ssl\key.pem 2048
            
            # Generate certificate
            openssl req -new -x509 -key ssl\key.pem -out ssl\cert.pem -days 365 -subj "/C=BR/ST=SP/L=SaoPaulo/O=MachineRental/CN=localhost"
            
            Write-Info "SSL certificates generated"
        } catch {
            Write-Warning "OpenSSL not found. Please install OpenSSL or provide SSL certificates manually."
            Write-Warning "You can download OpenSSL from: https://slproweb.com/products/Win32OpenSSL.html"
        }
    } else {
        Write-Info "SSL certificates already exist"
    }
}

# Deploy services
function Start-Services {
    Write-Info "Building and deploying services..."
    
    try {
        # Build images
        Write-Info "Building Docker images..."
        docker-compose -f $ComposeFile build --no-cache
        
        # Start services
        Write-Info "Starting services..."
        docker-compose -f $ComposeFile up -d
        
        Write-Info "Services deployed"
    } catch {
        Write-Error "Failed to deploy services: $_"
    }
}

# Wait for services to be healthy
function Wait-ForServices {
    Write-Info "Waiting for services to be healthy..."
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        $unhealthyServices = docker-compose -f $ComposeFile ps | Select-String "unhealthy"
        
        if ($unhealthyServices) {
            Write-Warning "Some services are still unhealthy (attempt $attempt/$maxAttempts)"
            Start-Sleep -Seconds 10
            $attempt++
        } else {
            Write-Info "All services are healthy"
            return
        }
    }
    
    Write-Error "Services failed to become healthy within timeout"
}

# Run database migrations
function Invoke-Migrations {
    Write-Info "Running database migrations..."
    
    try {
        docker-compose -f $ComposeFile exec backend npm run db:migrate
        Write-Info "Database migrations completed"
    } catch {
        Write-Error "Failed to run database migrations: $_"
    }
}

# Show service status
function Show-Status {
    Write-Info "Service Status:"
    docker-compose -f $ComposeFile ps
    
    Write-Info ""
    Write-Info "Services are available at:"
    Write-Info "  - Frontend: https://localhost"
    Write-Info "  - API: https://localhost/api"
    Write-Info "  - Grafana: http://localhost:3000"
}

# Main deployment process
function Start-Deployment {
    Write-Info "Starting deployment of Machine Rental System ($Environment)"
    
    Test-Prerequisites
    New-Directories
    New-SSLCertificates
    Start-Services
    Wait-ForServices
    Invoke-Migrations
    Show-Status
    
    Write-Info "Deployment completed successfully!"
}

# Handle script parameters
switch ($args[0]) {
    "deploy" { Start-Deployment }
    "status" { docker-compose -f $ComposeFile ps }
    "logs" { 
        if ($args[1]) {
            docker-compose -f $ComposeFile logs -f $args[1]
        } else {
            docker-compose -f $ComposeFile logs -f
        }
    }
    "stop" { 
        Write-Info "Stopping services..."
        docker-compose -f $ComposeFile stop 
    }
    "restart" { 
        Write-Info "Restarting services..."
        if ($args[1]) {
            docker-compose -f $ComposeFile restart $args[1]
        } else {
            docker-compose -f $ComposeFile restart
        }
    }
    default { 
        Start-Deployment
    }
}

Write-Info "Script execution completed."