---
name: restart
description: Stop and restart all development services (Docker containers, API, and web frontend) in the correct order for the cresyn-pulse monorepo
disable-model-invocation: true
allowed-tools: Bash(*)
---

# Restart Development Services

Restart all development services for the cresyn-pulse project in the correct order. This ensures Docker containers, the API server, and the web frontend are cleanly restarted.

## Overview

This skill will:
1. Stop all running development processes (frontend, backend, background tasks)
2. Stop Docker containers (PostgreSQL, Redis)
3. Start Docker containers and wait for them to be ready
4. Start development servers (API + Web)
5. Verify everything is running
6. Report success

## Execution Steps

### Step 1: Stop existing development processes

Stop any background pnpm dev processes and kill running services:

```bash
# Kill any running development servers
pkill -f "tsx.*server.ts" || true
pkill -f "next dev" || true
pkill -f "pnpm.*dev" || true

# Give processes time to exit gracefully
sleep 2
```

### Step 2: Stop Docker containers

Stop PostgreSQL and Redis containers:

```bash
cd /Users/kparrett/Desktop/cresyn-pulse
docker compose down
```

Wait for containers to fully stop:

```bash
sleep 2
```

### Step 3: Start Docker containers

Start PostgreSQL and Redis:

```bash
cd /Users/kparrett/Desktop/cresyn-pulse
docker compose up -d
```

### Step 4: Wait for Docker services to be ready

PostgreSQL and Redis need time to initialize:

```bash
echo "Waiting for PostgreSQL and Redis to be ready..."
sleep 5

# Verify PostgreSQL is accepting connections
docker compose exec -T postgres pg_isready -U postgres || echo "PostgreSQL starting up..."

# Verify Redis is ready
docker compose exec -T redis redis-cli ping || echo "Redis starting up..."

# Give services a moment more to fully initialize
sleep 2
```

### Step 5: Start development servers

Start both API and web servers in the background:

```bash
cd /Users/kparrett/Desktop/cresyn-pulse
pnpm dev > /tmp/cresyn-pulse-dev.log 2>&1 &

# Save the PID for future reference
echo $! > /tmp/cresyn-pulse-dev.pid
```

### Step 6: Wait for servers to start

Wait for the API and web servers to compile and start:

```bash
echo "Waiting for development servers to start..."
sleep 8

# Tail the log to see startup progress
tail -20 /tmp/cresyn-pulse-dev.log
```

### Step 7: Verify services are running

Check that all services are accessible:

```bash
# Check Docker services
echo "=== Docker Services ==="
docker compose ps

# Check if API is responding
echo ""
echo "=== API Health Check ==="
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✓ API server is responding on port 3001"
else
  echo "⚠ API server not yet responding (may still be starting)"
fi

# Check if web server is responding
echo ""
echo "=== Web Server Check ==="
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✓ Web server is responding on port 3000"
else
  echo "⚠ Web server not yet responding (may still be starting)"
fi
```

### Step 8: Report success

```bash
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✓ All services have been restarted!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Services running:"
echo "  • PostgreSQL: docker compose exec postgres pg_isready"
echo "  • Redis: docker compose exec redis redis-cli ping"
echo "  • API: http://localhost:3001"
echo "  • Web: http://localhost:3000"
echo ""
echo "View logs: tail -f /tmp/cresyn-pulse-dev.log"
echo "Stop services: pkill -f 'pnpm.*dev' && docker compose down"
echo ""
```

## Notes

- Services are started in the background and logs are written to `/tmp/cresyn-pulse-dev.log`
- The process ID is saved to `/tmp/cresyn-pulse-dev.pid`
- Docker containers are started in detached mode (`-d`)
- All commands run from the project root: `/Users/kparrett/Desktop/cresyn-pulse`

## Troubleshooting

If services fail to start:
1. Check logs: `tail -f /tmp/cresyn-pulse-dev.log`
2. Check Docker: `docker compose logs`
3. Verify ports aren't in use: `lsof -i :3000` and `lsof -i :3001`
4. Manually restart: `cd /Users/kparrett/Desktop/cresyn-pulse && pnpm dev`
