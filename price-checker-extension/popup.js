const SITES = [
  {
    name: "Google Shopping",
    url: (q) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`,
  },
  {
    name: "eBay",
    url: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`,
  },
  {
    name: "Walmart",
    url: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Target",
    url: (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  },
  {
    name: "Best Buy",
    url: (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
  },
];

const statusEl = document.getElementById("status");
const productEl = document.getElementById("product");
const titleEl = document.getElementById("product-title");
const priceEl = document.getElementById("product-price");
const sitesEl = document.getElementById("sites");
const findBtn = document.getElementById("find-cheaper");

let productInfo = null;

function renderSiteLinks(query) {
  sitesEl.innerHTML = "";
  for (const site of SITES) {
    const link = document.createElement("div");
    link.className = "site-link";
    link.textContent = `Search on ${site.name}`;
    link.addEventListener("click", () => {
      chrome.tabs.create({ url: site.url(query), active: false });
    });
    sitesEl.appendChild(link);
  }
}

function openAll(query) {
  for (const site of SITES) {
    chrome.tabs.create({ url: site.url(query), active: false });
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    statusEl.textContent = "Couldn't access the current tab.";
    return;
  }

  let result;
  try {
    // Step 1: inject extract.js so extractProductInfo() is defined in the page.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["extract.js"],
    });
    // Step 2: call it and grab the return value.
    [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => extractProductInfo(),
    });
  } catch (e) {
    statusEl.textContent = "This page can't be scanned (e.g. a Chrome system page).";
    return;
  }

  productInfo = result;

  if (!productInfo || !productInfo.title) {
    statusEl.textContent = "Couldn't find a product on this page. Try a product detail page.";
    return;
  }

  statusEl.classList.add("hidden");
  productEl.classList.remove("hidden");
  sitesEl.classList.remove("hidden");
  findBtn.classList.remove("hidden");

  titleEl.textContent = productInfo.title;
  priceEl.textContent =
    productInfo.price != null ? `Current price: $${productInfo.price.toFixed(2)}` : "Price not detected on this page";

  renderSiteLinks(productInfo.title);

  findBtn.addEventListener("click", () => openAll(productInfo.title));
}

init();
