# ============================================================================
# REDMODE — Production Google Cloud Run Dockerfile (All-in-One Google Stack)
# Serves both the Vite React Storefront (dist/) and full Express Backend API
# including Orders, Admin RBAC, Delhivery, Payments, OTP & Direct Meta Webhook.
# ============================================================================

FROM node:20-slim

WORKDIR /app

# Install production & build dependencies cleanly
COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy application source
COPY . .

# Build Vite production bundle into dist/
RUN mkdir -p public && npx vite build && cp dist/index.html dist/404.html

# Production Google Cloud Run runtime configuration
ENV NODE_ENV=production
ENV REDMODE_STANDALONE_CLOUD_RUN=true
ENV PORT=8080

EXPOSE 8080

# Run full Express + static dist/ server via tsx
CMD ["./node_modules/.bin/tsx", "server.ts"]
