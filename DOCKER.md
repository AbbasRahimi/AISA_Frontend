# Docker Deployment Guide

<<<<<<< HEAD
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
=======
This guide explains how to dockerize and deploy the Literature Search Auto Validation React frontend.

## 🐳 Docker Files Overview

### Core Files
- `Dockerfile` - Multi-stage build configuration
- `docker-compose.yml` - Production deployment
- `docker-compose.dev.yml` - Development deployment
- `nginx.conf` - Nginx web server configuration
- `.dockerignore` - Docker build optimization

### Configuration Files
- `docker.env.example` - Environment variables template
- `health-check.sh` - Health check script

## 🚀 Quick Start

### 1. Build and Run with Docker Compose (Recommended)

```bash
# Production deployment
npm run docker:prod

# Development deployment
npm run docker:dev

# Stop containers
npm run docker:stop

# View logs
npm run docker:logs
```

### 2. Manual Docker Commands

```bash
# Build the image
docker build -t aisa-frontend .

# Run the container
docker run -p 3000:80 aisa-frontend

# Or use npm scripts
npm run docker:build
npm run docker:run
```

## 📋 Detailed Instructions

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)

### Production Deployment

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd AISA_Frontend
   ```

2. **Build and start the application:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Health check: http://localhost:3000/health

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Development Deployment

For development with hot reloading:

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up --build
```

### Environment Configuration

1. **Copy environment template:**
   ```bash
   cp docker.env.example .env
   ```

2. **Modify environment variables:**
   ```bash
   # Edit .env file
   REACT_APP_API_URL=http://your-backend-url:8001
   FRONTEND_PORT=3000
   ```

## 🔧 Docker Configuration Details

### Multi-Stage Build

The Dockerfile uses a multi-stage build process:

1. **Build Stage**: Uses Node.js to build the React application
2. **Production Stage**: Uses Nginx to serve the built application

### Nginx Configuration

The `nginx.conf` includes:
- Gzip compression for better performance
- Security headers
- SPA routing support
- Static asset caching
- API proxy configuration
- Health check endpoint

### Health Checks

The container includes health checks that verify:
- Application is responding
- Nginx is serving content
- Health endpoint is accessible

## 🌐 Network Configuration

### Default Setup
- Frontend: Port 3000 → Container Port 80
- Backend API: Expected at localhost:8001
- Internal network: `aisa-network`

### Custom Network Configuration

Modify `docker-compose.yml`:

```yaml
services:
  aisa-frontend:
    ports:
      - "8080:80"  # Change external port
    environment:
      - REACT_APP_API_URL=http://your-backend:8001
```

## 📊 Monitoring and Logs

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs aisa-frontend

# Follow logs
docker-compose logs -f aisa-frontend
```

### Health Monitoring
```bash
# Check container health
docker ps

# Manual health check
curl http://localhost:3000/health
```

## 🔒 Security Considerations

### Production Security
- Security headers configured in nginx
- Non-root user in container
- Minimal attack surface with Alpine Linux
- No unnecessary packages installed

### Environment Variables
- Never commit `.env` files
- Use Docker secrets for sensitive data
- Rotate API keys regularly

## 🚀 Deployment Options

### 1. Local Development
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 2. Production Server
```bash
docker-compose up -d --build
```

### 3. Cloud Deployment

#### AWS ECS
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag aisa-frontend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/aisa-frontend:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/aisa-frontend:latest
```

#### Google Cloud Run
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/aisa-frontend
gcloud run deploy --image gcr.io/PROJECT-ID/aisa-frontend --platform managed
```

#### Azure Container Instances
```bash
# Build and push to ACR
az acr build --registry <registry-name> --image aisa-frontend .
az container create --resource-group <resource-group> --name aisa-frontend --image <registry-name>.azurecr.io/aisa-frontend:latest --ports 80
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Kill the process or change port
   docker-compose down
   ```

2. **Build Failures**
   ```bash
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild without cache
   docker-compose build --no-cache
   ```

3. **API Connection Issues**
   - Verify backend is running on port 8001
   - Check `REACT_APP_API_URL` environment variable
   - Ensure network connectivity

4. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

### Debug Commands

```bash
# Enter container shell
docker exec -it aisa-frontend sh

# Check nginx configuration
docker exec aisa-frontend nginx -t

# View nginx logs
docker exec aisa-frontend tail -f /var/log/nginx/error.log
```

## 📈 Performance Optimization

### Build Optimization
- Multi-stage build reduces image size
- `.dockerignore` excludes unnecessary files
- Alpine Linux base image for minimal size

### Runtime Optimization
- Nginx gzip compression
- Static asset caching
- Health checks for reliability

### Monitoring
- Container health checks
- Log aggregation
- Resource usage monitoring

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker image
        run: docker build -t aisa-frontend .
      - name: Run tests
        run: docker run --rm aisa-frontend npm test
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [React Production Build Guide](https://create-react-app.dev/docs/production-build/)

## 🆘 Support

For issues related to Docker deployment:
1. Check the logs: `docker-compose logs`
2. Verify configuration files
3. Test with minimal setup
4. Check Docker and Docker Compose versions

For application-specific issues, refer to the main README.md file.
>>>>>>> a226803efc92a58d894f5fd1695000f7ec894712
