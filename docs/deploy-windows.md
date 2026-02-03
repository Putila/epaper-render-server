# Deploy on Windows

## Prerequisites

Install Docker Desktop:

1. Download from https://www.docker.com/products/docker-desktop
2. Install Docker Desktop
3. Enable WSL 2 if prompted
4. Restart your computer if required
5. Launch Docker Desktop and wait for it to start

## Deploy

Open PowerShell or Command Prompt:

```powershell
cd render-server

# Build and start
docker-compose up --build -d

# Verify it's running
docker-compose ps
```

## Test

```powershell
# Download screenshot
curl -o test.png http://localhost:3000/screenshot

# Open the image
start test.png
```

Or open in browser: http://localhost:3000/screenshot

## Auto-start on Boot

1. Open Docker Desktop settings
2. Go to General
3. Enable "Start Docker Desktop when you log in"
4. The container restarts automatically (due to `restart: unless-stopped`)

## View Logs

```powershell
docker-compose logs -f
```

## Update Dashboard

Edit `public\index.html`, then:

```powershell
docker-compose up --build -d
```

## Troubleshooting

**Port 3000 already in use:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

**WSL 2 issues:**
```powershell
wsl --update
wsl --shutdown
```
Then restart Docker Desktop.
