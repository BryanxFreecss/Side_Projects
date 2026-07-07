# Weather Now

A single-file, no-build web app that shows live weather for your current
location, with search for any other city.

## What it does

1. On load, requests your browser location. If that's denied or unavailable,
   it falls back to an IP-based location lookup automatically.
2. Fetches current conditions, a 24-hour forecast, and a 7-day forecast from
   [Open-Meteo](https://open-meteo.com) (free, no API key required).
3. Auto-refreshes every 10 minutes and shows a live "updated Xs ago" label.
4. Search box with live autocomplete to look up weather anywhere by city name.
5. °C/°F toggle, and a background that shifts with the weather condition and
   local day/night.

## Run it

This is a static page — any local web server works:

```
python -m http.server 8420
```

then open `http://localhost:8420`. It also mostly works opened directly as a
file, but geolocation and fetch behave more reliably served over `http://`.

## Data sources

- **Weather**: [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- **City search**: [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- **Reverse geocoding** (coordinates → place name): [BigDataCloud client-side reverse geocode](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api)
- **IP-based location fallback**: [ipapi.co](https://ipapi.co)

All of these are free and require no API key.
