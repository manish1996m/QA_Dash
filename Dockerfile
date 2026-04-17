# --- Stage 1: Build Frontend ---
FROM node:20-bookworm AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the React frontend
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:20-bookworm-slim

# Install system dependencies needed for better-sqlite3 and healthcheck
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies (including tsx now)
RUN npm install --omit=dev

# Copy the built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Copy the server files and database layer
COPY server.ts ./
COPY db/ ./db/
COPY tsconfig.json ./

# Create a data directory for SQLite and set permissions for the 'node' user
RUN mkdir -p /app/data && chown -R node:node /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER node

# Expose the backend port
EXPOSE 3001

# Healthcheck to ensure the container is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/qa-dashboard/health || exit 1

# Start the server
CMD ["npx", "tsx", "server.ts"]
