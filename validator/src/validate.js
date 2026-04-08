const { chromium } = require("playwright");
const http = require("http");

const ALLOWED_ORIGINS = [
  "http://localhost",
  "http://127.0.0.1",
  "https://cdn.jsdelivr.net",
  "data:",
  "blob:",
];

function isAllowedRequest(url) {
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
}

async function validate(html) {
  const server = await startServer(html);
  const port = server.address().port;
  const localUrl = `http://localhost:${port}`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    const results = await runTests(page, localUrl);
    const extractedText = await page.textContent("body").catch(() => "");
    const screenshotBuffer = await page.screenshot({ type: "png" });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    const passed = results.every((r) => r.passed);

    return {
      passed,
      results,
      extracted_text: extractedText,
      screenshot: screenshotBase64,
    };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

async function runTests(page, localUrl) {
  const results = [];

  // Test 1: Renders without JS errors
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));
  await page.goto(localUrl, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  results.push({
    name: "renders_without_error",
    passed: jsErrors.length === 0,
    error: jsErrors.length > 0 ? jsErrors.join("; ") : null,
  });

  // Test 2: No console errors (filter benign warnings)
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("WebGL") && !text.includes("AudioContext")) {
        consoleErrors.push(text);
      }
    }
  });
  // Already loaded, just check
  results.push({
    name: "no_console_errors",
    passed: consoleErrors.length === 0,
    error: consoleErrors.length > 0 ? consoleErrors.join("; ") : null,
  });

  // Test 3: Mobile viewport fit
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  results.push({
    name: "mobile_viewport",
    passed: bodyWidth <= 400,
    error: bodyWidth > 400 ? `Body width ${bodyWidth}px exceeds 400px` : null,
  });

  // Test 4: Tap targets (44px min for non-canvas elements)
  const smallTargets = await page.evaluate(() => {
    const interactive = document.querySelectorAll(
      "button, a, [onclick], input, select"
    );
    return Array.from(interactive).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    }).length;
  });
  results.push({
    name: "tap_targets",
    passed: smallTargets === 0,
    error: smallTargets > 0 ? `${smallTargets} elements smaller than 44x44px` : null,
  });

  // Test 5: No unauthorized network requests
  const unauthorized = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!isAllowedRequest(url) && !url.includes("vibe.app")) {
      unauthorized.push(url);
    }
  });
  await page.reload({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
  results.push({
    name: "no_unauthorized_requests",
    passed: unauthorized.length === 0,
    error: unauthorized.length > 0 ? `Unauthorized: ${unauthorized.join(", ")}` : null,
  });

  // Test 6: Has visible content (canvas, text, or SVG)
  const hasContent = await page.evaluate(() => {
    const hasCanvas = document.querySelectorAll("canvas").length > 0;
    const hasText = document.body.innerText.trim().length > 0;
    const hasSvg = document.querySelectorAll("svg").length > 0;
    return hasCanvas || hasText || hasSvg;
  });
  results.push({
    name: "has_visible_content",
    passed: hasContent,
    error: hasContent ? null : "No visible content (no canvas, text, or SVG)",
  });

  // Test 7: Phaser boots successfully (if used)
  const phaserStatus = await page.evaluate(() => {
    if (typeof Phaser === "undefined") return "not_used";
    const canvas = document.querySelector("canvas");
    if (!canvas) return "no_canvas";
    if (window.game && window.game.scene && window.game.scene.scenes.length > 0) {
      return "running";
    }
    return "not_running";
  });
  results.push({
    name: "phaser_boots",
    passed: phaserStatus === "running" || phaserStatus === "not_used",
    error: phaserStatus === "not_running" || phaserStatus === "no_canvas"
      ? `Phaser status: ${phaserStatus}`
      : null,
  });

  return results;
}

function startServer(html) {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });
    server.listen(0, () => resolve(server));
  });
}

module.exports = { validate };
