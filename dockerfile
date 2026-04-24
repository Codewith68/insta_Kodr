# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production image ──
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Backend runs on port 5000 (set via ENV, override in compose/env)
ENV PORT=5000
EXPOSE 5000

# Use node directly (not nodemon) for production
CMD ["node", "server.js"]