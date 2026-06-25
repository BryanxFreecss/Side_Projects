# Price Checker

A Chrome extension that reads the product you're currently viewing (optimized
for Amazon, with a generic fallback for other shops) and opens search results
on other shopping sites so you can compare prices.

It does not scrape prices from other sites directly — most retailers render
prices with JavaScript and block automated scraping, so results would be
unreliable. Instead it builds search-result links pre-filled with the
product name, so you get real, live results from each site.

## What it does

1. Click the extension icon while viewing a product page.
2. It extracts the product title (and price, if detectable) from the page.
3. Click "Find cheaper elsewhere" to open Google Shopping, eBay, Walmart,
   Target, and Best Buy search results for that product in new tabs — or
   click an individual site to open just that one.

## Install (unpacked, for development)

1. Open `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select this `price-checker-extension` folder.
4. Visit a product page (e.g. an Amazon listing) and click the extension icon.

## How extraction works

- **Amazon**: reads `#productTitle` and known price selectors directly.
- **Other sites**: falls back to JSON-LD `Product` schema, then Open Graph
  meta tags (`og:title`, `product:price:amount`), then the page `<title>`.

## Limitations

- Price detection on non-Amazon pages depends on the site providing
  structured data (JSON-LD/Open Graph); not all do.
- This only opens search results — it doesn't guarantee an exact product
  match on the other sites, since retailers don't expose a universal
  product ID to search by.
