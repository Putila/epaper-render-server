# Deploy on FreeNAS / TrueNAS

## Option 1: TrueNAS SCALE (Recommended)

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

## Option 2: TrueNAS CORE (Jail)

TrueNAS CORE uses FreeBSD jails instead of Docker.

### Create a Jail

1. Go to **Jails** → **Add**
2. Name: `render-server`
3. Release: Latest FreeBSD
4. Configure networking (DHCP or static IP)

### Install Inside Jail

```bash
# Enter the jail
iocage console render-server

# Install dependencies
pkg update
pkg install -y node npm chromium

# Copy your files to the jail
# From TrueNAS shell:
cp -r /mnt/pool/render-server /mnt/pool/iocage/jails/render-server/root/app

# Inside jail
cd /app
npm install

# Set environment variables
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chromium

# Run
node server.js
```

### Auto-start Service

Create `/usr/local/etc/rc.d/epaper`:

```sh
#!/bin/sh
# PROVIDE: epaper
# REQUIRE: NETWORKING
# KEYWORD: shutdown

. /etc/rc.subr

name="epaper"
rcvar="epaper_enable"
command="/usr/local/bin/node"
command_args="/app/server.js"
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

## Test

From any machine on your network:

```bash
curl http://<truenas-ip>:3000/screenshot -o test.png
```

## Update Dashboard

Edit `public/index.html`, then rebuild/restart.
