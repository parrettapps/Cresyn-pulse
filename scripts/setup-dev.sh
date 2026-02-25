#!/bin/bash
# ============================================================
# DEV ENVIRONMENT SETUP SCRIPT
# Run once after cloning: ./scripts/setup-dev.sh
# ============================================================

set -e

echo "🚀 Setting up Cresyn Pulse development environment..."

# 1. Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found. Run: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Install from https://docker.com"; exit 1; }

echo "✅ Prerequisites OK"

# 2. Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo "⚠️  IMPORTANT: Fill in your .env values before starting the API"
else
  echo "ℹ️  .env already exists — skipping"
fi

# 3. Install dependencies
echo "Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"

# 4. Start Docker services
echo "Starting PostgreSQL and Redis..."
docker compose up -d
echo "Waiting for services to be healthy..."
sleep 5

# 5. Run database migrations
echo "Running database migrations..."
pnpm db:migrate
echo "✅ Database migrations complete"

echo ""
echo "✅ Development environment ready!"
echo ""
echo "Start the API:    pnpm --filter @cresyn/api dev"
echo "Start the web:    pnpm --filter @cresyn/web dev"
echo "Start both:       pnpm dev"
echo "DB Studio:        pnpm db:studio"
echo ""
echo "⚠️  Next steps:"
echo "  1. Fill in your .env file (Google/Microsoft OAuth credentials, etc.)"
echo "  2. Generate JWT_SECRET: openssl rand -base64 64"
echo "  3. Generate BETTER_AUTH_SECRET: openssl rand -base64 32"
