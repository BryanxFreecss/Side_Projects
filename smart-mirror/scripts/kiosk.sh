#!/usr/bin/env bash
# Launches the mirror full-screen. Started automatically at desktop login
# (see install.sh), but you can also run it by hand.
set -u

DIR="$(cd "$(dirname "$0")/.." && pwd)"
URL="http://localhost:8080"

# Wait for the server (started by systemd) to come up.
for _ in $(seq 1 30); do
  curl -s -o /dev/null "$URL" && break
  sleep 1
done

# Keep the screen from blanking (X11; harmless under Wayland).
if command -v xset >/dev/null && [ -n "${DISPLAY:-}" ]; then
  xset s off; xset -dpms; xset s noblank
fi

# Hide the mouse cursor if unclutter is installed (X11).
command -v unclutter >/dev/null && unclutter -idle 0.5 -root &

# Optional PIR motion sensor. Runs inside the desktop session so it can
# talk to the display server; exits immediately if disabled in config.
python3 "$DIR/motion_sensor.py" &

BROWSER="$(command -v chromium-browser || command -v chromium)"
if [ -z "$BROWSER" ]; then
  echo "Chromium not found. Install it with: sudo apt install chromium-browser" >&2
  exit 1
fi

# Chromium shows a "restore pages?" bar after an unclean shutdown; clear it.
PREFS="$HOME/.config/chromium/Default/Preferences"
if [ -f "$PREFS" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "$PREFS"
fi

exec "$BROWSER" \
  --kiosk "$URL" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --no-first-run \
  --check-for-update-interval=31536000 \
  --overscroll-history-navigation=0
