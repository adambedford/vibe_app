const express = require("express");
const { validate } = require("./validate");
const { screenshot } = require("./screenshot");

const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/validate", async (req, res) => {
  const { html } = req.body;
  if (!html) {
    return res.status(400).json({ error: "html is required" });
  }

  try {
    const result = await validate(html);
    res.json(result);
  } catch (err) {
    console.error("Validation error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/screenshot", async (req, res) => {
  const { html, viewport } = req.body;
  if (!html) {
    return res.status(400).json({ error: "html is required" });
  }

  try {
    const result = await screenshot(html, viewport);
    res.json(result);
  } catch (err) {
    console.error("Screenshot error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Validator sidecar listening on port ${PORT}`);
});

module.exports = app;
