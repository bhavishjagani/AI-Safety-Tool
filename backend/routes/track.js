/**
 * POST /track
 * Records copy events and time tracking from the extension content script
 */

const express = require("express");
const router = express.Router();
const store = require("../data/store");
const { analyzeText, calculateSessionRisk, checkAchievements } = require("../services/riskEngine");

// POST /track/copy
router.post("/copy", (req, res) => {
  try {
    const { userId = "default", text, ai, site } = req.body;

    if (!text || text.length < 3) {
      return res.status(400).json({ error: "Text too short to track" });
    }

    const analysis = analyzeText(text);

    // Store the copy event
    const copyEvent = store.addCopyEvent(userId, {
      text: text.substring(0, 1000), // cap at 1000 chars
      ai: ai || "Unknown",
      site: site || "unknown",
      flags: analysis.flags,
      riskScore: analysis.riskScore,
      category: analysis.category,
      wordCount: analysis.wordCount,
      charCount: analysis.charCount,
      tips: analysis.tips
    });

    // Recalculate session risk
    const user = store.getUser(userId);
    const sessionRisk = calculateSessionRisk(user);
    store.addRiskEntry(userId, sessionRisk);

    // Check for new achievements
    const newAchievements = checkAchievements(user, store);

    res.json({
      success: true,
      event: copyEvent,
      analysis,
      sessionRisk,
      newAchievements,
      totalCopies: user.copyCount
    });

  } catch (err) {
    console.error("Track copy error:", err);
    res.status(500).json({ error: "Failed to track copy event" });
  }
});

// POST /track/time
router.post("/time", (req, res) => {
  try {
    const { userId = "default", seconds, site } = req.body;

    if (!seconds || seconds < 0 || seconds > 3600) {
      return res.status(400).json({ error: "Invalid time value" });
    }

    store.addTime(userId, seconds, site);

    res.json({ success: true, totalTime: store.getUser(userId).totalTime });

  } catch (err) {
    console.error("Track time error:", err);
    res.status(500).json({ error: "Failed to track time" });
  }
});

// POST /track/session/start
router.post("/session/start", (req, res) => {
  try {
    const { userId = "default", site, ai } = req.body;
    const user = store.getUser(userId);

    user.currentSession = {
      id: Date.now().toString(),
      start: Date.now(),
      site: site || "unknown",
      ai: ai || "Unknown",
      events: []
    };

    res.json({ success: true, sessionId: user.currentSession.id });

  } catch (err) {
    res.status(500).json({ error: "Failed to start session" });
  }
});

// POST /track/session/end
router.post("/session/end", (req, res) => {
  try {
    const { userId = "default" } = req.body;
    const user = store.getUser(userId);

    if (user.currentSession) {
      user.currentSession.end = Date.now();
      user.currentSession.duration = user.currentSession.end - user.currentSession.start;
      user.sessions = user.sessions || [];
      user.sessions.push(user.currentSession);
      if (user.sessions.length > 50) user.sessions = user.sessions.slice(-50);
      user.currentSession = null;
    }

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Failed to end session" });
  }
});

// POST /track/settings
router.post("/settings", (req, res) => {
  try {
    const { userId = "default", settings } = req.body;
    const user = store.getUser(userId);

    user.settings = { ...user.settings, ...settings };

    res.json({ success: true, settings: user.settings });

  } catch (err) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

module.exports = router;