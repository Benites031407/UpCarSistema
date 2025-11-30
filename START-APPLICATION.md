# 🚀 Machine Rental System - Quick Start Guide

## ✅ Application is Running!

All services are now started and ready for testing.

## 🌐 Access Points

### Frontend (User Interface)
- **URL**: http://localhost:3000
- **Description**: Main web application for customers and admins

### Backend API
- **URL**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Documentation**: http://localhost:3001/api

## 📊 Service Status

### ✅ Running Services:
1. **Frontend** - Port 3000 (Vite dev server)
2. **Backend** - Port 3001 (Express API)
3. **PostgreSQL** - Port 5432 (Database)
4. **MQTT Broker** - Port 1884 (IoT messaging)
5. **Redis** - Port 6380 (Session storage - degraded mode OK)

### 📡 Service Health:
- **Database**: ✅ Connected
- **MQTT**: ✅ Connected  
- **WebSocket**: ✅ Initialized
- **Redis**: ⚠️ Degraded (optional - sessions will use fallback)

## 🧪 Test the Application

### 1. Open the Frontend
```
http://localhost:3000
```

### 2. Test API Health
```powershell
curl http://localhost:3001/health
```

### 3. Test API Endpoints
```powershell
# Get machines list
curl http://localhost:3001/api/machines

# Get API info
curl http://localhost:3001/api
```

## 🛠️ Available Features

### Customer Features:
- ✅ User registration and login
- ✅ Browse available machines
- ✅ Scan QR codes
- ✅ Make payments (PIX)
- ✅ Start/stop machine sessions
- ✅ View session history
- ✅ Manage account balance

### Admin Features:
- ✅ Machine management
- ✅ Customer management
- ✅ Analytics dashboard
- ✅ Maintenance scheduling
- ✅ Real-time monitoring
- ✅ Transaction history

### IoT Features:
- ✅ MQTT communication
- ✅ Real-time machine status
- ✅ Remote machine control
- ✅ Offline detection
- ✅ Automatic session management

## 🔧 Managing Services

### View Running Processes
The following processes are running in the background:
- **Process ID 4**: Frontend (npm run dev)
- **Process ID 5**: Backend (npm run dev)

### Stop Services
To stop the application:
```powershell
# Stop frontend
Stop-Process -Id 4

# Stop backend  
Stop-Process -Id 5

# Stop Docker services
docker-compose -f docker-compose.test-local.yml down
```

### Restart Services
If you need to restart:
```powershell
# Backend
cd packages/backend
npm run dev

# Frontend
cd packages/frontend
npm run dev
```

## 📝 Default Credentials

### Test User
- **Email**: test@example.com
- **Password**: (create during registration)

### Admin User
- **Email**: admin@localhost
- **Role**: Admin (configured in .env)

## 🐛 Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```powershell
# Find process using port 3000
netstat -ano | findstr ":3000"

# Kill the process (replace PID)
Stop-Process -Id <PID> -Force
```

### Database Connection Issues
```powershell
# Check PostgreSQL is running
docker ps | findstr postgres

# Restart PostgreSQL
docker-compose -f docker-compose.test-local.yml restart postgres-test
```

### MQTT Connection Issues
```powershell
# Check MQTT broker
docker ps | findstr mosquitto

# Restart MQTT
docker-compose -f docker-compose.test-local.yml restart mosquitto-test
```

## 📚 Additional Resources

- **API Documentation**: See `packages/backend/README.md`
- **Frontend Guide**: See `packages/frontend/README.md`
- **Testing Guide**: See `TESTING-COMPLETE-GUIDE.md`
- **Deployment Guide**: See `DEPLOYMENT.md`

## 🎯 Next Steps

1. Open http://localhost:3000 in your browser
2. Create a test account
3. Explore the features
4. Check the admin dashboard
5. Test machine operations

---

**Status**: ✅ All systems operational
**Last Updated**: 2025-11-27
**Environment**: Development
