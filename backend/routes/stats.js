/**
 * GET /stats
 * Returns full user stats for the dashboard
 */

const express = require("express");
const router = express.Router();
const store = require("../data/store");
const { calculateSessionRisk } = require("../services/riskEngine");
const {
  getDailyStats,
  getHourlyPattern,
  getAIBreakdown,
  getBehaviorScore,
  getRiskTimeline
} = require("../services/analyticsEngine");

// GET /stats — full stats object
router.get("/", (req, res) => {
  try {
    const userId = req.query.userId || "default";
    const user = store.getUser(userId);
    const sessionRisk = calculateSessionRisk(user);

    res.json({
      // Core counts
      copyCount: user.copyCount,
      totalTime: user.totalTime,
      totalTimeMinutes: Math.floor(user.totalTime / 60),
      streak: user.streak,
      longestStreak: user.longestStreak,
      points: user.points,

      // Risk
      currentRisk: sessionRisk,

      // Behavior score
      behaviorScore: getBehaviorScore(user),

      // Breakdowns
      aiUsage: user.aiUsage,
      contentCategories: user.contentCategories,
      aiBreakdown: getAIBreakdown(user),
      dailyStats: getDailyStats(user, 7),
      hourlyPattern: getHourlyPattern(user),
      riskTimeline: getRiskTimeline(user, 10),

      // Events
      recentEvents: store.getRecentEvents(userId, 10),
      totalEvents: user.copyEvents?.length || 0,

      // Achievements
      achievements: user.achievements,

      // Settings
      settings: user.settings,

      // Meta
      lastSeen: user.lastSeen,
      createdAt: user.createdAt
    });

  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /stats/summary — lightweight for popup
router.get("/summary", (req, res) => {
  try {
    const userId = req.query.userId || "default";
    const user = store.getUser(userId);
    const sessionRisk = calculateSessionRisk(user);

    res.json({
      copyCount: user.copyCount,
      totalTimeMinutes: Math.floor(user.totalTime / 60),
      streak: user.streak,
      currentRisk: sessionRisk,
      settings: user.settings
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// GET /stats/events — paginated event log
router.get("/events", (req, res) => {
  try {
    const userId = req.query.userId || "default";
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const user = store.getUser(userId);

    const events = (user.copyEvents || [])
      .slice()
      .reverse()
      .slice(offset, offset + limit);

    res.json({
      events,
      total: user.copyEvents?.length || 0,
      hasMore: (offset + limit) < (user.copyEvents?.length || 0)
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

module.exports = router;