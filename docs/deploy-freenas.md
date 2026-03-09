# Deploy on FreeNAS / TrueNAS

## Option 1: TrueNAS SCALE (Docker)

TrueNAS SCALE has native Docker/Kubernetes support.

### Using Apps (GUI)

1. Go to **Apps** → **Discover Apps** → **Custom App**
2. Configure:
   - **Application Name**: `epaper-render-server`
   - **Image Repository**: Build locally or push to registry first
   - **Port**: 3000 → 3000

### Using CLI

SSH into TrueNAS SCALE:

```bash
# Copy render-server folder to your TrueNAS
cd /mnt/pool/apps/render-server

# Build and run
docker-compose up --build -d
```

## Option 2: TrueNAS CORE (Jail) — Tested Setup

TrueNAS CORE uses FreeBSD jails instead of Docker. This guide uses
Firefox ESR for headless screenshots, which is compatible with FreeBSD 13.x
jails. Chromium 144+ requires the `kqueuex()` syscall from FreeBSD 14+ and
will fail with "Bad system call" on 13.x host kernels.

### Create and Configure the Jail

1. Go to **Jails** → **Add**
2. Name: `render-server`
3. Release: FreeBSD 13.x (matching your host)
4. Configure networking (DHCP or static IP)

### Configure Jail Properties

These settings are required from the **TrueNAS host shell** (not inside the jail):

```bash
# Enable shared memory (required for Firefox/Chromium)
iocage set allow_sysvipc=1 render-server

# Enable procfs (required for browser process management)
iocage set mount_procfs=1 render-server
iocage set mount_linprocfs=1 render-server
iocage set allow_mount=1 render-server
iocage set allow_mount_procfs=1 render-server

# Restart the jail to apply
iocage restart render-server
```

If procfs doesn't auto-mount, mount it manually from the host:

```bash
mkdir -p /mnt/<pool>/iocage/jails/render-server/root/proc
mount -t procfs proc /mnt/<pool>/iocage/jails/render-server/root/proc
```

### Install Dependencies Inside the Jail

```bash
# Enter the jail
iocage console render-server

# Install dependencies
pkg update
pkg install -y node npm firefox-esr

# Create app directory
mkdir -p /app
```

### Deploy the Application

From the TrueNAS host shell:

```bash
# Copy files into the jail filesystem
cp -r /path/to/epaper-render-server/* \
  /mnt/<pool>/iocage/jails/render-server/root/app/
```

Inside the jail:

```bash
cd /app
npm install

# Test that Firefox works in headless mode
firefox --headless --screenshot /tmp/test.png https://example.com
ls -la /tmp/test.png  # Should show a PNG file

# Start the server
node server.js
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `WIDTH` | `800` | Default grid screenshot width |
| `HEIGHT` | `480` | Default grid screenshot height |
| `FIREFOX_PATH` | `/usr/local/bin/firefox` | Path to Firefox binary |
| `PORTRAIT_DELAY` | `10000` | Delay (ms) before portrait screenshot |
| `GRID_DELAY` | `15000` | Delay (ms) before grid screenshot |

### Auto-start Service

Create `/usr/local/etc/rc.d/epaper` inside the jail:

```sh
#!/bin/sh
# PROVIDE: epaper
# REQUIRE: NETWORKING
# KEYWORD: shutdown

. /etc/rc.subr

name="epaper"
rcvar="epaper_enable"
command="/usr/local/bin/node"
command_args="/app/server.js &"
pidfile="/var/run/${name}.pid"
epaper_user="root"

load_rc_config $name
run_rc_command "$1"
```

Enable:

```bash
chmod +x /usr/local/etc/rc.d/epaper
sysrc epaper_enable=YES
service epaper start
```

## Endpoints

| Endpoint | Description |
|---|---|
| `/` | Dashboard (portrait layout) |
| `/grid` | Grid layout (landscape) |
| `/screenshot` | Screenshot of portrait layout (PNG) |
| `/screenshot/grid` | Screenshot of grid layout (PNG) |
| `/capture` | Internal: wrapper page for portrait screenshot with delay |
| `/capture/grid` | Internal: wrapper page for grid screenshot with delay |

Query parameters for screenshot endpoints:
- `width` — Screenshot width in pixels
- `height` — Screenshot height in pixels

## How Screenshots Work

Since Puppeteer/Chromium is incompatible with FreeBSD 13.x jails (due to
the missing `kqueuex()` syscall), this server uses Firefox ESR's built-in
`--headless --screenshot` mode instead.

To ensure dynamic content (iframes, weather API, gym schedule) has time to
load, the server uses a delayed-image technique:

1. The `/capture` page loads the actual dashboard in an iframe
2. It also includes a 1x1 transparent PNG from `/delay-image?ms=N`
3. The `/delay-image` endpoint waits N milliseconds before responding
4. Firefox's `--screenshot` waits for the page `load` event
5. The `load` event won't fire until the delayed image loads, giving
   dynamic content time to render

## Troubleshooting

### "Bad system call" when running Firefox/Chromium

Your jail is missing required settings. From the TrueNAS host:

```bash
iocage set allow_sysvipc=1 render-server
iocage restart render-server
```

### Chromium fails with `kqueuex()` error

Chromium 144+ requires FreeBSD 14+ kernel. If your TrueNAS host runs
FreeBSD 13.x, use Firefox ESR instead. The server is already configured
to use Firefox.

### Screenshots show incomplete content

Increase the delay environment variables:

```bash
export PORTRAIT_DELAY=15000
export GRID_DELAY=20000
node server.js
```

### Weather widget shows "Loading..."

Check that the jail has internet access and DNS is configured:

```bash
fetch -q -o - https://api.open-meteo.com/v1/forecast?latitude=61.5&longitude=23.8&current_weather=true
```

## Test

From any machine on your network:

```bash
curl http://<jail-ip>:3000/screenshot -o test.png
curl http://<jail-ip>:3000/screenshot/grid -o test-grid.png
```

## Update Dashboard

Edit files in `public/`, copy to the jail, and restart the server.
