# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed
- Access to Docker registry

## Development Setup

```bash
# Run setup script
./scripts/setup.sh

# Start development server
npm start
```

## Production Build

```bash
# Build production bundle
./scripts/build.sh
```

## Docker Deployment

### Local Docker Build

```bash
# Build Docker image
docker build -f docker/Dockerfile -t ascendlyx-frontend:latest .

# Run container
docker run -p 80:80 ascendlyx-frontend:latest
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f frontend

# Stop services
docker-compose down
```

## Environment Configuration

### Development (.env)
- API_BASE_URL: http://localhost:3000/api
- LOG_LEVEL: debug
- ENABLE_ANALYTICS: false

### Production (.env.production)
- API_BASE_URL: https://api.ascendlyx.com/api
- LOG_LEVEL: error
- ENABLE_ANALYTICS: true
- ENABLE_MONITORING: true

## CI/CD Pipeline

GitHub Actions workflow automatically:
1. Runs tests on every push/PR
2. Builds Docker image on main branch
3. Pushes to Docker registry
4. Deploys to production

Required GitHub Secrets:
- DOCKER_USERNAME
- DOCKER_PASSWORD
- DOCKER_REGISTRY

## Performance Optimization

### Nginx Features
- Gzip compression enabled
- Static asset caching (30 days)
- Rate limiting (10 req/s general, 30 req/s API)
- Security headers configured

### Angular Optimization
- Production build enabled
- Source maps disabled
- Tree-shaking enabled
- Bundle analysis

## Monitoring & Logging

- Application logs: `/var/log/nginx/` (Docker)
- Error tracking: Sentry (configure SENTRY_DSN)
- Analytics: Enabled in production

## Troubleshooting

### Port Already in Use
```bash
# Change nginx port in docker-compose.yml
ports:
  - "8080:80"
```

### Build Fails
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Container Won't Start
```bash
# Check logs
docker-compose logs frontend

# Rebuild image
docker-compose up -d --build
```
