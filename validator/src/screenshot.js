const { chromium } = require("playwright");
const http = require("http");

async function screenshot(html, viewport = { width: 390, height: 844 }) {
  const server = await startServer(html);
  const port = server.address().port;
  const localUrl = `http://localhost:${port}`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    await page.goto(localUrl, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const buffer = await page.screenshot({ type: "png" });
    return { screenshot: buffer.toString("base64") };
  } finally {
    if (browser) await browser.close();
    server.close();
  }
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

module.exports = { screenshot };
