#!/bin/sh
#
# epaper-watchdog.sh — keeps the render server (node /app/server.js) alive.
#
# WHY: daemon(8)'s process-descriptor supervision does NOT work in this jail
# (it fails even for `sleep`), so we can't rely on it to restart node. Cron,
# however, works fine. This script is the single source of truth for "ensure a
# healthy node is running"; cron runs it every couple of minutes.
#
# It checks an HTTP health endpoint rather than just "is the pid alive", so it
# also recovers a HUNG node (port open but not responding) — not just a crashed
# one. Before (re)starting it clears the stale Firefox lock and reaps orphaned
# Firefox processes, the usual causes of a wedged screenshot pipeline.
#
# Subcommands:
#   start   ensure node is up (used by the rc.d service + @reboot)
#   stop    stop node and pause the watchdog (creates a PAUSE marker)
#   status  print health; exit 0 if healthy, 1 if not
#   check   health-check; restart if unhealthy (used by cron). default.

APP_DIR=/app
NODE=/usr/local/bin/node
SCRIPT=/app/server.js
LOG=/var/log/epaper.log
WLOG=/var/log/epaper-watchdog.log
HEALTH_URL=http://localhost:3000/healthz
PIDPAT="node /app/server.js"
PAUSE=/var/run/epaper.paused

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$WLOG" 2>/dev/null; }

is_healthy() {
	# 0 = healthy (HTTP 200 within 5s), non-zero otherwise.
	fetch -q -T 5 -o /dev/null "$HEALTH_URL" 2>/dev/null
}

clean_firefox() {
	pkill -f firefox 2>/dev/null
	rm -f "$APP_DIR/firefox-profile/.parentlock" 2>/dev/null
	return 0
}

start_node() {
	clean_firefox
	cd "$APP_DIR" || return 1
	$NODE $SCRIPT >> "$LOG" 2>&1 &
	log "started node (pid $!)"
}

stop_node() {
	if pkill -f "$PIDPAT" 2>/dev/null; then log "stopped node"; fi
	sleep 1
	pkill -9 -f "$PIDPAT" 2>/dev/null
	clean_firefox
}

restart_node() {
	log "restarting node"
	pkill -f "$PIDPAT" 2>/dev/null
	sleep 2
	pkill -9 -f "$PIDPAT" 2>/dev/null
	start_node
}

case "${1:-check}" in
	start)
		rm -f "$PAUSE"
		if is_healthy; then log "start: already healthy"; else restart_node; fi
		;;
	stop)
		: > "$PAUSE"
		stop_node
		;;
	status)
		if is_healthy; then echo "epaper: healthy"; exit 0; else echo "epaper: DOWN"; exit 1; fi
		;;
	check|*)
		# Skip if an operator has paused the service via `stop`.
		[ -f "$PAUSE" ] && exit 0
		if is_healthy; then
			exit 0
		fi
		# Confirm once more after a short pause to ride out a transient blip.
		sleep 5
		if is_healthy; then exit 0; fi
		log "check: unhealthy -> restarting"
		restart_node
		;;
esac
