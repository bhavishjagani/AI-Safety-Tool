/**
 * AI Safety Tool - Backend Server
 * Express API powering the Chrome Extension
 */

const express = require("express");
const cors = require("cors");

const trackRoute = require("./routes/track");
const statsRoute = require("./routes/stats");
const insightsRoute = require("./routes/insights");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/track", trackRoute);
app.use("/stats", statsRoute);
app.use("/insights", insightsRoute);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    version: "2.0.0"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛡️  AI Safety Tool Backend`);
  console.log(`✅  Running on http://localhost:${PORT}`);
  console.log(`📊  Stats:     GET  /stats`);
  console.log(`📋  Track:     POST /track/copy`);
  console.log(`⏱   Time:      POST /track/time`);
  console.log(`💡  Insights:  GET  /insights\n`);
});

module.exports = app; 