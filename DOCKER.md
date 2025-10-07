# Docker Deployment Guide

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
