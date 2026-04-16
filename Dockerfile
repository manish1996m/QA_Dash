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

# Install system dependencies needed for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Copy the server files and database layer
COPY server.ts ./
COPY db/ ./db/
COPY tsconfig.json ./

# Create a data directory for SQLite (Best practice for GKE volumes)
RUN mkdir -p /app/data

# Set environment to production
ENV NODE_ENV=production

# Expose the backend port
EXPOSE 3001

# Start the server using tsx (as currently configured in the project)
# Note: In a final production step, we could compile server.ts to JS, 
# but tsx is robust and matches your current workflow perfectly.
CMD ["npx", "tsx", "server.ts"]
