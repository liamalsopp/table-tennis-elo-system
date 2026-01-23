# Multi-stage build for React + Node.js app

# Stage 1: Build React app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source files
COPY . .

# Build React app
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

# Install PostgreSQL client tools for backups (pg_dump, psql)
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built React app from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server ./server
COPY src/utils/elo.js ./src/utils/elo.js

# Create directory for temporary files
RUN mkdir -p /home/LogFiles /home/data && \
    chmod -R 755 /home

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Azure App Service will set PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server/index.js"]
