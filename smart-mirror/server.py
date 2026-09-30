#!/usr/bin/env python3
"""Smart mirror backend.

Serves the web UI and a few small JSON endpoints. Uses only the Python
standard library so it runs on a fresh Raspberry Pi OS install.

    python3 server.py            # http://localhost:8080
    python3 server.py --port 9000
"""

import argparse
import json
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "web"
CACHE_SECONDS = 10 * 60
USER_AGENT = "SmartMirror/1.0 (+https://github.com/BryanxFreecss/Side_Projects)"
ATOM = "{http://www.w3.org/2005/Atom}"

_cache = {}


def load_config():
    path = ROOT / "config.json"
    if not path.exists():
        path = ROOT / "config.example.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def fetch(url, timeout=10):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def cached(key, producer):
    """Return a cached value, refreshing it every CACHE_SECONDS."""
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return hit[1]
    value = producer()
    _cache[key] = (time.time(), value)
    return value


# ---------------------------------------------------------------- news

def get_news(cfg):
    news_cfg = cfg.get("news", {})
    max_items = news_cfg.get("maxItems", 12)
    by_source = {}
    for url in news_cfg.get("feeds", []):
        try:
            tree = ET.fromstring(fetch(url))
        except Exception as e:
            print(f"[news] {url}: {e}")
            continue
        source = (tree.findtext("channel/title")
                  or tree.findtext(f"{ATOM}title") or url).strip()
        # RSS <item> or Atom <entry>
        entries = tree.findall(".//item") or tree.findall(f".//{ATOM}entry")
        for entry in entries[:max_items]:
            title = entry.findtext("title") or entry.findtext(f"{ATOM}title")
            if title:
                by_source.setdefault(source, []).append(
                    {"title": title.strip(), "source": source})

    # Interleave feeds so one source doesn't dominate.
    mixed = []
    while any(by_source.values()):
        for lst in by_source.values():
            if lst:
                mixed.append(lst.pop(0))
    return mixed[:max_items]


# ------------------------------------------------------------ calendar

def _unfold_ics(text):
    # RFC 5545: lines starting with a space/tab continue the previous line.
    return re.sub(r"\r?\n[ \t]", "", text).splitlines()


def _parse_ics_date(value, params):
    """Return (datetime, all_day). Naive datetimes are treated as local time."""
    value = value.strip()
    if "VALUE=DATE" in params or re.fullmatch(r"\d{8}", value):
        return datetime.strptime(value[:8], "%Y%m%d"), True
    if value.endswith("Z"):
        dt = datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        return dt.astimezone().replace(tzinfo=None), False
    return datetime.strptime(value[:15], "%Y%m%dT%H%M%S"), False


def get_calendar(cfg):
    cal_cfg = cfg.get("calendar", {})
    now = datetime.now()
    today = datetime.combine(date.today(), datetime.min.time())
    horizon = now + timedelta(days=cal_cfg.get("daysAhead", 7))
    events = []
    for url in cal_cfg.get("icsUrls", []):
        try:
            lines = _unfold_ics(fetch(url).decode("utf-8", errors="replace"))
        except Exception as e:
            print(f"[calendar] {url}: {e}")
            continue
        event = None
        for line in lines:
            if line == "BEGIN:VEVENT":
                event = {}
            elif line == "END:VEVENT" and event is not None:
                if "start" in event:
                    events.append(event)
                event = None
            elif event is not None and ":" in line:
                key, value = line.split(":", 1)
                name, _, params = key.partition(";")
                if name == "SUMMARY":
                    event["title"] = value.replace("\\,", ",").replace("\\;", ";")
                elif name == "DTSTART":
                    try:
                        event["start"], event["allDay"] = _parse_ics_date(value, params)
                    except ValueError:
                        pass

    upcoming = [
        e for e in events
        if (e["start"] >= now or (e["allDay"] and e["start"] >= today))
        and e["start"] <= horizon
    ]
    upcoming.sort(key=lambda e: e["start"])
    return [
        {
            "title": e.get("title", "(no title)"),
            "start": e["start"].isoformat(),
            "allDay": e["allDay"],
        }
        for e in upcoming[: cal_cfg.get("maxEvents", 6)]
    ]


# -------------------------------------------------------------- server

class MirrorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        routes = {
            "/api/config": load_config,
            "/api/news": lambda: cached("news", lambda: get_news(load_config())),
            "/api/calendar": lambda: cached("calendar", lambda: get_calendar(load_config())),
        }
        route = routes.get(self.path.split("?", 1)[0])
        if route is None:
            return super().do_GET()
        try:
            self._send_json(route())
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass  # keep the system journal quiet


def main():
    parser = argparse.ArgumentParser(description="Smart mirror server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), MirrorHandler)
    print(f"Smart mirror running at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
