# Deploy on Linux

## Prerequisites

Install Docker and Docker Compose:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to docker group (logout required)
sudo usermod -aG docker $USER
```

## Deploy

```bash
# Clone or copy the render-server folder
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
```

## Auto-start on Boot

Docker Compose with `restart: unless-stopped` handles this automatically.

## View Logs

```bash
docker-compose logs -f
```

## Update Dashboard

Edit `public/index.html`, then:

```bash
docker-compose up --build -d
```
