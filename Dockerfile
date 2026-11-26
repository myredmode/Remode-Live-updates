# ============================================================================
# REDMODE — Production Google Cloud Run Dockerfile (All-in-One Google Stack)
# Serves both the Vite React Storefront (dist/) and full Express Backend API
# including Orders, Admin RBAC, Delhivery, Payments, OTP & Direct Meta Webhook.
# ============================================================================

FROM node:22-slim

WORKDIR /app

# Install production & build dependencies cleanly
COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy application source
COPY . .

# Build Vite production bundle into dist/ and compile Express server with esbuild
RUN mkdir -p public && npx vite build && cp dist/index.html dist/404.html && npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=dist-server.mjs

# Production Google Cloud Run runtime configuration
ENV NODE_ENV=production
ENV REDMODE_STANDALONE_CLOUD_RUN=true
ENV PORT=8080

EXPOSE 8080

# Run compiled Express + static dist/ server directly via Node.js (fast cold start, low RAM)
CMD ["node", "dist-server.mjs"]
