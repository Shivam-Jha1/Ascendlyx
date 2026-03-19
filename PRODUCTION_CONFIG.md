# Production Environment & Configuration Guide

## Overview
This document covers all production-level configurations for the Ascendlyx Frontend application.

## Directory Structure

```
frontend/
├── .env                           # Development environment variables
├── .env.production                # Production environment variables
├── .env.example                   # Environment template
├── .github/
│   └── workflows/
│       └── build-deploy.yml       # CI/CD GitHub Actions workflow
├── docker/
│   ├── Dockerfile                 # Production Docker image
│   └── nginx.conf                 # Nginx configuration
├── docker-compose.yml             # Docker Compose orchestration
├── scripts/
│   ├── setup.sh                   # Setup script
│   ├── build.sh                   # Build script
│   └── deploy.sh                  # Deployment script
├── src/
│   ├── environments/
│   │   ├── environment.ts         # Development config
│   │   └── environment.production.ts  # Production config
│   └── app/core/
│       ├── config/
│       │   └── app.config.ts      # App configuration
│       └── services/
│           ├── logger.service.ts      # Logging service
│           └── error-handler.service.ts  # Error handling
├── config/
│   ├── scripts.config.json        # NPM scripts config
│   ├── security.config.json       # Security headers
│   └── cache.config.json          # Caching strategy
├── tsconfig.production.json       # Production TypeScript config
├── DEPLOYMENT.md                  # Deployment guide
└── PRODUCTION_CONFIG.md           # This file
```

## Environment Variables

### Development (.env)
```env
NODE_ENV=development
API_BASE_URL=http://localhost:3000/api
LOG_LEVEL=debug
ENABLE_ANALYTICS=false
ENABLE_MONITORING=false
```

### Production (.env.production)
```env
NODE_ENV=production
API_BASE_URL=https://api.ascendlyx.com/api
LOG_LEVEL=error
ENABLE_ANALYTICS=true
ENABLE_MONITORING=true
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

## Services

### 1. LoggerService
Centralized logging service with configurable log levels.

**Usage:**
```typescript
import { LoggerService } from './core/services/logger.service';

constructor(private logger: LoggerService) {}

this.logger.debug('Debug message');
this.logger.info('Info message');
this.logger.warn('Warning message');
this.logger.error('Error message', error);
```

### 2. ErrorHandlerService
Comprehensive error handling with monitoring integration.

**Usage:**
```typescript
import { ErrorHandlerService } from './core/services/error-handler.service';

constructor(private errorHandler: ErrorHandlerService) {}

try {
  // Code
} catch (error) {
  const errorResponse = this.errorHandler.handleError(error);
}
```

### 3. AppConfig
Centralized application configuration constants.

**Usage:**
```typescript
import { CONFIG } from './core/config/app.config';

const apiUrl = CONFIG.api.baseUrl;
const sessionTimeout = CONFIG.auth.sessionTimeout;
```

## Docker & Containerization

### Build Docker Image
```bash
docker build -f docker/Dockerfile -t ascendlyx-frontend:latest .
```

### Run Docker Container
```bash
docker run -p 80:80 \
  -e NODE_ENV=production \
  ascendlyx-frontend:latest
```

### Docker Compose
```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## Nginx Configuration

The `docker/nginx.conf` includes:
- Gzip compression for assets
- Rate limiting (10 req/s general, 30 req/s API)
- Security headers (HSTS, X-Frame-Options, CSP)
- Static asset caching (30 days)
- Angular routing support (SPA)
- Health checks

## Security Features

### Headers
- **Content-Security-Policy**: Restricts resource loading
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Strict-Transport-Security**: Enforces HTTPS
- **Permissions-Policy**: Restricts browser APIs

### Rate Limiting
- General endpoints: 10 requests/second
- API endpoints: 30 requests/second
- Burst allowed: 20-50 requests

### CORS
Configure in your backend API:
```javascript
cors({
  origin: 'https://ascendlyx.com',
  credentials: true
})
```

## Performance Optimization

### Bundle Analysis
```bash
npm run analyze
```

### Build Optimizations
- Tree-shaking enabled
- Dead code elimination
- AOT compilation
- Source maps disabled in production

### Caching Strategy
- Assets: 30-day cache
- HTML: No cache (always fetch latest)
- API responses: Network-first strategy

## CI/CD Pipeline

### GitHub Actions Workflow
Automatically triggered on:
- Push to `main` or `develop` branches
- Pull requests

Steps:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run linting
5. Build application
6. Run tests with coverage
7. Build Docker image (main branch only)
8. Push to Docker registry
9. Deploy to production

### Required GitHub Secrets
```
DOCKER_USERNAME
DOCKER_PASSWORD
DOCKER_REGISTRY
```

## Monitoring & Analytics

### Sentry Integration
Error tracking is enabled in production. Configure:
```typescript
// In environment.production.ts
sentryDsn: 'https://your-sentry-dsn@sentry.io/your-project-id'
```

### Analytics
Google Analytics or similar can be integrated in production environment.

## Deployment Checklist

- [ ] All environment variables configured
- [ ] .env files added to .gitignore
- [ ] Docker images built and tested
- [ ] Security headers verified
- [ ] API endpoints configured correctly
- [ ] Database connections verified
- [ ] SSL/TLS certificates valid
- [ ] Health checks passing
- [ ] Monitoring and logging configured
- [ ] Backup and recovery plan in place

## Troubleshooting

### Docker Container Won't Start
```bash
docker logs <container-id>
docker-compose logs frontend
```

### High Memory Usage
```bash
# Check running services
docker stats

# Increase memory limit in docker-compose.yml
memory: 512m
```

### Build Failures
```bash
npm cache clean --force
npm ci
npm run build -- --configuration production
```

## Support & Contact
For issues or questions, contact the DevOps team.
