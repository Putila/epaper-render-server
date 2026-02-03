# E-Paper Render Server

A Dockerized server that hosts a dashboard webpage and serves screenshots as PNG images for e-paper displays.

## Endpoints

- `http://localhost:3000/` - View dashboard
- `http://localhost:3000/screenshot` - Get PNG screenshot (800x480)
- `http://localhost:3000/screenshot?width=400&height=240` - Custom dimensions

## Deployment Guides

- [Linux](docs/deploy-linux.md)
- [macOS](docs/deploy-macos.md)
- [Windows](docs/deploy-windows.md)
- [FreeNAS/TrueNAS](docs/deploy-freenas.md)

## Quick Start

```bash
docker-compose up --build -d
```

## Customization

Edit `public/index.html` with your dashboard content, then rebuild:

```bash
docker-compose up --build -d
```

## Testing

```bash
./test.sh
```
