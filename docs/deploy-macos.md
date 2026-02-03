# Deploy on macOS

## Prerequisites

Install Docker Desktop:

1. Download from https://www.docker.com/products/docker-desktop
2. Install and launch Docker Desktop
3. Wait for Docker to start (whale icon in menu bar)

Or via Homebrew:

```bash
brew install --cask docker
```

## Deploy

```bash
cd render-server

# Build and start
docker-compose up --build -d

# Verify it's running
docker-compose ps
```

## Test

```bash
curl http://localhost:3000/
curl -o test.png http://localhost:3000/screenshot
open test.png
```

Or open in browser: http://localhost:3000/screenshot

## Auto-start on Boot

1. Open Docker Desktop preferences
2. Enable "Start Docker Desktop when you log in"
3. The container will restart automatically (due to `restart: unless-stopped`)

## View Logs

```bash
docker-compose logs -f
```

## Update Dashboard

Edit `public/index.html`, then:

```bash
docker-compose up --build -d
```
