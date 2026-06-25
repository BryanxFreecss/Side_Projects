// Injected into the active tab via chrome.scripting.executeScript.
// Returns { title, price, currency, source } or null if nothing usable was found.
function extractProductInfo() {
  function cleanText(s) {
    return s ? s.replace(/\s+/g, " ").trim() : "";
  }

  function parsePrice(s) {
    if (!s) return null;
    const match = s.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
    return match ? parseFloat(match[1]) : null;
  }

  function fromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        let data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const candidates = item["@graph"] ? item["@graph"] : [item];
          for (const node of candidates) {
            if (node && (node["@type"] === "Product" || (Array.isArray(node["@type"]) && node["@type"].includes("Product")))) {
              const name = node.name;
              const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
              const price = offer && (offer.price || offer.lowPrice);
              const currency = offer && offer.priceCurrency;
              if (name) {
                return { title: cleanText(name), price: price ? parseFloat(price) : null, currency: currency || "USD" };
              }
            }
          }
        }
      } catch (e) {
        // ignore malformed JSON-LD blocks
      }
    }
    return null;
  }

  function fromAmazon() {
    const host = location.hostname;
    if (!host.includes("amazon.")) return null;

    const title = cleanText(
      document.querySelector("#productTitle")?.textContent
    );

    const priceSelectors = [
      "#corePrice_feature_div .a-price .a-offscreen",
      "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
      ".a-price .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
    ];
    let priceText = null;
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        priceText = el.textContent.trim();
        break;
      }
    }

    if (!title) return null;
    return { title, price: parsePrice(priceText), currency: "USD" };
  }

  function fromGenericMeta() {
    const ogTitle =
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[name="title"]')?.content;
    const title = cleanText(ogTitle) || cleanText(document.title);

    const ogPrice =
      document.querySelector('meta[property="product:price:amount"]')?.content ||
      document.querySelector('meta[property="og:price:amount"]')?.content;

    if (!title) return null;
    return { title, price: parsePrice(ogPrice), currency: "USD" };
  }

  const result = fromAmazon() || fromJsonLd() || fromGenericMeta();
  if (!result || !result.title) return null;

  // Strip common noise from titles (site suffixes, excessive length) to get a cleaner search query.
  let title = result.title.split(/[\|–—-]\s*Amazon/i)[0].trim();
  if (title.length > 150) title = title.slice(0, 150);

  return {
    title,
    price: result.price ?? null,
    currency: result.currency || "USD",
    source: location.hostname,
  };
}
