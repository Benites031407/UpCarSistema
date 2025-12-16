# Machine Rental System

A comprehensive IoT-enabled platform for renting time-based access to machines through QR code scanning and payment processing.

## Architecture

This is a monorepo containing three main packages:

- **Frontend** (`packages/frontend`): React-based customer interface and admin dashboard
- **Backend** (`packages/backend`): Node.js API server with authentication, payment processing, and IoT communication
- **IoT Controller** (`packages/iot-controller`): Raspberry Pi controller for machine hardware integration

## Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL database
- Redis server
- MQTT broker (Mosquitto)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   # Copy example files and configure
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.example packages/frontend/.env
   cp packages/iot-controller/.env.example packages/iot-controller/.env
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:3001
- IoT Controller (if configured)

## Development Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages

## Package-Specific Commands

### Frontend
```bash
npm run dev:frontend    # Start frontend dev server
npm run build --workspace=@machine-rental/frontend
npm run test --workspace=@machine-rental/frontend
```

### Backend
```bash
npm run dev:backend     # Start backend dev server
npm run build --workspace=@machine-rental/backend
npm run test --workspace=@machine-rental/backend
```

### IoT Controller
```bash
npm run dev:iot         # Start IoT controller
npm run build --workspace=@machine-rental/iot-controller
npm run test --workspace=@machine-rental/iot-controller
```

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Redis
- **IoT**: Raspberry Pi, MQTT, GPIO control
- **Testing**: Vitest, fast-check (property-based testing)

## Project Structure

```
machine-rental-system/
├── packages/
│   ├── frontend/          # React customer interface & admin dashboard
│   ├── backend/           # Node.js API server
│   └── iot-controller/    # Raspberry Pi controller
├── package.json           # Root package.json with workspaces
└── README.md
```

## Production Deployment

For production deployment, this project includes comprehensive Docker containerization and deployment automation.

### Quick Production Setup

1. **Configure Environment**:
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with your production values
   ```

2. **Deploy with Docker Compose**:
   ```bash
   # Linux/macOS
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh deploy
   
   # Windows
   .\scripts\setup.ps1 deploy
   ```

3. **Access Services**:
   - Frontend: https://localhost
   - API: https://localhost/api
   - Admin Dashboard: https://localhost/admin
   - Monitoring: http://localhost:3000 (Grafana)

### Deployment Features

- **Containerized Services**: All components run in Docker containers
- **Load Balancing**: Nginx reverse proxy with SSL termination
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Automated Backups**: Daily database backups with retention
- **Health Checks**: Comprehensive service health monitoring
- **Security**: SSL/TLS encryption, rate limiting, security headers
- **CI/CD**: GitHub Actions workflow for automated deployment

### Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Complete deployment guide
- **[.kiro/specs/machine-rental-system/](/.kiro/specs/machine-rental-system/)**: Feature specifications and requirements

## Next Steps

1. Configure your environment variables in each package's `.env` file
2. Set up your PostgreSQL database and Redis server
3. Configure MQTT broker for IoT communication
4. For production: Follow the [deployment guide](DEPLOYMENT.md)
5. Start implementing features according to the task list in `.kiro/specs/machine-rental-system/tasks.md`

For detailed implementation guidance, refer to the specification documents in `.kiro/specs/machine-rental-system/`.