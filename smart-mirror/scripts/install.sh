#!/usr/bin/env bash
# One-time setup on the Raspberry Pi. Run from the smart-mirror folder:
#   bash scripts/install.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
USER_NAME="$(whoami)"

echo "==> Installing packages"
sudo apt-get update
sudo apt-get install -y python3 curl unclutter fonts-noto-color-emoji
# Package name differs between Raspberry Pi OS releases.
sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium

echo "==> Creating config.json (if missing)"
if [ ! -f "$DIR/config.json" ]; then
  cp "$DIR/config.example.json" "$DIR/config.json"
  echo "    Edit $DIR/config.json to set your name, location and feeds."
fi

chmod +x "$DIR/scripts/kiosk.sh" "$DIR/server.py" "$DIR/motion_sensor.py"

echo "==> Installing systemd service for the server"
sudo tee /etc/systemd/system/smart-mirror.service >/dev/null <<EOF
[Unit]
Description=Smart Mirror server
After=network-online.target
Wants=network-online.target

[Service]
User=$USER_NAME
WorkingDirectory=$DIR
ExecStart=/usr/bin/python3 $DIR/server.py --port 8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now smart-mirror.service

echo "==> Launching the mirror at desktop login"
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/smart-mirror.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Smart Mirror
Exec=$DIR/scripts/kiosk.sh
X-GNOME-Autostart-enabled=true
EOF

echo "==> Disabling screen blanking"
if command -v raspi-config >/dev/null; then
  sudo raspi-config nonint do_blanking 1 || true
fi

cat <<EOF

Done! Next steps:
  1. Edit $DIR/config.json
  2. (Optional) rotate the screen for portrait mode:
       Preferences > Screen Configuration > right-click display > Orientation
  3. Make sure the Pi boots to the desktop with auto-login:
       sudo raspi-config  ->  System Options > Boot / Auto Login > Desktop Autologin
  4. Reboot:  sudo reboot
EOF
