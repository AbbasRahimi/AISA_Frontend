# Docker Deployment Guide

## Overview

This project has multiple Docker Compose configurations for different deployment scenarios.

---

## 🚀 Deployment Scenarios

### **Scenario 1: Full Stack Deployment (RECOMMENDED for Production)**

**Location:** `AISA_Backend/docker-compose.yml`

**What it runs:**
- PostgreSQL database
- Backend API (FastAPI)
- Frontend (React + Nginx)

**Usage:**
```bash
cd AISA_Backend
docker-compose up -d
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Database: localhost:5431

**When to use:**
- Production deployment
- Full system testing
- Running complete application stack

---

### **Scenario 2: Frontend-Only Development**

**Location:** `AISA_Frontend/docker-compose.dev.yml`

**What it runs:**
- Frontend only (in Docker)

**Prerequisites:**
- Backend must be running on host machine (not in Docker)

**Usage:**
```bash
# Terminal 1: Start backend on host
cd AISA_Backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Start frontend in Docker
cd AISA_Frontend
docker-compose -f docker-compose.dev.yml up
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (on host)

**When to use:**
- Developing frontend features
- UI/UX work
- Frontend debugging

---

### **Scenario 3: Frontend-Only Production (Separate Backend)**

**Location:** `AISA_Frontend/docker-compose.yml`

**What it runs:**
- Frontend only (in Docker)

**Prerequisites:**
- Backend deployed separately (different server/service)

**Configuration:**
Update `REACT_APP_API_URL` in docker-compose.yml to point to your backend:
```yaml
environment:
  - REACT_APP_API_URL=https://api.yourdomain.com
```

**Usage:**
```bash
cd AISA_Frontend
docker-compose up -d
```

**When to use:**
- Deploying frontend and backend on different servers
- Microservices architecture
- Separate frontend container deployment

---

## 📝 Important Notes

### Container Networking

1. **Inside Docker Network:** Containers communicate using service names
   ```
   http://literature-search-web:8000  ← Backend service name
   ```

2. **From Container to Host:** Use `host.docker.internal`
   ```
   http://host.docker.internal:8000  ← Reaches host machine
   ```

3. **From Host to Container:** Use `localhost` with exposed port
   ```
   http://localhost:3000  ← Reaches container from browser
   ```

### Environment Variables

Frontend environment variables must be set at **build time** (not runtime) because React builds static files.

To change API URL:
1. Update `REACT_APP_API_URL` in docker-compose.yml
2. Rebuild: `docker-compose build --no-cache aisa-frontend`
3. Restart: `docker-compose up -d`

---

## 🛠️ Common Commands

### Full Stack (from Backend directory)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View running containers
docker-compose ps
```

### Frontend Only (from Frontend directory)
```bash
# Development mode
docker-compose -f docker-compose.dev.yml up

# Production mode
docker-compose up -d

# Rebuild frontend
docker-compose build --no-cache
```

### Cleanup
```bash
# Remove containers and networks
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a
```

---

## 🔧 Troubleshooting

### Frontend can't connect to Backend

**Problem:** API calls failing with network errors

**Solutions:**
1. Check backend is running: `curl http://localhost:8000/api/health`
2. Verify `REACT_APP_API_URL` is correct
3. Check containers are on same network: `docker network inspect aisa-network`
4. Rebuild frontend if URL changed: `docker-compose build --no-cache aisa-frontend`

### Port already in use

**Problem:** `Error: port is already allocated`

**Solutions:**
1. Check what's using the port: `netstat -ano | findstr :3000`
2. Stop conflicting service or change port in docker-compose.yml
3. Stop all containers: `docker-compose down`

### Database connection failed

**Problem:** Backend can't connect to PostgreSQL

**Solutions:**
1. Wait for database to be healthy: `docker-compose ps`
2. Check database logs: `docker-compose logs postgres`
3. Verify credentials in environment variables match

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [React Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Nginx Configuration](https://nginx.org/en/docs/)
