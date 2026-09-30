#!/usr/bin/env python3
"""Optional: turn the display off when nobody is around.

Wire a PIR motion sensor (e.g. HC-SR501) to the Pi:
    VCC -> 5V (pin 2), GND -> GND (pin 6), OUT -> GPIO4 (pin 7)

Enable it in config.json under "motionSensor". Requires gpiozero, which is
preinstalled on Raspberry Pi OS (otherwise: sudo apt install python3-gpiozero).
"""

import json
import shutil
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_config():
    path = ROOT / "config.json"
    if not path.exists():
        path = ROOT / "config.example.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def wayland_outputs():
    """Names of connected outputs according to wlr-randr (Bookworm+/Wayland)."""
    out = subprocess.run(["wlr-randr"], capture_output=True, text=True).stdout
    return [line.split()[0] for line in out.splitlines()
            if line and not line.startswith(" ")]


def set_display(on):
    # Raspberry Pi OS Bookworm and newer run Wayland (wlr-randr);
    # older X11 releases use vcgencmd.
    if shutil.which("wlr-randr"):
        for output in wayland_outputs():
            subprocess.run(["wlr-randr", "--output", output, "--on" if on else "--off"])
    elif shutil.which("vcgencmd"):
        subprocess.run(["vcgencmd", "display_power", "1" if on else "0"])
    else:
        print("No display control tool found (wlr-randr / vcgencmd).")
    print(f"Display {'on' if on else 'off'}")


def main():
    cfg = load_config().get("motionSensor", {})
    if not cfg.get("enabled"):
        print("Motion sensor disabled in config; exiting.")
        return

    from gpiozero import MotionSensor  # imported here so the file loads off-Pi

    pir = MotionSensor(cfg.get("gpioPin", 4))
    timeout = cfg.get("screenOffAfterSeconds", 300)
    last_motion = time.monotonic()
    display_on = True

    print(f"Watching GPIO{cfg.get('gpioPin', 4)}; screen off after {timeout}s idle")
    while True:
        if pir.motion_detected:
            last_motion = time.monotonic()
            if not display_on:
                set_display(True)
                display_on = True
        elif display_on and time.monotonic() - last_motion > timeout:
            set_display(False)
            display_on = False
        time.sleep(0.5)


if __name__ == "__main__":
    main()
