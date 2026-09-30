# Smart Mirror

A Raspberry Pi smart mirror: a black full-screen dashboard that shows through
a two-way mirror. Built with a tiny Python server (standard library only) and
a plain HTML/CSS/JS front end running in Chromium kiosk mode.

## What it shows

- **Clock & date** — 12h or 24h, with seconds
- **Weather** — current conditions, feels-like, humidity, wind, sunrise/sunset,
  and a 5-day forecast from [Open-Meteo](https://open-meteo.com) (free, no API key)
- **Greeting** — rotating messages based on the time of day, sometimes using your name
- **News** — rotating headlines from any RSS/Atom feeds
- **Calendar** — upcoming events from one or more `.ics` links (e.g. Google Calendar)
- **Motion sensor (optional)** — turns the screen off when no one is around

## Hardware

- Raspberry Pi 3B+, 4, or 5 with Raspberry Pi OS (Desktop)
- A monitor (remove the bezel/stand for a slimmer build)
- Two-way mirror glass or acrylic cut to the monitor size
- A frame / shadow box to hold it all
- Optional: HC-SR501 PIR motion sensor + 3 jumper wires

## Project layout

```
smart-mirror/
├── server.py            # serves the UI + /api/config, /api/news, /api/calendar
├── motion_sensor.py     # optional PIR screen on/off
├── config.example.json  # copy to config.json and edit
├── web/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── scripts/
    ├── install.sh       # one-time Pi setup (service + autostart)
    └── kiosk.sh         # launches Chromium full-screen
```

## Try it on your computer

```
python server.py
```

Then open http://localhost:8080. (No `config.json` yet? It falls back to
`config.example.json`.)

## Install on the Raspberry Pi

```
git clone https://github.com/BryanxFreecss/Side_Projects.git
cd Side_Projects/smart-mirror
bash scripts/install.sh
nano config.json
sudo reboot
```

`install.sh` will:
1. Install Chromium, emoji fonts, and `unclutter` (hides the mouse)
2. Create `config.json` from the example
3. Register `smart-mirror.service` so the server starts on boot
4. Add a desktop autostart entry that runs `scripts/kiosk.sh`
5. Disable screen blanking

Make sure the Pi is set to **boot to desktop with auto-login**
(`sudo raspi-config` → System Options → Boot / Auto Login).

## Configuration (`config.json`)

| Key | Description |
| --- | --- |
| `name` | Used in greetings |
| `location.latitude` / `longitude` | For weather — look yours up on Google Maps (right-click → coordinates) |
| `location.label` | City name shown next to the weather |
| `units` | `"imperial"` (°F, mph) or `"metric"` (°C, km/h) |
| `clock24h` | `true` for 24-hour time |
| `news.feeds` | List of RSS/Atom feed URLs |
| `news.rotateSeconds` | How long each headline stays up |
| `calendar.icsUrls` | List of `.ics` links. Google Calendar: Settings → your calendar → *Secret address in iCal format*. Leave empty to hide the calendar. |
| `calendar.daysAhead` / `maxEvents` | How far ahead / how many events to show |
| `compliments` | Messages for `morning`, `afternoon`, `evening`, `night` |
| `motionSensor.enabled` | `true` to use a PIR sensor |
| `motionSensor.gpioPin` | BCM GPIO number the sensor's OUT pin is on (default 4 = physical pin 7) |
| `motionSensor.screenOffAfterSeconds` | Idle time before the screen turns off |

The page reloads itself every 6 hours, so config changes show up on their own —
or run `sudo systemctl restart smart-mirror` and press `F5` for instant updates.

### Motion sensor wiring (HC-SR501)

| Sensor | Pi pin |
| --- | --- |
| VCC | 5V (pin 2) |
| GND | GND (pin 6) |
| OUT | GPIO4 (pin 7) |

## Useful commands

```
sudo systemctl status smart-mirror     # is the server running?
journalctl -u smart-mirror -f          # server logs
pkill chromium; scripts/kiosk.sh &     # restart the display
```

## Notes / limitations

- Recurring calendar events (RRULE) aren't expanded — only each event's first
  occurrence is shown.
- Keep your Google Calendar secret iCal link private: `config.json` is in
  `.gitignore` so it won't get committed.
